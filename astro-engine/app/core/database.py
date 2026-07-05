"""Async MongoDB connection management using Motor.

The Astro Engine owns the ``celestialtargets``, ``recommendations`` and
``weathercache`` collections (see ASTRO_ENGINE.md). Only async Motor operations
are used — never mix in synchronous PyMongo calls.

The client is created lazily during application startup (``connect_to_mongo``)
and closed on shutdown (``close_mongo_connection``). Consumers access the
database via ``get_database()``.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class _MongoState:
    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None


_state = _MongoState()


async def connect_to_mongo() -> bool:
    """Open the Motor client and verify connectivity with a ping.

    Returns ``True`` if the ping succeeds. A failure is logged but does not
    raise, so the astronomy endpoints (which do not need Mongo yet) still work.
    """
    _state.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    _state.database = _state.client[settings.DATABASE_NAME]

    try:
        await _state.client.admin.command("ping")
        logger.info("Mongo Connected -> database '%s'", settings.DATABASE_NAME)
        return True
    except Exception as exc:  # noqa: BLE001 - surface any driver/network error
        logger.warning("Mongo connection failed: %s", exc)
        return False


async def close_mongo_connection() -> None:
    """Close the Motor client on shutdown."""
    if _state.client is not None:
        _state.client.close()
        _state.client = None
        _state.database = None
        logger.info("Mongo connection closed")


async def ping() -> bool:
    """Lightweight health probe used by the health endpoint."""
    if _state.client is None:
        return False
    try:
        await _state.client.admin.command("ping")
        return True
    except Exception:  # noqa: BLE001
        return False


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database handle.

    Raises ``RuntimeError`` if called before ``connect_to_mongo``.
    """
    if _state.database is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _state.database
