"""Seed the Messier catalog (110 objects) into MongoDB.

Pipeline:  astroquery (SIMBAD TAP)  ->  normalize  ->  upsert into MongoDB

Run from the astro-engine directory:

    venv/Scripts/python.exe scripts/seed_messier_catalog.py

The script is IDEMPOTENT: objects are upserted on their unique ``catalog_id``,
so running it repeatedly updates existing documents instead of creating
duplicates. Only fields available today are populated; content/media/AI fields
are intentionally left null/empty for future sessions to enrich.

Data source note: VizieR did not return the Messier tables reliably in this
environment and SIMBAD's default object queries hit an astropy votable overflow
bug, so we use SIMBAD's TAP service with an explicit-column ADQL query (the one
path that works). Constellations are computed offline with astropy.
"""

import asyncio
import math
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

# Make the project importable when run as a plain script.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

from app.core.astro import configure_astropy  # noqa: E402
from app.core.database import (  # noqa: E402
    close_mongo_connection,
    connect_to_mongo,
    get_database,
)
from app.core.logging import configure_logging, get_logger  # noqa: E402
from app.services import catalog_service  # noqa: E402

warnings.filterwarnings("ignore")
configure_logging()
logger = get_logger("seeder")

CATALOG = "Messier"
MESSIER_COUNT = 110

# SIMBAD identifiers are stored right-justified, e.g. "M   1", "M 110".
MESSIER_IDS = [f"M{n:>4}" for n in range(1, MESSIER_COUNT + 1)]

# SIMBAD short otype code -> amateur-friendly object type.
OTYPE_MAP = {
    "G": "Galaxy", "GiC": "Galaxy", "GiG": "Galaxy", "GiP": "Galaxy",
    "H2G": "Galaxy", "SBG": "Galaxy", "AGN": "Galaxy", "Sy2": "Galaxy",
    "SyG": "Galaxy", "LIN": "Galaxy",
    "GlC": "Globular Cluster",
    "OpC": "Open Cluster",
    "As*": "Asterism",
    "PN": "Planetary Nebula",
    "HII": "Emission Nebula",
    "RNe": "Reflection Nebula",
    "SNR": "Supernova Remnant",
    # "?" (unknown) and "err" (SIMBAD's not-a-real-object flag, e.g. M40/M73)
    # are left to the generic fallback below.
}

# Words that make a SIMBAD "NAME" identifier read like a real common name.
NAME_DESCRIPTORS = (
    "nebula", "galaxy", "cluster", "sisters", "pleiades", "dumbbell", "ring",
    "sombrero", "whirlpool", "pinwheel", "owl", "eagle", "lagoon", "trifid",
    "sunflower", "cigar", "beehive", "butterfly", "duck", "ptolemy", "crab",
    "andromeda",
)


# --------------------------------------------------------------------------- #
# Value cleaning helpers (astropy tables use masked values for missing cells)
# --------------------------------------------------------------------------- #
def clean_float(value) -> float | None:
    try:
        if value is None or value is np.ma.masked or np.ma.is_masked(value):
            return None
        f = float(value)
        return None if math.isnan(f) else f
    except (TypeError, ValueError):
        return None


def round_or_none(value: float | None, digits: int = 2) -> float | None:
    """Round a cleaned float, tidying float32->float64 artifacts from votables."""
    return None if value is None else round(value, digits)


def clean_str(value) -> str | None:
    if value is None or value is np.ma.masked or np.ma.is_masked(value):
        return None
    text = str(value).strip()
    return text or None


def canonical_id(raw_mid: str) -> str:
    """'M   1' -> 'M1'."""
    number = int(str(raw_mid).replace("M", "").strip())
    return f"M{number}"


def normalize_alias(alias: str) -> str:
    """Collapse internal whitespace: 'NGC  1952' -> 'NGC 1952'."""
    return " ".join(str(alias).split())


def pick_common_name(aliases: list[str], object_type: str | None) -> str | None:
    """Choose the best human common name from SIMBAD 'NAME ...' identifiers."""
    candidates = [normalize_alias(a[5:]) for a in aliases if a.startswith("NAME ")]
    # Drop ALL-CAPS abbreviations like "CRAB NEB".
    readable = [c for c in candidates if c and not c.isupper()]
    pool = readable or candidates
    if not pool:
        return None

    type_word = (object_type or "").split()[-1].lower() if object_type else ""

    def score(name: str) -> float:
        low = name.lower()
        s = 0.0
        if any(d in low for d in NAME_DESCRIPTORS):
            s += 100
        if type_word and type_word in low:  # e.g. a Galaxy named "... Galaxy"
            s += 20
        words = name.split()
        if len(words) >= 2:
            s += 5
        # Penalise short capitalised abbreviations ("Ori", "Tau", "And", "A").
        for w in words:
            if len(w) <= 3 and w[:1].isupper():
                s -= 20
        s -= len(name) * 0.01  # prefer the more concise of equals
        return s

    return max(pool, key=score)


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #
def fetch_catalog_tables():
    """Query SIMBAD TAP for Messier core data + all identifiers."""
    from astroquery.simbad import Simbad

    sim = Simbad()
    in_list = ", ".join(f"'{mid}'" for mid in MESSIER_IDS)

    logger.info("Downloading Catalog -> SIMBAD TAP (%d identifiers)", len(MESSIER_IDS))
    core = sim.query_tap(
        f"""
        SELECT i.id AS mid, b.main_id, b.ra, b.dec, b.otype_txt,
               b.galdim_majaxis, f.flux AS vmag
        FROM basic AS b
        JOIN ident AS i ON b.oid = i.oidref
        LEFT JOIN flux AS f ON f.oidref = b.oid AND f.filter = 'V'
        WHERE i.id IN ({in_list})
        """
    )

    logger.info("Downloading identifiers/aliases")
    alias_tbl = sim.query_tap(
        f"""
        SELECT i1.id AS mid, i2.id AS alias
        FROM ident AS i1 JOIN ident AS i2 ON i1.oidref = i2.oidref
        WHERE i1.id IN ({in_list})
        """
    )

    # Group aliases by canonical Messier id.
    aliases_by_id: dict[str, list[str]] = {}
    for row in alias_tbl:
        cid = canonical_id(row["mid"])
        aliases_by_id.setdefault(cid, []).append(str(row["alias"]))

    return core, aliases_by_id


# --------------------------------------------------------------------------- #
# Normalize
# --------------------------------------------------------------------------- #
def normalize(row, all_aliases: list[str]) -> dict:
    from astropy.coordinates import SkyCoord, get_constellation
    import astropy.units as u

    cid = canonical_id(row["mid"])
    ra = clean_float(row["ra"])
    dec = clean_float(row["dec"])

    otype_code = clean_str(row["otype_txt"])
    object_type = OTYPE_MAP.get(otype_code, "Other") if otype_code else None

    # Designation aliases (NGC / IC), de-duplicated and sorted.
    designations = sorted(
        {
            normalize_alias(a)
            for a in all_aliases
            if a.strip().upper().startswith(("NGC", "IC "))
        }
    )

    constellation = None
    if ra is not None and dec is not None:
        constellation = get_constellation(SkyCoord(ra=ra * u.deg, dec=dec * u.deg))

    return {
        "catalog": CATALOG,
        "catalog_id": cid,
        "name": pick_common_name(all_aliases, object_type),
        "aliases": designations,
        "object_type": object_type,
        "constellation": constellation,
        "coordinates": {"ra_deg": ra, "dec_deg": dec},
        "physical": {
            "distance_ly": None,          # not reliably available from SIMBAD basic
            "magnitude": round_or_none(clean_float(row["vmag"]), 2),
            "angular_size_arcmin": round_or_none(clean_float(row["galdim_majaxis"]), 2),
        },
        "classification": {"difficulty": None, "season": None},
        "content": {
            "short_description": None,
            "ai_description": None,
            "observation_tips": [],
            "recommended_telescopes": [],
        },
        "media": {"thumbnail": None, "hero_image": None},
    }


# --------------------------------------------------------------------------- #
# Upsert
# --------------------------------------------------------------------------- #
async def upsert(document: dict) -> str:
    """Idempotent upsert on catalog_id. Returns 'Inserted' or 'Updated'."""
    coll = get_database()[catalog_service.COLLECTION]
    now = datetime.now(timezone.utc)
    result = await coll.update_one(
        {"catalog_id": document["catalog_id"]},
        {
            "$set": {**document, "metadata.updated_at": now},
            "$setOnInsert": {"metadata.created_at": now},
        },
        upsert=True,
    )
    return "Inserted" if result.upserted_id is not None else "Updated"


async def main() -> int:
    configure_astropy()

    if not await connect_to_mongo():
        logger.error("Could not connect to MongoDB. Aborting.")
        return 1

    await catalog_service.ensure_indexes()

    core, aliases_by_id = fetch_catalog_tables()
    logger.info("Normalizing Objects -> %d rows returned", len(core))

    if len(core) != MESSIER_COUNT:
        logger.warning("Expected %d objects, SIMBAD returned %d", MESSIER_COUNT, len(core))

    # Order rows M1..M110 for readable progress output.
    rows = sorted(core, key=lambda r: int(canonical_id(r["mid"])[1:]))

    inserted = updated = 0
    for row in rows:
        cid = canonical_id(row["mid"])
        document = normalize(row, aliases_by_id.get(cid, []))
        action = await upsert(document)
        inserted += action == "Inserted"
        updated += action == "Updated"
        logger.info("%s %s", action, cid)

    total = await catalog_service.count_objects()
    logger.info(
        "Completed Successfully -> inserted=%d updated=%d | total in collection=%d",
        inserted, updated, total,
    )

    await close_mongo_connection()
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
