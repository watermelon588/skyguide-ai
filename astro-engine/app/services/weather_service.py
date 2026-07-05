"""Weather service — provider integration, normalization and caching.

Responsibilities:
    - Call the OpenWeather API (the only place raw provider JSON exists).
    - Normalize the response into a provider-independent shape.
    - Cache results in the ``weather_cache`` collection to reduce API calls.

This service contains NO astronomy and NO scoring logic. Turning weather into
an observing assessment is the job of ``observing_conditions_service``. Keeping
the provider boundary here means swapping OpenWeather for another source later
touches only this file.
"""

from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.core.database import get_database
from app.core.exceptions import AstroEngineError
from app.core.logging import get_logger

logger = get_logger(__name__)

PROVIDER = "OpenWeather"
CACHE_COLLECTION = "weather_cache"

# Coordinates are rounded to this many decimals for the cache key. Two decimals
# is ~1.1 km, a sensible granularity for weather that does not vary block-to-block.
_COORD_PRECISION = 2

# OpenWeather caps the visibility field at 10 km (10000 m).
_MAX_VISIBILITY_M = 10_000


def _cache_collection():
    return get_database()[CACHE_COLLECTION]


def _round_coord(value: float) -> float:
    return round(value, _COORD_PRECISION)


async def ensure_indexes() -> list[str]:
    """Create the weather cache indexes. Idempotent.

    - A TTL index on ``expires_at`` (expireAfterSeconds=0) lets MongoDB purge a
      document exactly when its own ``expires_at`` timestamp passes.
    - A compound index on the rounded location + provider backs cache lookups
      and the upsert key.
    """
    coll = _cache_collection()
    created = [
        await coll.create_index("expires_at", expireAfterSeconds=0, name="ttl_expires_at"),
        await coll.create_index(
            [("latitude", 1), ("longitude", 1), ("provider", 1)],
            name="idx_location_provider",
        ),
    ]
    logger.info("Weather cache indexes ensured: %s", created)
    return created


async def _get_cached(latitude: float, longitude: float) -> dict | None:
    """Return fresh cached weather for the location, or ``None`` on a miss.

    Guards on ``expires_at`` directly so a stale document the TTL monitor has
    not yet swept is never served.
    """
    coll = _cache_collection()
    doc = await coll.find_one(
        {
            "latitude": _round_coord(latitude),
            "longitude": _round_coord(longitude),
            "provider": PROVIDER,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    )
    return doc["weather"] if doc else None


async def _store_cache(latitude: float, longitude: float, weather: dict) -> None:
    """Upsert the normalized weather for the location with a fresh TTL window.

    Upserting on (location, provider) keeps one row per location instead of
    accumulating history; the TTL index still purges rows once they expire.
    """
    coll = _cache_collection()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.WEATHER_CACHE_TTL_SECONDS)
    await coll.update_one(
        {
            "latitude": _round_coord(latitude),
            "longitude": _round_coord(longitude),
            "provider": PROVIDER,
        },
        {
            "$set": {
                "latitude": _round_coord(latitude),
                "longitude": _round_coord(longitude),
                "provider": PROVIDER,
                "weather": weather,
                "cached_at": now,
                "expires_at": expires_at,
            }
        },
        upsert=True,
    )


async def _fetch_openweather(latitude: float, longitude: float) -> dict:
    """Call OpenWeather and return the raw JSON. Never logs the API key."""
    if not settings.OPENWEATHER_API_KEY:
        raise AstroEngineError(
            "Weather provider is not configured.", status_code=503
        )

    params = {
        "lat": latitude,
        "lon": longitude,
        "units": "metric",
        "appid": settings.OPENWEATHER_API_KEY,
    }
    logger.info("OpenWeather Request -> lat=%.4f lon=%.4f", latitude, longitude)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.OPENWEATHER_BASE_URL, params=params)
    except httpx.HTTPError as exc:
        logger.warning("OpenWeather request error: %s", exc)
        raise AstroEngineError(
            "Weather provider is unreachable.", status_code=502
        ) from exc

    if response.status_code == 401:
        # Bad/missing key on the provider side — log server-side, hide detail.
        logger.warning("OpenWeather authentication failed (401)")
        raise AstroEngineError("Weather provider authentication failed.", status_code=502)
    if response.status_code != 200:
        logger.warning("OpenWeather returned status %d", response.status_code)
        raise AstroEngineError("Weather provider request failed.", status_code=502)

    logger.info("OpenWeather Response -> status=%d", response.status_code)
    return response.json()


def _normalize(raw: dict) -> dict:
    """Convert a raw OpenWeather payload into the provider-independent shape.

    Missing fields degrade to ``None`` rather than raising — a partial provider
    response should still yield a usable snapshot.
    """
    main = raw.get("main") or {}
    wind = raw.get("wind") or {}
    clouds = raw.get("clouds") or {}
    weather_list = raw.get("weather") or []
    weather0 = weather_list[0] if weather_list else {}

    temp = main.get("temp")
    feels_like = main.get("feels_like")
    humidity = main.get("humidity")
    cloud_cover = clouds.get("all")
    pressure = main.get("pressure")
    wind_speed_ms = wind.get("speed")
    visibility_m = raw.get("visibility")

    return {
        "temperature_c": round(temp) if temp is not None else None,
        "feels_like_c": round(feels_like) if feels_like is not None else None,
        "humidity_percent": round(humidity) if humidity is not None else None,
        "cloud_cover_percent": round(cloud_cover) if cloud_cover is not None else None,
        "pressure_hpa": round(pressure) if pressure is not None else None,
        # OpenWeather reports wind in m/s under the metric unit system.
        "wind_speed_kmh": round(wind_speed_ms * 3.6, 1) if wind_speed_ms is not None else None,
        "visibility_km": round(min(visibility_m, _MAX_VISIBILITY_M) / 1000, 1)
        if visibility_m is not None
        else None,
        "weather_main": weather0.get("main"),
        "weather_description": weather0.get("description"),
    }


async def get_current_weather(latitude: float, longitude: float) -> dict:
    """Return normalized current weather, using the cache when it is fresh.

    Cache-first: a hit avoids an OpenWeather call entirely; a miss fetches,
    normalizes, caches, then returns.
    """
    cached = await _get_cached(latitude, longitude)
    if cached is not None:
        logger.info("Weather Cache Hit -> lat=%.4f lon=%.4f", latitude, longitude)
        return cached

    logger.info("Weather Cache Miss -> lat=%.4f lon=%.4f", latitude, longitude)
    raw = await _fetch_openweather(latitude, longitude)
    weather = _normalize(raw)
    await _store_cache(latitude, longitude, weather)
    return weather
