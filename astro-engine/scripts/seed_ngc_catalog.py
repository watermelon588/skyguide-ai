"""Seed the NGC and IC catalogs (~13,200 objects) into MongoDB.

Pipeline:  OpenNGC CSV  ->  normalize  ->  compose content  ->  bulk upsert

Run from the astro-engine directory:

    venv/Scripts/python.exe scripts/seed_ngc_catalog.py            # full run
    venv/Scripts/python.exe scripts/seed_ngc_catalog.py --dry-run  # print, no writes
    venv/Scripts/python.exe scripts/seed_ngc_catalog.py --limit 50 # a small slice

IDEMPOTENT: objects upsert on their unique ``catalog_id``, so re-running updates
rather than duplicates. Safe to run over a populated database.

Source
------
OpenNGC (https://github.com/mattiaverga/OpenNGC), CC-BY-SA-4.0 — the maintained
reference for NGC/IC, reconciled against NED and SIMBAD. Chosen over live SIMBAD
TAP because 13,000 objects is a bulk-data problem, not 13,000 queries: one 3.8 MB
CSV replaces hours of pagination, and it ships the cross-identifications and
common names that SIMBAD makes you self-join for. (The Messier seeder's TAP
approach remains right for 110 objects — see seed_messier_catalog.py, and the
astropy votable overflow bug documented there.)

What is EXCLUDED and why
------------------------
- ``Dup``  (651): duplicate entries that point at another object. Seeding them
  would put the same galaxy in the catalog twice under two ids.
- ``NonEx`` (10): cataloguing errors — objects that do not exist.
- Messier cross-references (107): already seeded, with SIMBAD data, under their
  M ids. Their NGC designations survive as ``aliases`` on those documents, so
  searching "NGC 224" still finds M31. Note 107, not 110: M24, M40 and M45 have
  no NGC entry.

Constellations are computed with astropy ``get_constellation`` rather than read
from the CSV's abbreviation column — the Messier documents were built that way,
and the catalog's constellation filter matches on the exact string.
"""

import argparse
import asyncio
import csv
import io
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

# Make the project importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402

from app.core.astro import configure_astropy  # noqa: E402
from app.core.database import (  # noqa: E402
    close_mongo_connection,
    connect_to_mongo,
    get_database,
)
from app.core.logging import configure_logging, get_logger  # noqa: E402
from app.services import catalog_service  # noqa: E402
from catalog_content import (  # noqa: E402
    compose_description,
    difficulty_for,
    observation_tips,
    sky_survey_media,
)

warnings.filterwarnings("ignore")
configure_logging()
logger = get_logger("ngc-seeder")

OPENNGC_URL = (
    "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv"
)
CACHE_PATH = Path(__file__).resolve().parents[1] / "data" / "openngc.csv"

#: Entries that are not real, distinct, observable objects.
EXCLUDED_TYPES = {"Dup", "NonEx"}

#: OpenNGC type code -> the catalog's existing amateur-friendly vocabulary.
#:
#: These strings are load-bearing: the frontend's `typeKey` (vocabulary.js) does
#: substring matching for "galaxy" / "nebula" / "globular" / "cluster" / "star"
#: to pick a glyph, checking "nebula" BEFORE "cluster". Anything unmatched falls
#: back to the generic "other" glyph, which is a graceful default, not a break.
TYPE_MAP = {
    "G": "Galaxy",
    "GPair": "Galaxy Pair",
    "GTrpl": "Galaxy Triplet",
    "GGroup": "Galaxy Group",
    "GCl": "Globular Cluster",
    "OCl": "Open Cluster",
    "Cl+N": "Cluster with Nebulosity",
    "PN": "Planetary Nebula",
    "HII": "Emission Nebula",
    "EmN": "Emission Nebula",
    "RfN": "Reflection Nebula",
    "Neb": "Nebula",
    "SNR": "Supernova Remnant",
    "*": "Star",
    "**": "Double Star",
    "*Ass": "Stellar Association",
    "Nova": "Nova",
    "Other": "Other",
}

#: Identifier prefixes worth keeping as searchable aliases. The full Identifiers
#: column runs to survey designations (2MASX, IRAS, SDSS J…) that no observer
#: searches for and that would bloat every document.
ALIAS_PREFIXES = ("M ", "NGC", "IC", "Mel", "Cr", "Tr", "Stock", "Barnard", "Sh2", "Ced")


# --------------------------------------------------------------------------- #
# Parsing
# --------------------------------------------------------------------------- #
def canonical_id(raw_name: str) -> str:
    """OpenNGC's zero-padded name -> the catalog's display form.

    ``NGC0224`` -> ``NGC 224``   ``IC0434`` -> ``IC 434``
    ``IC0186A`` -> ``IC 186A``   ``NGC0080 NED01`` -> ``NGC 80 NED01``

    The zero padding exists so the CSV sorts lexically; it is not how anyone
    writes or searches for these objects.
    """
    name = raw_name.strip()
    prefix = "NGC" if name.startswith("NGC") else "IC" if name.startswith("IC") else None
    if not prefix:
        return name

    rest = name[len(prefix):].strip()
    # Split the digits from any component suffix ("186A", "80 NED01").
    digits = ""
    for char in rest:
        if char.isdigit():
            digits += char
        else:
            break
    if not digits:
        return name

    suffix = rest[len(digits):].strip()
    number = int(digits)
    return f"{prefix} {number}{(' ' + suffix) if suffix and suffix[0].isalpha() and len(suffix) > 1 else suffix}".strip()


def parse_float(value: str) -> float | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


#: Plausible B-V colour index. Real objects run from ~-0.35 (hot O stars) to
#: ~+2.0 (cool M stars); emission/reddened objects can reach ~+2.5. Outside this
#: band the B/V pair is internally inconsistent — one value is a catalog error.
_BV_MIN, _BV_MAX = -0.4, 2.5


def select_magnitude(b_mag: float | None, v_mag: float | None) -> float | None:
    """Choose the trustworthy magnitude from OpenNGC's B and V columns.

    V is the visual band — what the eye sees, and the convention the Messier
    documents already use — so it is preferred WHEN the pair is self-consistent.

    But OpenNGC's V column is sparse (30% coverage) and carries ~135 physically
    impossible values: e.g. NGC 253 (the naked-eye Sculptor Galaxy) is listed at
    V=11.11 against B=7.94 — a B-V of -3.2, bluer than the hottest star. Its real
    magnitude is ~7.1, so B (7.94) is right and V is corrupt. The B column is
    OpenNGC's curated primary (81% coverage) and does not carry these errors.

    So: trust V only when B-V lands in a physical range; otherwise the pair is
    broken and B is the reliable value. (Verified: SIMBAD is NOT a better arbiter
    — its integrated photometry for extended galaxies is just as inconsistent,
    e.g. it lists NGC 4945 at V=14.4 against a true ~8.4.) When only one band is
    present, use it.
    """
    if b_mag is not None and v_mag is not None:
        colour = b_mag - v_mag
        return v_mag if _BV_MIN <= colour <= _BV_MAX else b_mag
    return v_mag if v_mag is not None else b_mag


def first_common_name(value: str) -> str | None:
    """OpenNGC packs multiple names in one cell: 'Flame Nebula,Orion B'."""
    text = (value or "").strip()
    if not text:
        return None
    return text.split(",")[0].strip() or None


def build_aliases(row: dict, catalog_id: str) -> list[str]:
    """Searchable cross-identifications, minus the survey noise."""
    aliases: set[str] = set()

    # The M/NGC/IC columns are the reliable cross-references.
    if row["M"].strip():
        aliases.add(f"M {int(row['M'])}")
    for column, prefix in (("NGC", "NGC"), ("IC", "IC")):
        raw = row[column].strip()
        if raw:
            digits = "".join(c for c in raw if c.isdigit())
            if digits:
                aliases.add(f"{prefix} {int(digits)}")

    for identifier in (row["Identifiers"] or "").split(","):
        ident = " ".join(identifier.split())
        if ident and ident.startswith(ALIAS_PREFIXES):
            aliases.add(ident)

    # Extra common names beyond the one promoted to `name`.
    names = [n.strip() for n in (row["Common names"] or "").split(",") if n.strip()]
    aliases.update(names[1:])

    aliases.discard(catalog_id)
    return sorted(aliases)


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #
def fetch_openngc(refresh: bool = False) -> list[dict]:
    """OpenNGC rows, cached on disk. The dataset changes a few times a year."""
    if CACHE_PATH.exists() and not refresh:
        logger.info("Using cached OpenNGC -> %s", CACHE_PATH)
        text = CACHE_PATH.read_text(encoding="utf-8")
    else:
        logger.info("Downloading OpenNGC -> %s", OPENNGC_URL)
        response = httpx.get(OPENNGC_URL, timeout=60.0, follow_redirects=True)
        response.raise_for_status()
        text = response.text
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(text, encoding="utf-8")
        logger.info("Cached %d bytes", len(text))

    return list(csv.DictReader(io.StringIO(text), delimiter=";"))


# --------------------------------------------------------------------------- #
# Normalize
# --------------------------------------------------------------------------- #
def select_rows(rows: list[dict]) -> tuple[list[dict], dict]:
    """Drop what must not be seeded. Returns (kept, why-we-dropped counts)."""
    kept, skipped = [], {"duplicate_entry": 0, "nonexistent": 0, "is_messier": 0, "no_coords": 0}

    for row in rows:
        object_type = row["Type"].strip()
        if object_type == "Dup":
            skipped["duplicate_entry"] += 1
        elif object_type == "NonEx":
            skipped["nonexistent"] += 1
        elif row["M"].strip():
            skipped["is_messier"] += 1
        elif not row["RA"].strip() or not row["Dec"].strip():
            skipped["no_coords"] += 1
        else:
            kept.append(row)

    return kept, skipped


def normalize(row: dict, constellation: str | None) -> dict:
    """One OpenNGC row -> one celestial_objects document."""
    catalog_id = canonical_id(row["Name"])
    catalog = "NGC" if catalog_id.startswith("NGC") else "IC"
    object_type = TYPE_MAP.get(row["Type"].strip(), "Other")

    # Prefer V (visual) when it is self-consistent with B, else fall back to the
    # reliable B column — see select_magnitude for the corrupt-V-mag story.
    magnitude = select_magnitude(parse_float(row["B-Mag"]), parse_float(row["V-Mag"]))

    size = parse_float(row["MajAx"])
    name = first_common_name(row["Common names"])
    display = name or catalog_id
    hubble = row["Hubble"].strip() or None

    difficulty, _ = difficulty_for(magnitude)

    return {
        "catalog": catalog,
        "catalog_id": catalog_id,
        "name": name,
        "aliases": build_aliases(row, catalog_id),
        "object_type": object_type,
        "constellation": constellation,
        "coordinates": {"ra_deg": row["_ra_deg"], "dec_deg": row["_dec_deg"]},
        "physical": {
            "distance_ly": None,  # OpenNGC carries redshift, not a distance
            "magnitude": round(magnitude, 2) if magnitude is not None else None,
            "angular_size_arcmin": round(size, 2) if size is not None else None,
        },
        "classification": {"difficulty": difficulty, "season": None},
        "content": {
            "short_description": compose_description(
                display_name=display,
                object_type=object_type,
                constellation=constellation,
                magnitude=magnitude,
                angular_size_arcmin=size,
                hubble=hubble,
            ),
            "ai_description": None,
            "observation_tips": observation_tips(
                object_type=object_type,
                magnitude=magnitude,
                angular_size_arcmin=size,
            ),
            "recommended_telescopes": [],
        },
        "media": sky_survey_media(row["_ra_deg"], row["_dec_deg"], size),
        "source": {"dataset": "OpenNGC", "licence": "CC-BY-SA-4.0", "hubble_class": hubble},
    }


def add_coordinates(rows: list[dict]) -> list[dict]:
    """Parse RA/Dec and attach constellations — both vectorised over all rows.

    astropy is fast in bulk and slow one row at a time; 13,000 individual
    SkyCoord constructions would dominate the whole seed.
    """
    import astropy.units as u
    from astropy.coordinates import SkyCoord, get_constellation

    logger.info("Parsing coordinates -> %d rows", len(rows))
    coords = SkyCoord(
        ra=[r["RA"] for r in rows],
        dec=[r["Dec"] for r in rows],
        unit=(u.hourangle, u.deg),
    )

    logger.info("Resolving constellations (astropy, vectorised)")
    constellations = get_constellation(coords)

    for row, ra, dec, const in zip(
        rows, coords.ra.deg, coords.dec.deg, constellations, strict=True
    ):
        row["_ra_deg"] = float(ra)
        row["_dec_deg"] = float(dec)
        row["_constellation"] = str(const)

    return rows


# --------------------------------------------------------------------------- #
# Upsert
# --------------------------------------------------------------------------- #
BATCH = 500


async def bulk_upsert(documents: list[dict]) -> tuple[int, int]:
    """Upsert in batches. Returns (inserted, updated).

    One update_one per object would be ~13,000 sequential round trips to Atlas;
    batched bulk_write turns that into ~27.
    """
    from pymongo import UpdateOne

    coll = get_database()[catalog_service.COLLECTION]
    now = datetime.now(timezone.utc)
    inserted = updated = 0

    for start in range(0, len(documents), BATCH):
        chunk = documents[start : start + BATCH]
        operations = [
            UpdateOne(
                {"catalog_id": doc["catalog_id"]},
                {
                    "$set": {**doc, "metadata.updated_at": now},
                    "$setOnInsert": {"metadata.created_at": now},
                },
                upsert=True,
            )
            for doc in chunk
        ]
        result = await coll.bulk_write(operations, ordered=False)
        inserted += len(result.upserted_ids or {})
        updated += result.modified_count
        logger.info(
            "Upserted %d/%d objects", min(start + BATCH, len(documents)), len(documents)
        )

    return inserted, updated


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed NGC/IC objects from OpenNGC.")
    parser.add_argument("--dry-run", action="store_true", help="normalize and report, write nothing")
    parser.add_argument("--limit", type=int, help="only process the first N objects")
    parser.add_argument("--refresh", action="store_true", help="re-download the CSV")
    args = parser.parse_args()

    configure_astropy()

    rows = fetch_openngc(refresh=args.refresh)
    logger.info("OpenNGC rows -> %d", len(rows))

    kept, skipped = select_rows(rows)
    logger.info(
        "Selected %d objects | skipped: %s",
        len(kept),
        ", ".join(f"{reason}={count}" for reason, count in skipped.items()),
    )

    if args.limit:
        kept = kept[: args.limit]
        logger.info("Limited to %d objects", len(kept))

    kept = add_coordinates(kept)
    documents = [normalize(row, row["_constellation"]) for row in kept]
    logger.info("Normalized -> %d documents", len(documents))

    if args.dry_run:
        import json

        for doc in documents[:3]:
            print(json.dumps(doc, indent=2, ensure_ascii=False))
        logger.info("Dry run — nothing written.")
        return 0

    if not await connect_to_mongo():
        logger.error("Could not connect to MongoDB. Aborting.")
        return 1

    await catalog_service.ensure_indexes()

    before = await catalog_service.count_objects()
    inserted, updated = await bulk_upsert(documents)
    total = await catalog_service.count_objects()

    coll = get_database()[catalog_service.COLLECTION]
    messier = await coll.count_documents({"catalog": "Messier"})

    logger.info(
        "Completed Successfully -> inserted=%d updated=%d | catalog %d -> %d "
        "(Messier still %d)",
        inserted, updated, before, total, messier,
    )

    await close_mongo_connection()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
