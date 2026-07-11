"""Visibility engine.

Combines Observer + Current Time + Celestial Catalog to determine which objects
are geometrically visible right now, scores them, and ranks them.

Separation of concerns (this service orchestrates, it does not reimplement):
    - observer_service   -> builds the EarthLocation
    - catalog_service    -> loads objects from MongoDB
    - coordinate_service -> RA/DEC -> Alt/Az, hour angle, airmass,
                            separations, rise/transit/set (all vectorised)

This service owns ONLY: visibility filtering, scoring and ranking.

Scoring model
-------------
Base score (0–100) is the original geometric blend:
    0.70 · altitude  +  0.20 · brightness  +  0.10 · apparent size

A lunar penalty then scales it down. The Moon washes out targets in
proportion to how lit it is and how close it stands: penalty is the product
of illuminated fraction and angular proximity (linear from full effect at 0°
separation to none at 90°), capped at ``MOON_MAX_PENALTY``. Below the horizon
the Moon costs nothing. Heuristic by design — modular so ML can replace it.

Still out of scope: weather, light pollution, telescope suitability, ML.
"""

import numpy as np
from astropy.coordinates import AltAz, get_body
from astropy.time import Time

from app.core.logging import get_logger
from app.services import catalog_service, coordinate_service, observer_service
from app.utils.time_utils import iso_utc, local_hhmm, resolve_timezone

logger = get_logger(__name__)

# --- Base scoring weights (must sum to 1.0) ---
ALT_WEIGHT = 0.70
MAG_WEIGHT = 0.20
SIZE_WEIGHT = 0.10

# --- Normalisation reference points ---
MAG_BRIGHT = 1.0    # <= this magnitude scores full marks (very bright)
MAG_FAINT = 11.0    # >= this magnitude scores zero (near naked-eye limit)
SIZE_REF_ARCMIN = 60.0  # >= this apparent size scores full marks
NEUTRAL = 0.5       # score for a missing magnitude/size (no data either way)

# --- Lunar interference ---
MOON_MAX_PENALTY = 0.35        # a full Moon at 0° can cost at most 35% of score
MOON_REACH_DEG = 90.0          # beyond this separation the Moon costs nothing


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


def compute_base_score(
    altitude_deg: float,
    magnitude: float | None,
    size_arcmin: float | None,
) -> float:
    """Weighted 0–1 geometric score. Modular so ML can replace it later."""
    return (
        ALT_WEIGHT * _altitude_score(altitude_deg)
        + MAG_WEIGHT * _magnitude_score(magnitude)
        + SIZE_WEIGHT * _size_score(size_arcmin)
    )


def compute_moon_penalty(
    separation_deg: float,
    moon_illumination_fraction: float,
    moon_altitude_deg: float,
) -> float:
    """Fraction of the base score the Moon costs this target (0–1).

    penalty = illuminated_fraction · proximity · MOON_MAX_PENALTY, where
    proximity falls linearly from 1 at 0° separation to 0 at MOON_REACH_DEG.
    A Moon below the horizon interferes with nothing.
    """
    if moon_altitude_deg <= 0.0:
        return 0.0
    proximity = _clamp01(1.0 - separation_deg / MOON_REACH_DEG)
    return moon_illumination_fraction * proximity * MOON_MAX_PENALTY


# Kept for backwards compatibility with earlier callers/tests: the pure
# geometric 0–100 score, before lunar adjustment.
def compute_visibility_score(
    altitude_deg: float,
    magnitude: float | None,
    size_arcmin: float | None,
) -> int:
    return int(round(compute_base_score(altitude_deg, magnitude, size_arcmin) * 100))


def _moon_state(location, t: Time) -> dict:
    """Topocentric Moon position + illuminated fraction, computed once per call."""
    altaz_frame = AltAz(obstime=t, location=location)
    moon_topo = get_body("moon", t, location).transform_to(altaz_frame)

    # Illuminated fraction from geocentric geometry (Meeus ch. 48) — the same
    # phase-angle formula the Moon Engine uses.
    moon_geo = get_body("moon", t)
    sun_geo = get_body("sun", t)
    elongation = sun_geo.separation(moon_geo)
    phase_angle = np.arctan2(
        sun_geo.distance * np.sin(elongation),
        moon_geo.distance - sun_geo.distance * np.cos(elongation),
    )
    illumination = float((1.0 + np.cos(phase_angle)) / 2.0)

    return {
        "altitude_deg": float(moon_topo.alt.deg),
        "azimuth_deg": float(moon_topo.az.deg),
        "illumination_fraction": illumination,
        "above_horizon": float(moon_topo.alt.deg) > 0.0,
    }


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
    """Return observer metadata, a Moon summary, and the ranked list of visible
    objects — each carrying live geometry (alt/az/HA), airmass, lunar
    interference, and its next rise/transit/set times.

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
        return {"observer": observer, "utc_time": t.isot, "moon": None, "objects": []}

    moon = _moon_state(location, t)

    # One vectorised transform for the whole catalog.
    ra = np.array([d["coordinates"]["ra_deg"] for d in docs], dtype=float)
    dec = np.array([d["coordinates"]["dec_deg"] for d in docs], dtype=float)

    altaz = coordinate_service.equatorial_to_horizontal_batch(ra, dec, location, t)
    hour_angles = coordinate_service.hour_angle_batch(ra, location, t)
    altitudes = np.asarray(altaz.alt.deg, dtype=float)
    azimuths = np.asarray(altaz.az.deg, dtype=float)
    ha_hours = np.asarray(hour_angles.hourangle, dtype=float)

    airmasses = coordinate_service.airmass_batch(altitudes)
    moon_separations = coordinate_service.angular_separation_altaz_batch(
        altitudes, azimuths, moon["altitude_deg"], moon["azimuth_deg"]
    )
    events = coordinate_service.rise_transit_set_batch(ra, dec, location, t)
    tzinfo = resolve_timezone(timezone)
    logger.info("Visibility Calculated -> %d objects", len(docs))

    visible: list[dict] = []
    for i, doc in enumerate(docs):
        alt = float(altitudes[i])
        if alt <= 0 or alt < minimum_altitude:  # below horizon / below floor
            continue

        physical = doc.get("physical", {})
        magnitude = physical.get("magnitude")
        size = physical.get("angular_size_arcmin")

        separation = float(moon_separations[i])
        penalty = compute_moon_penalty(
            separation, moon["illumination_fraction"], moon["altitude_deg"]
        )
        score = int(round(compute_base_score(alt, magnitude, size) * (1.0 - penalty) * 100))
        if score < minimum_score:
            continue

        circumpolar = bool(events["circumpolar"][i])
        visible.append({
            "catalog_id": doc["catalog_id"],
            "name": doc.get("name"),
            "object_type": doc.get("object_type"),
            "constellation": doc.get("constellation"),
            "altitude_deg": round(alt, 2),
            "azimuth_deg": round(float(azimuths[i]), 2),
            "hour_angle_hours": round(float(ha_hours[i]), 2),
            "airmass": round(float(airmasses[i]), 2),
            "moon_separation_deg": round(separation, 1),
            "moon_penalty": round(penalty, 3),
            "visibility_score": score,
            "is_visible": True,
            # Next events (local HH:MM in the observer's timezone). A visible
            # object's "rise" is tomorrow's — "set"/"transit" are the useful ones.
            "circumpolar": circumpolar,
            "transit": local_hhmm(events["transit"][i], tzinfo),
            "set": None if circumpolar else local_hhmm(events["set"][i], tzinfo),
            "rise": None if circumpolar else local_hhmm(events["rise"][i], tzinfo),
            "hours_until_set": (
                None if circumpolar else round(float(events["hours_to_set"][i]), 1)
            ),
            # private sort helpers, stripped before returning
            "_magnitude": magnitude,
            "_size": size,
        })

    visible.sort(key=_rank_key)
    for obj in visible:
        obj.pop("_magnitude", None)
        obj.pop("_size", None)

    moon_summary = {
        "altitude_deg": round(moon["altitude_deg"], 2),
        "azimuth_deg": round(moon["azimuth_deg"], 2),
        "illumination": round(moon["illumination_fraction"] * 100.0, 1),
        "above_horizon": moon["above_horizon"],
    }

    logger.info(
        "Visible Objects -> %d (moon alt=%.1f illum=%.0f%%)",
        len(visible), moon["altitude_deg"], moon["illumination_fraction"] * 100,
    )
    if visible:
        top = visible[0]
        logger.info(
            "Top Recommendation -> %s (%s) score=%d alt=%.1f moon_sep=%.0f",
            top["catalog_id"], top["name"] or top["object_type"],
            top["visibility_score"], top["altitude_deg"], top["moon_separation_deg"],
        )

    return {
        "observer": observer,
        "utc_time": iso_utc(t),
        "moon": moon_summary,
        "objects": visible,
    }
