"""Visibility engine.

Combines Observer + Current Time + Celestial Catalog to determine which objects
are geometrically visible right now, scores them, and ranks them.

Separation of concerns (this service orchestrates, it does not reimplement):
    - observer_service   -> builds the EarthLocation
    - catalog_service    -> loads objects from MongoDB
    - coordinate_service -> RA/DEC -> Alt/Az and hour angle (vectorised)

This service owns ONLY: visibility filtering, scoring and ranking.

Scope (Session 7): pure geometric visibility. No moon, weather, light
pollution, telescope suitability, rise/set, or ML — those come later.
"""

import numpy as np
from astropy.time import Time

from app.core.logging import get_logger
from app.services import catalog_service, coordinate_service, observer_service

logger = get_logger(__name__)

# --- Scoring weights (must sum to 1.0) ---
ALT_WEIGHT = 0.70
MAG_WEIGHT = 0.20
SIZE_WEIGHT = 0.10

# --- Normalisation reference points ---
MAG_BRIGHT = 1.0    # <= this magnitude scores full marks (very bright)
MAG_FAINT = 11.0    # >= this magnitude scores zero (near naked-eye limit)
SIZE_REF_ARCMIN = 60.0  # >= this apparent size scores full marks
NEUTRAL = 0.5       # score for a missing magnitude/size (no data either way)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _altitude_score(altitude_deg: float) -> float:
    """Higher in the sky is better. 0 deg -> 0.0, 90 deg (zenith) -> 1.0."""
    return _clamp01(altitude_deg / 90.0)


def _magnitude_score(magnitude: float | None) -> float:
    """Brighter (lower magnitude) is better. Missing data -> neutral."""
    if magnitude is None:
        return NEUTRAL
    return _clamp01((MAG_FAINT - magnitude) / (MAG_FAINT - MAG_BRIGHT))


def _size_score(size_arcmin: float | None) -> float:
    """Larger apparent size is easier to observe. Missing data -> neutral."""
    if size_arcmin is None:
        return NEUTRAL
    return _clamp01(size_arcmin / SIZE_REF_ARCMIN)


def compute_visibility_score(
    altitude_deg: float,
    magnitude: float | None,
    size_arcmin: float | None,
) -> int:
    """Weighted 0–100 visibility score. Modular so ML can replace it later."""
    score = (
        ALT_WEIGHT * _altitude_score(altitude_deg)
        + MAG_WEIGHT * _magnitude_score(magnitude)
        + SIZE_WEIGHT * _size_score(size_arcmin)
    )
    return int(round(score * 100))


def _rank_key(obj: dict) -> tuple:
    """Deterministic ranking: score desc, then altitude desc, then brightest,
    then largest, then catalog id — matching the stated priority."""
    mag = obj["_magnitude"]
    size = obj["_size"]
    return (
        -obj["visibility_score"],
        -obj["altitude_deg"],
        mag if mag is not None else float("inf"),   # brighter first
        -(size if size is not None else 0.0),        # larger first
        obj["catalog_id"],
    )


async def compute_observable(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
    minimum_altitude: float = 0.0,
    minimum_score: int = 0,
    object_type: str | None = None,
    catalog: str | None = None,
    constellation: str | None = None,
) -> dict:
    """Return observer metadata plus the ranked list of visible objects.

    An object is 'visible' when its altitude is above the horizon (> 0 deg) and
    at or above ``minimum_altitude``/``minimum_score``. Objects below the horizon
    are discarded. An empty result is a success, not an error.
    """
    t = time if time is not None else Time.now()

    location = observer_service.build_observer(latitude, longitude, elevation)
    logger.info("Observer Created -> lat=%.4f lon=%.4f elev=%.1fm", latitude, longitude, elevation)

    # Load candidate objects (DB-level filters applied here).
    docs, _ = await catalog_service.get_all_objects(
        page=1,
        limit=100_000,
        catalog=catalog,
        object_type=object_type,
        constellation=constellation,
    )
    # Guard against any document missing coordinates.
    docs = [
        d for d in docs
        if d.get("coordinates", {}).get("ra_deg") is not None
        and d.get("coordinates", {}).get("dec_deg") is not None
    ]
    logger.info("Loaded %d Objects", len(docs))

    observer = {
        "latitude": latitude,
        "longitude": longitude,
        "elevation": elevation,
        "timezone": timezone,
    }
    if not docs:
        return {"observer": observer, "utc_time": t.isot, "objects": []}

    # One vectorised transform for the whole catalog.
    ra = np.array([d["coordinates"]["ra_deg"] for d in docs], dtype=float)
    dec = np.array([d["coordinates"]["dec_deg"] for d in docs], dtype=float)

    altaz = coordinate_service.equatorial_to_horizontal_batch(ra, dec, location, t)
    hour_angles = coordinate_service.hour_angle_batch(ra, location, t)
    altitudes = np.asarray(altaz.alt.deg, dtype=float)
    azimuths = np.asarray(altaz.az.deg, dtype=float)
    ha_hours = np.asarray(hour_angles.hourangle, dtype=float)
    logger.info("Visibility Calculated -> %d objects", len(docs))

    visible: list[dict] = []
    for i, doc in enumerate(docs):
        alt = float(altitudes[i])
        if alt <= 0 or alt < minimum_altitude:  # below horizon / below floor
            continue

        physical = doc.get("physical", {})
        magnitude = physical.get("magnitude")
        size = physical.get("angular_size_arcmin")
        score = compute_visibility_score(alt, magnitude, size)
        if score < minimum_score:
            continue

        visible.append({
            "catalog_id": doc["catalog_id"],
            "name": doc.get("name"),
            "object_type": doc.get("object_type"),
            "constellation": doc.get("constellation"),
            "altitude_deg": round(alt, 2),
            "azimuth_deg": round(float(azimuths[i]), 2),
            "hour_angle_hours": round(float(ha_hours[i]), 2),
            "visibility_score": score,
            "is_visible": True,
            # private sort helpers, stripped before returning
            "_magnitude": magnitude,
            "_size": size,
        })

    visible.sort(key=_rank_key)
    for obj in visible:
        obj.pop("_magnitude", None)
        obj.pop("_size", None)

    logger.info("Visible Objects -> %d", len(visible))
    if visible:
        top = visible[0]
        logger.info(
            "Top Recommendation -> %s (%s) score=%d alt=%.1f",
            top["catalog_id"], top["name"] or top["object_type"],
            top["visibility_score"], top["altitude_deg"],
        )

    return {"observer": observer, "utc_time": t.isot, "objects": visible}
