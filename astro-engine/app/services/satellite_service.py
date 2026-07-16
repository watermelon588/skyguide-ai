"""Satellite pass engine — 'when does the ISS fly over me?'

Skyfield (SGP4) propagates station TLEs from Celestrak and finds every pass
above a minimum altitude inside a look-ahead window. Passes are the classic
rise → culminate → set triples, reported in the observer's local time.

A pass being *geometrically* above the horizon is not the same as a pass being
*visible*: the station shines by reflected sunlight, so it can only be seen when
it is still in sunlight while the ground below has fallen dark. Every pass is
therefore annotated with ``sunlit``, ``observer_dark`` and ``visible`` — a
midday overhead pass is real geometry and a waste of a coat, and the caller
must be able to tell the two apart.

Network policy: the ONLY network dependency is the TLE download, which is
cached on disk (``settings.TLE_CACHE_PATH``). A fresh cache is used silently;
a stale cache is still used (with a warning) when Celestrak is unreachable —
TLEs a few days old shift ISS pass times by seconds, not minutes. No cache
and no network is a clean 503. Everything else is offline (Skyfield's builtin
timescale, Astropy's builtin solar ephemeris — no downloads).
"""

import time as _time
from pathlib import Path

import astropy.units as u
import httpx
import numpy as np
from astropy.coordinates import AltAz, EarthLocation, get_body
from astropy.time import Time
from skyfield.api import EarthSatellite, load, wgs84

from app.core.config import settings
from app.core.exceptions import AstroEngineError
from app.core.logging import get_logger
from app.utils.time_utils import iso_utc, local_hhmm, resolve_timezone

logger = get_logger(__name__)

#: A pass must clear this altitude to count (below ~10° it's in the murk).
MIN_PASS_ALTITUDE_DEG = 10.0
#: Longest allowed look-ahead — TLE accuracy decays beyond a few days.
MAX_WINDOW_HOURS = 72
#: The sky must be at least this dark for a pass to stand out. Civil twilight is
#: the honest boundary: the ISS is bright (mag -3 at best), so it emerges well
#: before full astronomical darkness.
OBSERVER_DARK_SUN_ALT_DEG = -6.0
#: Equatorial radius (km, WGS84) — the shadow cylinder's radius.
EARTH_RADIUS_KM = 6378.137

_timescale = load.timescale(builtin=True)


def _cache_file() -> Path:
    """TLE cache path, resolved against the astro-engine root, dir ensured."""
    path = Path(settings.TLE_CACHE_PATH)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


async def _fetch_tle_text() -> str:
    """Current TLE set: fresh cache -> network -> stale cache -> 503."""
    cache = _cache_file()
    age = _time.time() - cache.stat().st_mtime if cache.exists() else None

    if age is not None and age < settings.TLE_CACHE_MAX_AGE_SECONDS:
        return cache.read_text(encoding="utf-8")

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(settings.TLE_URL)
            response.raise_for_status()
        text = response.text
        cache.write_text(text, encoding="utf-8")
        logger.info("TLE Refreshed -> %d bytes from Celestrak", len(text))
        return text
    except httpx.HTTPError as exc:
        if age is not None:
            logger.warning(
                "Celestrak unreachable (%s) — using %.0f h old TLE cache", exc, age / 3600
            )
            return cache.read_text(encoding="utf-8")
        raise AstroEngineError(
            "Satellite elements unavailable — Celestrak is unreachable and no cache exists yet.",
            status_code=503,
        ) from exc


def _parse_satellites(tle_text: str) -> dict[str, EarthSatellite]:
    """Parse 3-line TLE text into {UPPERCASE NAME: satellite}."""
    lines = [ln.strip() for ln in tle_text.splitlines() if ln.strip()]
    satellites: dict[str, EarthSatellite] = {}
    for i in range(0, len(lines) - 2, 3):
        name, l1, l2 = lines[i], lines[i + 1], lines[i + 2]
        if not (l1.startswith("1 ") and l2.startswith("2 ")):
            continue
        satellites[name.upper()] = EarthSatellite(l1, l2, name, _timescale)
    return satellites


def _match_satellite(
    satellites: dict[str, EarthSatellite], query: str
) -> EarthSatellite:
    """Case-insensitive substring match ('iss' -> 'ISS (ZARYA)')."""
    q = query.strip().upper()
    for name, sat in satellites.items():
        if q in name:
            return sat
    available = ", ".join(sorted(satellites)) or "none"
    raise AstroEngineError(
        f"No satellite matching '{query}'. Available: {available}.",
        status_code=404,
    )


def _sun_unit_vector(t: Time) -> np.ndarray:
    """Unit vector from the Earth's centre toward the Sun, in GCRS."""
    sun = get_body("sun", t).cartesian.xyz.to_value(u.km)
    vector = np.asarray(sun, dtype=float)
    return vector / np.linalg.norm(vector)


def _is_sunlit(position_km: np.ndarray, sun_unit: np.ndarray) -> bool:
    """Is a satellite at ``position_km`` (GCRS) out of the Earth's shadow?

    A cylindrical shadow model: project the satellite onto the Earth–Sun axis;
    it is eclipsed only when it lies on the anti-sunward side AND within one
    Earth radius of that axis.

    This ignores the penumbra and the Sun's angular size, which blur the
    terminator by a few seconds of pass time — irrelevant next to the minutes-long
    passes this is used to judge, and far cheaper than a full shadow model.
    """
    along_axis = float(np.dot(position_km, sun_unit))
    if along_axis >= 0.0:
        return True  # sunward hemisphere — never in shadow
    perpendicular = float(np.linalg.norm(position_km - along_axis * sun_unit))
    return perpendicular > EARTH_RADIUS_KM


def _sun_altitude_deg(location: EarthLocation, t: Time) -> float:
    """The Sun's altitude at the observer (degrees; negative = below horizon)."""
    altaz = get_body("sun", t, location).transform_to(
        AltAz(obstime=t, location=location)
    )
    return float(altaz.alt.deg)


def _assess_visibility(
    sat: EarthSatellite, location: EarthLocation, peak_utc: str
) -> dict:
    """Whether a pass is actually *seeable*, judged at its peak.

    Peak is the representative instant: it is when the station is highest and
    brightest, and it is the moment someone told "look up at 21:14" would look.
    A pass that slides into the Earth's shadow on the way down is still a real
    sighting, so peak — not "sunlit throughout" — is the right test.
    """
    t = Time(peak_utc.rstrip("Z"), scale="utc")
    position_km = np.asarray(sat.at(_timescale.from_astropy(t)).position.km, dtype=float)

    sunlit = _is_sunlit(position_km, _sun_unit_vector(t))
    observer_dark = _sun_altitude_deg(location, t) <= OBSERVER_DARK_SUN_ALT_DEG

    return {
        "sunlit": sunlit,
        "observer_dark": observer_dark,
        "visible": sunlit and observer_dark,
    }


async def compute_passes(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
    hours: int = 24,
    satellite: str = "ISS",
    visible_only: bool = False,
) -> dict:
    """Every pass of ``satellite`` above MIN_PASS_ALTITUDE_DEG within
    ``hours``, as rise/culminate/set events with peak altitude and duration.

    Each pass carries ``sunlit`` / ``observer_dark`` / ``visible``. Set
    ``visible_only`` to drop the ones nobody could see; the default returns the
    full geometry, because "the ISS is overhead but invisible" is a legitimate
    thing for a caller to know.
    """
    hours = max(1, min(int(hours), MAX_WINDOW_HOURS))
    start = time if time is not None else Time.now()

    satellites = _parse_satellites(await _fetch_tle_text())
    sat = _match_satellite(satellites, satellite)

    observer = wgs84.latlon(latitude, longitude, elevation_m=elevation)
    location = EarthLocation(
        lat=latitude * u.deg, lon=longitude * u.deg, height=elevation * u.m
    )
    t0 = _timescale.from_astropy(start)
    t1 = _timescale.from_astropy(start + hours / 24.0)

    times, events = sat.find_events(
        observer, t0, t1, altitude_degrees=MIN_PASS_ALTITUDE_DEG
    )

    tzinfo = resolve_timezone(timezone)
    difference = sat - observer

    passes: list[dict] = []
    current: dict | None = None
    for t, event in zip(times, events):
        alt, az, _ = difference.at(t).altaz()
        point = {
            "utc": iso_utc(t.to_astropy()),
            "local": local_hhmm(t.to_astropy(), tzinfo),
            "altitude_deg": round(float(alt.degrees), 1),
            "azimuth_deg": round(float(az.degrees), 1),
        }
        if event == 0:  # rise above the threshold
            current = {"rise": point}
        elif event == 1 and current is not None:  # culmination
            current["peak"] = point
        elif event == 2 and current is not None:  # set below the threshold
            current["set"] = point
            # A window can open mid-pass: only complete triples are passes.
            if "peak" in current:
                rise_t = Time(current["rise"]["utc"].rstrip("Z"), scale="utc")
                set_t = Time(current["set"]["utc"].rstrip("Z"), scale="utc")
                current["duration_minutes"] = round(
                    float((set_t - rise_t).sec) / 60.0, 1
                )
                current["max_altitude_deg"] = current["peak"]["altitude_deg"]
                current.update(
                    _assess_visibility(sat, location, current["peak"]["utc"])
                )
                passes.append(current)
            current = None

    found = len(passes)
    visible = sum(1 for p in passes if p["visible"])
    if visible_only:
        passes = [p for p in passes if p["visible"]]

    logger.info(
        "Passes Calculated -> %s: %d pass(es) in %dh for lat=%.4f lon=%.4f "
        "| %d visible%s",
        sat.name, found, hours, latitude, longitude, visible,
        " (returning those only)" if visible_only else "",
    )

    return {
        "satellite": sat.name,
        "window_hours": hours,
        "minimum_altitude_deg": MIN_PASS_ALTITUDE_DEG,
        "visible_only": visible_only,
        "count": len(passes),
        "passes": passes,
    }
