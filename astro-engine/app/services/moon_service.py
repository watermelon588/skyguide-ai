"""Moon Engine — the single source of truth for lunar geometry.

Given an observer and an instant, this service computes every Moon parameter the
future Sky Quality / Recommendation / Eclipse / Supermoon engines will consume:
position, phase, illumination, age, rise/set, angular size and distance.

Design rules (do not break):
    - Pure, deterministic, stateless. No DB, no network, no cache.
    - Astropy only, using the builtin (ERFA) solar-system ephemeris so every
      call is offline-safe. IERS auto-download is disabled globally in
      ``app.core.astro``.
    - Knows nothing about telescopes, weather, catalogs, or recommendations.

Scientific conventions
----------------------
    - Position (alt/az) is topocentric: the Moon is fetched *at the observer's
      location*, so lunar parallax (~1°) is included.
    - RA/DEC and Earth–Moon distance are geocentric apparent (GCRS) — the
      standard ephemeris quantities.
    - Illuminated fraction uses the Meeus phase-angle formula from the geocentric
      Sun/Moon separation and distances.
    - Phase name, waxing/waning and age come from the Moon−Sun geocentric
      ecliptic-longitude difference (0° = New, 180° = Full).
"""

import time as _time
from datetime import timezone as _tz
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import astropy.units as u
import numpy as np
from astropy.coordinates import AltAz, GeocentricTrueEcliptic, get_body
from astropy.time import Time

from app.core.logging import get_logger
from app.services import coordinate_service

logger = get_logger(__name__)

# --- Physical / astronomical constants ---
MOON_RADIUS_KM = 1737.4          # IAU mean lunar radius
SYNODIC_MONTH_DAYS = 29.530588853  # mean New Moon → New Moon interval
# Altitude of the Moon's centre at rise/set — atmospheric refraction (~34') plus
# the mean semi-diameter (~16'), the same convention used for the Sun.
RISE_SET_HORIZON_DEG = -0.8333

# Rise/set search: sample the Moon's altitude across a window slightly longer
# than one lunar day (~24h50m) so a rise AND a set are always bracketed. The
# altitude curve is smooth, so 20-min sampling + linear interpolation of the
# crossing stays within ~1 s of the true event (verified vs astroplan) while
# keeping the ephemeris sweep — the dominant cost — small. Sample 0 is exactly
# ``time``, so it doubles as the current topocentric position (no extra call).
_RISE_SET_WINDOW_HOURS = 25.0
_RISE_SET_STEP_MINUTES = 20.0

# Eight principal phases, each a 45°-wide bin centred on its defining longitude.
_PHASE_BINS = [
    (22.5, "New Moon"),
    (67.5, "Waxing Crescent"),
    (112.5, "First Quarter"),
    (157.5, "Waxing Gibbous"),
    (202.5, "Full Moon"),
    (247.5, "Waning Gibbous"),
    (292.5, "Last Quarter"),
    (337.5, "Waning Crescent"),
]


def _phase_name(elongation_deg: float) -> str:
    """Map the Moon−Sun ecliptic-longitude difference (0–360°) to a phase name."""
    d = elongation_deg % 360.0
    for upper, name in _PHASE_BINS:
        if d < upper:
            return name
    return "New Moon"  # wraps past 337.5° back to New


def _illuminated_fraction(sun, moon) -> float:
    """Meeus (Astronomical Algorithms, ch. 48) illuminated fraction, 0–1.

    ``i`` is the phase angle (Sun–Moon–Earth angle at the Moon); the lit fraction
    is ``(1 + cos i) / 2``. Derived purely from geocentric geometry.
    """
    elongation = sun.separation(moon)          # geocentric Sun–Moon angle (ψ)
    r_sun = sun.distance
    r_moon = moon.distance
    phase_angle = np.arctan2(
        r_sun * np.sin(elongation),
        r_moon - r_sun * np.cos(elongation),
    )
    return float((1.0 + np.cos(phase_angle)) / 2.0)


def _elongation_longitude(sun, moon, t: Time) -> float:
    """Moon−Sun difference in geocentric ecliptic longitude, wrapped to [0, 360).

    0° ≈ New Moon, 90° ≈ First Quarter, 180° ≈ Full, 270° ≈ Last Quarter.
    Increases monotonically through the synodic month, so it also gives age and
    waxing/waning for free.
    """
    frame = GeocentricTrueEcliptic(obstime=t)
    moon_lon = moon.transform_to(frame).lon.deg
    sun_lon = sun.transform_to(frame).lon.deg
    return float((moon_lon - sun_lon) % 360.0)


def _find_rise_set(times: Time, altitudes: np.ndarray, horizon_deg: float):
    """First rise and first set crossings of ``horizon_deg`` in the window.

    Linear interpolation between the two bracketing samples refines each crossing
    to well under a minute — ample for HH:MM output. Returns ``(rise, set)`` as
    Astropy ``Time`` (UTC) or ``None`` when no crossing occurs in the window
    (e.g. a circumpolar Moon at high latitude, or the once-a-month skipped rise).
    """
    rise = None
    moonset = None
    above = altitudes >= horizon_deg
    for i in range(len(altitudes) - 1):
        if above[i] == above[i + 1]:
            continue
        span = altitudes[i + 1] - altitudes[i]
        frac = 0.0 if span == 0 else (horizon_deg - altitudes[i]) / span
        crossing = times[i] + frac * (times[i + 1] - times[i])
        if not above[i] and above[i + 1] and rise is None:
            rise = crossing
        elif above[i] and not above[i + 1] and moonset is None:
            moonset = crossing
        if rise is not None and moonset is not None:
            break
    return rise, moonset


def _local_hhmm(t: Time | None, tzinfo) -> str | None:
    """Format an Astropy ``Time`` as 'HH:MM' in ``tzinfo`` (UTC on fallback)."""
    if t is None:
        return None
    dt = t.to_datetime(timezone=_tz.utc).astimezone(tzinfo)
    return dt.strftime("%H:%M")


def _iso_utc(t: Time | None) -> str | None:
    if t is None:
        return None
    return t.utc.isot + "Z"


def _resolve_tz(timezone: str | None):
    """Return a tzinfo for ``timezone``, falling back to UTC when unknown."""
    if not timezone:
        return _tz.utc
    try:
        return ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError):
        logger.warning("Unknown timezone '%s' — rise/set reported in UTC", timezone)
        return _tz.utc


def compute_moon(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
) -> dict:
    """Compute the full lunar state for an observer at an instant.

    Returns a JSON-serialisable dict shaped for the API's ``data`` field:
    ``{ utc_time, observer, moon }``. Pure and deterministic for a fixed time.
    """
    started = _time.perf_counter()
    t = time if time is not None else Time.now()

    location = coordinate_service.create_observer(latitude, longitude, elevation)

    # One vectorised topocentric ephemeris sweep across the rise/set window.
    # Sample 0 is exactly ``t`` → the current alt/az, so no separate call needed.
    n_steps = int(_RISE_SET_WINDOW_HOURS * 60.0 / _RISE_SET_STEP_MINUTES) + 1
    offsets = np.linspace(0.0, _RISE_SET_WINDOW_HOURS, n_steps) * u.hour
    sweep_times = t + offsets
    sweep_altaz = get_body("moon", sweep_times, location).transform_to(
        AltAz(obstime=sweep_times, location=location)
    )
    sweep_alt = np.asarray(sweep_altaz.alt.deg, dtype=float)
    altitude_deg = float(sweep_alt[0])
    azimuth_deg = float(sweep_altaz.az.deg[0])

    rise_t, set_t = _find_rise_set(sweep_times, sweep_alt, RISE_SET_HORIZON_DEG)
    tzinfo = _resolve_tz(timezone)

    # Geocentric bodies — used for RA/DEC, distance, phase and illumination.
    moon_geo = get_body("moon", t)
    sun_geo = get_body("sun", t)

    ra_deg = float(moon_geo.ra.deg)
    dec_deg = float(moon_geo.dec.deg)
    distance_km = float(moon_geo.distance.to(u.km).value)

    hour_angle = coordinate_service.hour_angle(ra_deg, location, t)
    hour_angle_hours = float(hour_angle.hourangle)

    # Angular diameter (arcmin) from the geocentric distance, kept consistent
    # with the reported distance_km.
    angular_diameter_arcmin = float(
        np.degrees(2.0 * np.arcsin(MOON_RADIUS_KM / distance_km)) * 60.0
    )

    illumination_pct = round(_illuminated_fraction(sun_geo, moon_geo) * 100.0, 1)
    elongation = _elongation_longitude(sun_geo, moon_geo, t)
    phase = _phase_name(elongation)
    age_days = round(elongation / 360.0 * SYNODIC_MONTH_DAYS, 2)

    elapsed_ms = (_time.perf_counter() - started) * 1000.0
    logger.info(
        "Moon Calculated -> lat=%.4f lon=%.4f | phase=%s illum=%.1f%% alt=%.1f | %.1f ms",
        latitude, longitude, phase, illumination_pct, altitude_deg, elapsed_ms,
    )

    return {
        "utc_time": t.utc.isot + "Z",
        "observer": {
            "latitude": latitude,
            "longitude": longitude,
            "elevation": elevation,
            "timezone": timezone,
        },
        "moon": {
            "phase": phase,
            "illumination": illumination_pct,
            "age_days": age_days,
            "altitude_deg": round(altitude_deg, 2),
            "azimuth_deg": round(azimuth_deg, 2),
            "hour_angle_hours": round(hour_angle_hours, 2),
            "distance_km": round(distance_km, 1),
            "angular_diameter_arcmin": round(angular_diameter_arcmin, 2),
            "above_horizon": altitude_deg > 0.0,
            "moonrise": _local_hhmm(rise_t, tzinfo),
            "moonset": _local_hhmm(set_t, tzinfo),
            "moonrise_utc": _iso_utc(rise_t),
            "moonset_utc": _iso_utc(set_t),
            "ra_deg": round(ra_deg, 2),
            "dec_deg": round(dec_deg, 2),
            "reserved": {
                "moon_penalty": None,
                "sky_brightness": None,
                "lunar_target_score": None,
                "earthshine": None,
                "eclipse": None,
                "supermoon": None,
            },
        },
    }
