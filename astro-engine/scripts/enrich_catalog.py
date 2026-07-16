"""Enrich catalog objects with real photos and encyclopedic descriptions.

Run from the astro-engine directory:

    venv/Scripts/python.exe scripts/enrich_catalog.py             # Messier + named
    venv/Scripts/python.exe scripts/enrich_catalog.py --messier   # Messier only
    venv/Scripts/python.exe scripts/enrich_catalog.py --limit 20  # a small slice

Two passes, both IDEMPOTENT and RESUMABLE (Wikipedia responses are cached on
disk, so a re-run costs almost no network):

1. **Backfill.** The Messier objects were seeded before the content pipeline
   existed, so they carry null descriptions and no imagery. This gives every one
   of them the same generated description + DSS survey cutout the NGC/IC objects
   already have — so no flagship object is ever blank, whatever Wikipedia has.

2. **Wikipedia.** For objects likely to have an article (all Messier, plus every
   NGC/IC object with a common name), fetch the REST summary and, when it is a
   real astronomical page, upgrade the description to the encyclopedic extract
   and the imagery to the article's photograph (a freely-licensed Wikimedia
   Commons image). Attribution (the page URL, CC BY-SA) is stored alongside.

Design: the whole catalog is NOT enriched — most of 13k objects have no article,
and 13k requests would be slow and rude. The unnamed tail keeps its honest DSS
cutout and generated description. Enrichment only ever IMPROVES a document; a
miss leaves the backfilled content in place.
"""

import argparse
import asyncio
import json
import sys
import time
import urllib.parse
import warnings
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402

from app.core.database import (  # noqa: E402
    close_mongo_connection,
    connect_to_mongo,
    get_database,
)
from app.core.logging import configure_logging, get_logger  # noqa: E402
from app.services import catalog_service  # noqa: E402
from catalog_content import (  # noqa: E402
    compose_description,
    observation_tips,
    sky_survey_media,
)

warnings.filterwarnings("ignore")
configure_logging()
logger = get_logger("enrich")

WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/"
USER_AGENT = "SkyGuideAI/1.0 (catalog enrichment; maityrohit021@gmail.com)"
CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "wiki_cache"

# Be polite to a free API — one request every this-many seconds (cache hits are
# free and unthrottled).
RATE_LIMIT_S = 0.4

# The extract must look astronomical, so a common name like "Sombrero" can't
# match a hat. One of these words (or the id) must appear in title+extract.
_ASTRO_WORDS = (
    "galaxy", "nebula", "cluster", "star", "supernova", "remnant",
    "constellation", "messier", "ngc", "ic ", "astronom", "celestial",
    "globular", "magnitude", "light-year", "light year",
)

MAX_DESCRIPTION = 600  # keep the panel readable; also the schema's body cap


# --------------------------------------------------------------------------- #
# Wikipedia (cached, rate-limited)
# --------------------------------------------------------------------------- #
_last_request_at = 0.0


def _cache_path(title: str) -> Path:
    safe = urllib.parse.quote(title, safe="")
    return CACHE_DIR / f"{safe}.json"


def fetch_summary(title: str, client: httpx.Client) -> dict | None:
    """REST summary for a title, disk-cached. None on a real miss (404).

    A cached negative (``{}``) is respected so known-missing titles are not
    re-requested every run.
    """
    global _last_request_at

    cache = _cache_path(title)
    if cache.exists():
        data = json.loads(cache.read_text(encoding="utf-8"))
        return data or None

    # Rate-limit only actual network calls.
    wait = RATE_LIMIT_S - (time.monotonic() - _last_request_at)
    if wait > 0:
        time.sleep(wait)

    url = WIKI_SUMMARY + urllib.parse.quote(title.replace(" ", "_"), safe="")
    try:
        response = client.get(url, headers={"User-Agent": USER_AGENT}, timeout=15.0)
        _last_request_at = time.monotonic()
    except httpx.HTTPError as exc:
        logger.warning("Wikipedia request failed for %r: %s", title, exc)
        return None

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if response.status_code == 404:
        cache.write_text("{}", encoding="utf-8")  # cache the miss
        return None
    if response.status_code != 200:
        logger.warning("Wikipedia HTTP %d for %r", response.status_code, title)
        return None

    data = response.json()
    cache.write_text(json.dumps(data), encoding="utf-8")
    return data


def _looks_astronomical(summary: dict, catalog_id: str) -> bool:
    haystack = f"{summary.get('title', '')} {summary.get('extract', '')}".lower()
    if catalog_id.lower() in haystack:
        return True
    return any(word in haystack for word in _ASTRO_WORDS)


def _commons_image(summary: dict, key: str) -> str | None:
    """A Wikimedia Commons image URL from the summary, or None.

    Restricted to upload.wikimedia.org so only freely-licensed Commons media is
    ever hot-linked — never an arbitrary third-party URL.
    """
    src = (summary.get(key) or {}).get("source")
    if src and "upload.wikimedia.org" in src:
        return src
    return None


def _trim(text: str) -> str:
    text = " ".join((text or "").split())
    if len(text) <= MAX_DESCRIPTION:
        return text
    # Cut at the last sentence boundary that fits.
    cut = text[: MAX_DESCRIPTION - 1]
    dot = cut.rfind(". ")
    return (cut[: dot + 1] if dot > 200 else cut).rstrip() + "…"


# --------------------------------------------------------------------------- #
# Candidate resolution
# --------------------------------------------------------------------------- #
def messier_number(catalog_id: str) -> int | None:
    if catalog_id.upper().startswith("M") and catalog_id[1:].strip().isdigit():
        return int(catalog_id[1:])
    return None


def candidate_titles(doc: dict) -> list[str]:
    """Wikipedia titles to try for a document, best guess first."""
    titles: list[str] = []
    cid = doc["catalog_id"]

    m = messier_number(cid)
    if m is not None:
        titles.append(f"Messier {m}")  # redirects to the common-name page
    if doc.get("name"):
        titles.append(doc["name"])
    # "NGC 253" / "IC 434" as a plain designation.
    titles.append(cid)
    # De-dupe, preserve order.
    seen = set()
    return [t for t in titles if not (t in seen or seen.add(t))]


# --------------------------------------------------------------------------- #
# Enrichment
# --------------------------------------------------------------------------- #
def backfill_content(doc: dict) -> dict:
    """Generated description + DSS media — the guaranteed, offline baseline.

    Only fills what is missing, so it never clobbers richer content on a re-run.
    """
    physical = doc.get("physical") or {}
    coords = doc.get("coordinates") or {}
    content = dict(doc.get("content") or {})
    media = dict(doc.get("media") or {})

    display = doc.get("name") or doc["catalog_id"]
    if not content.get("short_description"):
        content["short_description"] = compose_description(
            display_name=display,
            object_type=doc.get("object_type"),
            constellation=doc.get("constellation"),
            magnitude=physical.get("magnitude"),
            angular_size_arcmin=physical.get("angular_size_arcmin"),
            hubble=(doc.get("source") or {}).get("hubble_class"),
        )
    if not content.get("observation_tips"):
        content["observation_tips"] = observation_tips(
            object_type=doc.get("object_type"),
            magnitude=physical.get("magnitude"),
            angular_size_arcmin=physical.get("angular_size_arcmin"),
        )
    if not media.get("thumbnail"):
        survey = sky_survey_media(
            coords.get("ra_deg"), coords.get("dec_deg"),
            physical.get("angular_size_arcmin"),
        )
        if survey.get("thumbnail"):
            media = {**survey, "credit": "DSS2 colour (CDS/hips2fits)"}

    return {"content": content, "media": media}


def wikipedia_upgrade(doc: dict, client: httpx.Client) -> dict | None:
    """Real photo + encyclopedic prose from Wikipedia, or None on a miss."""
    for title in candidate_titles(doc):
        summary = fetch_summary(title, client)
        if not summary or summary.get("type") == "disambiguation":
            continue
        if not _looks_astronomical(summary, doc["catalog_id"]):
            continue

        extract = _trim(summary.get("extract", ""))
        if not extract:
            continue

        page_url = (summary.get("content_urls", {}).get("desktop", {}) or {}).get("page")
        update = {
            "content.short_description": extract,
            "content.attribution": page_url,
        }
        thumb = _commons_image(summary, "thumbnail")
        if thumb:
            update["media.thumbnail"] = thumb
            # Only the API's own two rendered URLs are reliable — Wikimedia
            # rejects arbitrary widths for many files (large PNGs, some JPGs), so
            # the hero uses the summary's `originalimage` (a rendered, CDN-cached
            # large size) rather than a manufactured width, falling back to the
            # thumbnail if there's no separate original.
            update["media.hero_image"] = _commons_image(summary, "originalimage") or thumb
            update["media.credit"] = "Wikimedia Commons"
        return update
    return None


async def main() -> int:
    parser = argparse.ArgumentParser(description="Enrich catalog with photos + descriptions.")
    parser.add_argument("--messier", action="store_true", help="Messier objects only")
    parser.add_argument("--limit", type=int, help="process at most N objects")
    parser.add_argument("--no-wiki", action="store_true", help="backfill only, skip Wikipedia")
    args = parser.parse_args()

    if not await connect_to_mongo():
        logger.error("Could not connect to MongoDB. Aborting.")
        return 1

    coll = get_database()[catalog_service.COLLECTION]

    # Candidates: all Messier (they need backfilling), plus every named NGC/IC
    # object (the ones likely to have an article).
    query = {"catalog": "Messier"} if args.messier else {
        "$or": [{"catalog": "Messier"}, {"name": {"$ne": None}}]
    }
    projection = {
        "catalog_id": 1, "name": 1, "object_type": 1, "constellation": 1,
        "coordinates": 1, "physical": 1, "content": 1, "media": 1, "source": 1,
    }
    docs = await coll.find(query, projection).to_list(length=None)
    if args.limit:
        docs = docs[: args.limit]
    logger.info("Enriching %d objects (wiki=%s)", len(docs), not args.no_wiki)

    stats = {"backfilled": 0, "wiki": 0, "wiki_miss": 0}
    now = datetime.now(timezone.utc)

    with httpx.Client(follow_redirects=True) as client:
        for i, doc in enumerate(docs, 1):
            update: dict = {}

            base = backfill_content(doc)
            update.update(base)
            stats["backfilled"] += 1

            if not args.no_wiki:
                upgrade = wikipedia_upgrade(doc, client)
                if upgrade:
                    # Merge the flattened wiki fields into the nested update.
                    for path, value in upgrade.items():
                        section, field = path.split(".")
                        update.setdefault(section, dict(update.get(section, {})))
                        update[section][field] = value
                    stats["wiki"] += 1
                else:
                    stats["wiki_miss"] += 1

            update["metadata.updated_at"] = now
            await coll.update_one({"catalog_id": doc["catalog_id"]}, {"$set": update})

            if i % 25 == 0 or i == len(docs):
                logger.info(
                    "  %d/%d  (wiki hits=%d, misses=%d)",
                    i, len(docs), stats["wiki"], stats["wiki_miss"],
                )

    logger.info(
        "Completed -> backfilled=%d, wikipedia=%d, wiki_miss=%d",
        stats["backfilled"], stats["wiki"], stats["wiki_miss"],
    )
    await close_mongo_connection()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
