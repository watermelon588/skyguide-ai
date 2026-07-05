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
    ]
    logger.info("Catalog indexes ensured: %s", created)
    return created


async def get_all_objects(
    page: int = 1,
    limit: int = 20,
    catalog: str | None = None,
    object_type: str | None = None,
    constellation: str | None = None,
    q: str | None = None,
) -> tuple[list[dict], int]:
    """Return a page of objects plus the total count matching the filter."""
    coll = _collection()
    query = _build_filter(catalog, object_type, constellation, q)

    total = await coll.count_documents(query)
    skip = (page - 1) * limit
    cursor = coll.find(query).sort("catalog_id", 1).skip(skip).limit(limit)
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
