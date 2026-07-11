"""Satellite pass engine — 'when does the ISS fly over me?'

Skyfield (SGP4) propagates station TLEs from Celestrak and finds every pass
above a minimum altitude inside a look-ahead window. Passes are the classic
rise → culminate → set triples, reported in the observer's local time.

Network policy: the ONLY network dependency is the TLE download, which is
cached on disk (``settings.TLE_CACHE_PATH``). A fresh cache is used silently;
a stale cache is still used (with a warning) when Celestrak is unreachable —
TLEs a few days old shift ISS pass times by seconds, not minutes. No cache
and no network is a clean 503. Everything else is offline (Skyfield's builtin
timescale — no deltat download).
"""

import time as _time
from pathlib import Path

import httpx
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


async def compute_passes(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
    hours: int = 24,
    satellite: str = "ISS",
) -> dict:
    """Every pass of ``satellite`` above MIN_PASS_ALTITUDE_DEG within
    ``hours``, as rise/culminate/set events with peak altitude and duration.
    """
    hours = max(1, min(int(hours), MAX_WINDOW_HOURS))
    start = time if time is not None else Time.now()

    satellites = _parse_satellites(await _fetch_tle_text())
    sat = _match_satellite(satellites, satellite)

    observer = wgs84.latlon(latitude, longitude, elevation_m=elevation)
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
                passes.append(current)
            current = None

    logger.info(
        "Passes Calculated -> %s: %d pass(es) in %dh for lat=%.4f lon=%.4f",
        sat.name, len(passes), hours, latitude, longitude,
    )

    return {
        "satellite": sat.name,
        "window_hours": hours,
        "minimum_altitude_deg": MIN_PASS_ALTITUDE_DEG,
        "count": len(passes),
        "passes": passes,
    }
