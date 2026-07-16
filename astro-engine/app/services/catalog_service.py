"""Catalog service — database access for the celestial catalog.

Responsibilities: querying, searching, filtering, pagination, and index
management for the ``celestial_objects`` collection.

This service performs NO astronomy: no coordinate transforms, no visibility,
no recommendations. Those live in the coordinate/visibility/recommendation
layers. Keeping this purely data-access keeps the catalog reusable and fast.
"""

import re

from app.core.database import get_database
from app.core.logging import get_logger

logger = get_logger(__name__)

COLLECTION = "celestial_objects"


def _collection():
    return get_database()[COLLECTION]


def _escape(term: str) -> str:
    """Escape a user string for safe use inside a MongoDB regex."""
    return re.escape(term.strip())


def _serialize(doc: dict) -> dict:
    """Convert a raw Mongo document into a JSON-safe dict (ObjectId -> str)."""
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    # Normalise datetimes in metadata to ISO strings.
    meta = doc.get("metadata")
    if isinstance(meta, dict):
        for key in ("created_at", "updated_at"):
            value = meta.get(key)
            if hasattr(value, "isoformat"):
                meta[key] = value.isoformat()
    return doc


def _build_filter(
    catalog: str | None = None,
    object_type: str | None = None,
    constellation: str | None = None,
    q: str | None = None,
) -> dict:
    """Compose a MongoDB filter from optional criteria.

    ``catalog`` / ``object_type`` / ``constellation`` are matched
    case-insensitively and exactly. ``q`` is a case-insensitive substring match
    across name, aliases and catalog_id.
    """
    query: dict = {}

    if catalog:
        query["catalog"] = {"$regex": f"^{_escape(catalog)}$", "$options": "i"}
    if object_type:
        query["object_type"] = {"$regex": f"^{_escape(object_type)}$", "$options": "i"}
    if constellation:
        query["constellation"] = {"$regex": f"^{_escape(constellation)}$", "$options": "i"}

    if q:
        pattern = {"$regex": _escape(q), "$options": "i"}
        query["$or"] = [
            {"name": pattern},
            {"aliases": pattern},
            {"catalog_id": pattern},
        ]

    return query


async def ensure_indexes() -> list[str]:
    """Create the catalog indexes. Idempotent (Mongo skips existing ones)."""
    coll = _collection()
    created = [
        await coll.create_index("catalog_id", unique=True, name="uniq_catalog_id"),
        await coll.create_index("catalog", name="idx_catalog"),
        await coll.create_index("name", name="idx_name"),
        await coll.create_index("aliases", name="idx_aliases"),
        await coll.create_index("object_type", name="idx_object_type"),
        await coll.create_index("constellation", name="idx_constellation"),
        # The visibility candidate filter is a range query on magnitude; without
        # this it collection-scans 13k docs on every /observable call.
        await coll.create_index("physical.magnitude", name="idx_magnitude"),
    ]
    logger.info("Catalog indexes ensured: %s", created)
    return created


# The only fields the visibility pipeline reads (for scoring) or the /tonight UI
# renders (for display). Everything else — ai_description, observation_tips,
# hero_image, aliases, source, metadata — is dead weight in a 13k-doc scan and
# is projected away. Loading full documents was the dominant cost of the
# endpoint once the catalog grew (~6 s of a ~13 s response).
_VISIBILITY_PROJECTION = {
    "_id": 0,
    "catalog_id": 1,
    "name": 1,
    "object_type": 1,
    "constellation": 1,
    "coordinates": 1,
    "physical.magnitude": 1,
    "physical.angular_size_arcmin": 1,
    "classification.difficulty": 1,
    "content.short_description": 1,
    "media.thumbnail": 1,
}


async def load_visibility_candidates(
    max_magnitude: float | None = None,
    catalog: str | None = None,
    object_type: str | None = None,
    constellation: str | None = None,
) -> list[dict]:
    """Lean candidate set for the visibility engine.

    Projects to just the scoring + display fields (see ``_VISIBILITY_PROJECTION``)
    and, when ``max_magnitude`` is given, filters to objects at least that bright
    at the DATABASE level — so a 13k catalog does not have to be transferred and
    transformed in full for every "what's up" query. Objects with no recorded
    magnitude are excluded by a magnitude filter: an unmeasurable target cannot
    be honestly recommended, and they are the faint anonymous tail anyway.
    """
    query = _build_filter(catalog, object_type, constellation)
    if max_magnitude is not None:
        query["physical.magnitude"] = {"$ne": None, "$lte": max_magnitude}

    cursor = _collection().find(query, _VISIBILITY_PROJECTION)
    return await cursor.to_list(length=None)


async def get_all_objects(
    page: int = 1,
    limit: int = 20,
    catalog: str | None = None,
    object_type: str | None = None,
    constellation: str | None = None,
    q: str | None = None,
    sort: str = "catalog_id",
) -> tuple[list[dict], int]:
    """Return a page of objects plus the total count matching the filter.

    ``sort`` is "catalog_id" (default, stable id order) or "magnitude"
    (brightest first). Sorting by magnitude restricts the set to objects that
    HAVE a magnitude — a brightest-first list of unmeasured objects is
    meaningless, and it keeps the null tail out of "show me the notable ones"
    surfaces like the target panel's similar-objects rail.
    """
    coll = _collection()
    query = _build_filter(catalog, object_type, constellation, q)

    if sort == "magnitude":
        query["physical.magnitude"] = {"$ne": None}
        sort_spec = [("physical.magnitude", 1), ("catalog_id", 1)]
    else:
        sort_spec = [("catalog_id", 1)]

    total = await coll.count_documents(query)
    skip = (page - 1) * limit
    cursor = coll.find(query).sort(sort_spec).skip(skip).limit(limit)
    docs = [_serialize(doc) async for doc in cursor]
    return docs, total


async def get_object_by_catalog_id(catalog_id: str) -> dict | None:
    """Look up a single object by its catalog id (case-insensitive, e.g. 'M42')."""
    coll = _collection()
    doc = await coll.find_one(
        {"catalog_id": {"$regex": f"^{_escape(catalog_id)}$", "$options": "i"}}
    )
    return _serialize(doc) if doc else None


async def search_objects(q: str, limit: int = 20) -> list[dict]:
    """Case-insensitive search across name, aliases and catalog_id."""
    coll = _collection()
    query = _build_filter(q=q)
    cursor = coll.find(query).sort("catalog_id", 1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


async def filter_by_type(object_type: str, limit: int = 100) -> list[dict]:
    """Return objects of a given type (e.g. 'Galaxy')."""
    coll = _collection()
    cursor = coll.find(_build_filter(object_type=object_type)).sort("catalog_id", 1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


async def filter_by_constellation(constellation: str, limit: int = 100) -> list[dict]:
    """Return objects in a given constellation (e.g. 'Orion')."""
    coll = _collection()
    cursor = coll.find(_build_filter(constellation=constellation)).sort("catalog_id", 1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


async def count_objects() -> int:
    """Total number of catalog objects."""
    return await _collection().count_documents({})


# Magnitude buckets for the Explore page histogram. Boundaries follow the same
# amateur-observing story as the difficulty bands (naked eye ~6, binoculars ~9.5,
# small scope ~12, big scope ~14+). ``default`` catches unmeasured objects.
_MAGNITUDE_BOUNDARIES = [-30, 6, 8, 10, 11, 12, 13, 14, 16, 30]


async def get_catalog_stats() -> dict:
    """Aggregate catalog statistics for the Explore page's visualizations.

    A single ``$facet`` computes every grouping server-side in one pass — far
    cheaper and smaller over the wire than shipping 13k documents to the client
    to count. Returns counts by catalog, type, constellation, and magnitude
    band, plus the totals the header tiles show.
    """
    pipeline = [
        {
            "$facet": {
                "total": [{"$count": "n"}],
                "named": [{"$match": {"name": {"$ne": None}}}, {"$count": "n"}],
                "with_image": [
                    {"$match": {"media.thumbnail": {"$ne": None}}},
                    {"$count": "n"},
                ],
                "by_catalog": [
                    {"$group": {"_id": "$catalog", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "by_type": [
                    {"$group": {"_id": "$object_type", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "by_constellation": [
                    {"$match": {"constellation": {"$ne": None}}},
                    {"$group": {"_id": "$constellation", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ],
                "by_magnitude": [
                    {
                        "$bucket": {
                            "groupBy": "$physical.magnitude",
                            "boundaries": _MAGNITUDE_BOUNDARIES,
                            "default": "unknown",
                            "output": {"count": {"$sum": 1}},
                        }
                    }
                ],
            }
        }
    ]

    cursor = _collection().aggregate(pipeline)
    (facet,) = await cursor.to_list(length=1)

    def _scalar(key: str) -> int:
        docs = facet.get(key) or []
        return docs[0]["n"] if docs else 0

    def _pairs(key: str, label: str) -> list[dict]:
        return [{label: d["_id"], "count": d["count"]} for d in facet.get(key, [])]

    # Turn the numeric bucket lower-bounds into human labels.
    labels = {
        -30: "< 6", 6: "6–8", 8: "8–10", 10: "10–11", 11: "11–12",
        12: "12–13", 13: "13–14", 14: "14–16", 16: "≥ 16", "unknown": "no data",
    }
    magnitude = [
        {"bin": labels.get(d["_id"], str(d["_id"])), "count": d["count"]}
        for d in facet.get("by_magnitude", [])
    ]

    return {
        "total": _scalar("total"),
        "named": _scalar("named"),
        "with_image": _scalar("with_image"),
        "by_catalog": _pairs("by_catalog", "catalog"),
        "by_type": _pairs("by_type", "type"),
        "by_constellation": _pairs("by_constellation", "constellation"),
        "by_magnitude": magnitude,
    }
