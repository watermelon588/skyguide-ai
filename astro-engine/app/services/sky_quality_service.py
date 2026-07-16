"""Sky quality engine — light pollution from the Lorenz 2024 atlas.

Answers two questions no other service can:

    1. "How bright is MY sky?"        -> sample(lat, lon)
    2. "Where nearby is it darker?"   -> find_darker_sites(lat, lon)

Data source
-----------
David Lorenz's Light Pollution Atlas (https://djlorenz.github.io/astronomy/lp/)
publishes free binary data tiles alongside its display tiles: one gzipped file
per 5°x5° cell, holding a 600x600 grid (1/120° ~ 0.9 km) of compressed
artificial-brightness values. Decoding (reverse-engineered from the atlas's own
point-query code and verified against its readouts):

    - byte 0..1:  first value  = 128*d[0] + d[1]   (the SW corner)
    - each row's first byte    = delta vs the row below
    - every other byte         = delta vs the value to the west
    - ratio  = (5/195) * (exp(0.0195 * value) - 1)     # artificial / natural
    - mpsas  = 22 - 5*log10(1 + ratio) / 2             # mag/arcsec^2

Tiles are fetched over HTTPS once and cached in-process (~100 KB each, and an
observer's neighbourhood touches at most a handful), so repeated queries cost
nothing. The atlas covers latitudes -65..+75; outside that band (open ocean,
polar) we return None rather than guess.

Failure policy: this is an ENHANCER. Any network or decode failure degrades to
None values — recommendations must keep working with no sky-quality data.
"""

import asyncio
import gzip
import math

import httpx
import numpy as np

from app.core.logging import get_logger

logger = get_logger(__name__)

ATLAS_YEAR = 2024
TILE_URL = (
    "https://djlorenz.github.io/astronomy/binary_tiles/{year}/"
    "binary_tile_{x}_{y}.dat.gz"
)
TILE_SIZE = 600          # points per side
TILE_DEG = 5.0           # degrees per tile side
GRID_STEP_DEG = 1.0 / 120.0

FETCH_TIMEOUT_S = 8.0

# Bounded in-process tile cache. 32 tiles ~ 3 MB decoded; an observer plus a
# 150 km search ring touches at most 4.
_MAX_CACHED_TILES = 32
_tiles: dict[tuple[int, int], np.ndarray | None] = {}
_tile_locks: dict[tuple[int, int], asyncio.Lock] = {}

# --- mpsas -> Bortle (standard SQM mapping, e.g. ClearDarkSky / Wikipedia) ---
# (lower bound of mpsas, bortle class). Checked top-down.
_BORTLE_TABLE = [
    (21.99, 1),
    (21.89, 2),
    (21.69, 3),
    (20.49, 4),
    (19.50, 5),
    (18.94, 6),
    (18.38, 7),
    (17.80, 8),
    (0.0, 9),
]

# Atlas colour-legend zones by artificial/natural ratio (used for the card's
# short label; the same thresholds the atlas legend draws).
_ZONE_TABLE = [
    (0.01, "pristine"),
    (0.06, "dark"),
    (0.11, "dark"),
    (0.19, "rural"),
    (0.33, "rural"),
    (0.58, "rural/suburban"),
    (1.00, "rural/suburban"),
    (1.73, "suburban"),
    (3.00, "suburban"),
    (5.20, "bright suburban"),
    (9.00, "bright suburban"),
    (15.59, "urban"),
    (27.00, "urban"),
    (float("inf"), "inner city"),
]


def _tile_indices(latitude: float, longitude: float) -> tuple[int, int, int, int]:
    """Atlas tile (x, y) plus in-tile grid point (ix, iy) for a coordinate.

    Mirrors the atlas's own indexing exactly: tiles count from the antimeridian
    eastward and from 65°S northward, 1-based; grid points are 1-based too.
    """
    lon_from_dateline = math.fmod(longitude + 180.0, 360.0)
    if lon_from_dateline < 0:
        lon_from_dateline += 360.0
    lat_from_start = latitude + 65.0

    tile_x = int(lon_from_dateline / TILE_DEG) + 1
    tile_y = int(lat_from_start / TILE_DEG) + 1
    # floor(x + 0.5), NOT round(): the atlas's JS Math.round rounds half UP,
    # while Python's round() banker's-rounds — .5 cases would pick the
    # neighbouring grid point. Clamped to the tile so an edge coordinate can
    # never index out of (or wrap around) the 600x600 grid.
    ix = math.floor(120.0 * (lon_from_dateline - TILE_DEG * (tile_x - 1) + 1.0 / 240.0) + 0.5)
    iy = math.floor(120.0 * (lat_from_start - TILE_DEG * (tile_y - 1) + 1.0 / 240.0) + 0.5)
    ix = min(max(ix, 1), TILE_SIZE)
    iy = min(max(iy, 1), TILE_SIZE)
    return tile_x, tile_y, ix, iy


def _decode_tile(raw: bytes) -> np.ndarray:
    """Gunzip + undo the delta compression -> (600, 600) int array of
    compressed brightness values, row 0 = southern edge."""
    data = np.frombuffer(gzip.decompress(raw), dtype=np.int8).astype(np.int32)
    first = 128 * int(data[0]) + int(data[1])

    # Row starts: first value, then each row's byte at 600*i+1 is a delta vs
    # the row below. (The +1 offset exists because the corner is 2 bytes.)
    row_deltas = data[1 :: TILE_SIZE][:TILE_SIZE].copy()
    row_deltas[0] = 0
    row_starts = first + np.cumsum(row_deltas)

    # Within each row, bytes are west->east deltas.
    body = data[1 : 1 + TILE_SIZE * TILE_SIZE].reshape(TILE_SIZE, TILE_SIZE)
    row_wise = body.copy()
    row_wise[:, 0] = 0
    grid = row_starts[:, None] + np.cumsum(row_wise, axis=1)
    return grid


async def _get_tile(tile_x: int, tile_y: int) -> np.ndarray | None:
    """Fetch-and-cache one binary tile; None when unavailable (ocean tiles
    outside the atlas band, network trouble, malformed data)."""
    if not (1 <= tile_y <= 28):
        return None

    key = (tile_x, tile_y)
    if key in _tiles:
        return _tiles[key]

    lock = _tile_locks.setdefault(key, asyncio.Lock())
    async with lock:
        if key in _tiles:  # settled while we waited
            return _tiles[key]

        url = TILE_URL.format(year=ATLAS_YEAR, x=tile_x, y=tile_y)
        try:
            async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_S) as client:
                response = await client.get(url)
                response.raise_for_status()
                tile = _decode_tile(response.content)
        except Exception as exc:  # noqa: BLE001 - degrade, never raise
            logger.warning("Sky-quality tile %s unavailable: %s", key, exc)
            tile = None

        if len(_tiles) >= _MAX_CACHED_TILES:
            _tiles.pop(next(iter(_tiles)))
        _tiles[key] = tile
        return tile


def _compressed_to_ratio(value: float) -> float:
    return (5.0 / 195.0) * (math.exp(0.0195 * value) - 1.0)


def _ratio_to_mpsas(ratio: float) -> float:
    return 22.0 - 5.0 * math.log(1.0 + ratio) / math.log(100.0)


def _mpsas_to_bortle(mpsas: float) -> int:
    for lower_bound, bortle in _BORTLE_TABLE:
        if mpsas >= lower_bound:
            return bortle
    return 9


def _ratio_to_zone(ratio: float) -> str:
    for upper_bound, zone in _ZONE_TABLE:
        if ratio < upper_bound:
            return zone
    return "inner city"


def _sample_from_tile(tile: np.ndarray, ix: int, iy: int) -> dict:
    compressed = float(tile[iy - 1, ix - 1])
    ratio = _compressed_to_ratio(compressed)
    mpsas = _ratio_to_mpsas(ratio)
    return {
        "ratio": round(ratio, 3),
        "mpsas": round(mpsas, 2),
        "bortle": _mpsas_to_bortle(mpsas),
        "zone": _ratio_to_zone(ratio),
    }


async def sample(latitude: float, longitude: float) -> dict | None:
    """Sky quality at one coordinate, or None outside the atlas / on failure."""
    tile_x, tile_y, ix, iy = _tile_indices(latitude, longitude)
    tile = await _get_tile(tile_x, tile_y)
    if tile is None:
        return None
    return _sample_from_tile(tile, ix, iy)


# --------------------------------------------------------------------------
# Darker-sites search
# --------------------------------------------------------------------------

EARTH_RADIUS_KM = 6371.0

#: Search geometry: rings every RING_STEP_KM out to max_km, BEARING_COUNT
#: spokes. 16 x 30 = 480 samples, all served from <=4 cached tiles.
BEARING_COUNT = 16
RING_STEP_KM = 5.0

#: A "better view" must be at least this many Bortle classes darker.
MIN_CLASS_IMPROVEMENT = 2
#: Chosen sites must not crowd each other.
SITE_SPACING_KM = 15.0
MAX_SITES = 4


def _destination(lat: float, lon: float, bearing_deg: float, distance_km: float):
    """Great-circle destination point (standard haversine formulation)."""
    delta = distance_km / EARTH_RADIUS_KM
    theta = math.radians(bearing_deg)
    phi1 = math.radians(lat)
    lam1 = math.radians(lon)

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta)
        + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lam2 = lam1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),
    )
    return math.degrees(phi2), math.degrees((lam2 + 3 * math.pi) % (2 * math.pi) - math.pi)


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


_COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def _compass_point(bearing_deg: float) -> str:
    return _COMPASS[round(bearing_deg / 22.5) % 16]


async def find_darker_sites(
    latitude: float,
    longitude: float,
    max_km: float = 150.0,
    min_improvement: int = MIN_CLASS_IMPROVEMENT,
) -> dict | None:
    """Nearest places with meaningfully darker skies.

    Samples a polar grid around the observer and greedily keeps the nearest
    candidates that are >= ``min_improvement`` Bortle classes darker, spaced at
    least SITE_SPACING_KM apart. Returns {"origin": sample, "sites": [...]},
    or None when the observer's own sky can't be sampled.

    If the observer already enjoys Bortle <= 3, an empty ``sites`` list simply
    means "you're already somewhere dark" — the caller renders that honestly.
    """
    origin = await sample(latitude, longitude)
    if origin is None:
        return None

    target_bortle = origin["bortle"] - min_improvement
    candidates: list[dict] = []

    if target_bortle >= 1:
        steps = int(max_km / RING_STEP_KM)
        for ring in range(1, steps + 1):
            distance = ring * RING_STEP_KM
            for spoke in range(BEARING_COUNT):
                bearing = spoke * (360.0 / BEARING_COUNT)
                lat, lon = _destination(latitude, longitude, bearing, distance)
                measure = await sample(lat, lon)
                if measure is None or measure["bortle"] > target_bortle:
                    continue
                candidates.append({
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "distance_km": round(distance, 1),
                    "bearing": _compass_point(bearing),
                    **measure,
                })

    # An escalating ladder, not "the four nearest that barely qualify": from a
    # bright city the nearest 2-classes-darker point is often still urban, so
    # we surface the quick win AND the nearest genuinely dark options.
    #   tier 1: nearest qualifying at all      ("better in 10 km")
    #   tier 2: nearest Bortle <= 4 (rural)    ("good skies in 60 km")
    #   tier 3: nearest Bortle <= 3 (dark)     ("dark skies in 120 km")
    candidates.sort(key=lambda c: (c["distance_km"], -c["mpsas"]))
    sites: list[dict] = []

    def _take(pool):
        for candidate in pool:
            if len(sites) >= MAX_SITES:
                return
            if any(
                _haversine_km(candidate["latitude"], candidate["longitude"],
                              s["latitude"], s["longitude"]) < SITE_SPACING_KM
                for s in sites
            ):
                continue
            sites.append(candidate)
            return  # one pick per tier call

    _take(candidates)
    _take([c for c in candidates if c["bortle"] <= 4])
    _take([c for c in candidates if c["bortle"] <= 3])
    _take(candidates)  # one more nearby alternative if room remains

    sites.sort(key=lambda c: c["distance_km"])
    return {"origin": origin, "sites": sites, "searched_km": max_km}
