"""Observing conditions service — turns weather into an astronomy assessment.

Given a provider-independent weather snapshot, this computes a deterministic
0–100 observing score, maps it to a quality band, rates each contributing
factor, and produces a plain-language recommendation.

Scope:
    - NO HTTP requests (that is ``weather_service``'s job).
    - NO astronomy geometry, moon, seeing or transparency (future sessions).

The scoring is intentionally modular: a future ML model can replace
``compute_observing_score`` without touching the quality mapping or the API.
"""

from app.core.logging import get_logger

logger = get_logger(__name__)

# --- Scoring weights (must sum to 1.0) ---
CLOUD_WEIGHT = 0.45
HUMIDITY_WEIGHT = 0.15
WIND_WEIGHT = 0.15
VISIBILITY_WEIGHT = 0.15
PRECIPITATION_WEIGHT = 0.10

# --- Normalisation reference points ---
WIND_MAX_KMH = 40.0            # >= this wind speed scores zero
VISIBILITY_MAX_KM = 10.0       # >= this visibility scores full marks
NEUTRAL = 50.0                 # points for a missing input (no data either way)

# OpenWeather condition groups that imply active precipitation. Used to derive a
# precipitation probability since the "current weather" endpoint has no `pop`.
_PRECIPITATION_PROBABILITY = {
    "Thunderstorm": 100.0,
    "Rain": 90.0,
    "Snow": 90.0,
    "Drizzle": 70.0,
}

# --- Quality bands: (inclusive lower bound, label) ordered high -> low. ---
_QUALITY_BANDS = [
    (90, "Excellent"),
    (75, "Very Good"),
    (60, "Good"),
    (45, "Fair"),
    (25, "Poor"),
    (0, "Unusable"),
]

_RECOMMENDATIONS = {
    "Excellent": "Excellent night for deep sky observation.",
    "Very Good": "Very good conditions — most targets are observable.",
    "Good": "Good conditions for observing tonight.",
    "Fair": "Fair conditions — favour bright objects like the Moon and planets.",
    "Poor": "Poor conditions — observing is not recommended.",
    "Unusable": "Unusable conditions — cloud or weather prevents observation.",
}


def _clamp_points(value: float) -> float:
    """Clamp a raw points value into the 0–100 range."""
    return max(0.0, min(100.0, value))


def _cloud_points(cloud_cover_percent: float | None) -> float:
    """Clear sky is best. 0% cloud -> 100, 100% cloud -> 0."""
    if cloud_cover_percent is None:
        return NEUTRAL
    return _clamp_points(100.0 - cloud_cover_percent)


def _humidity_points(humidity_percent: float | None) -> float:
    """Drier air is better. 0% -> 100, 100% -> 0."""
    if humidity_percent is None:
        return NEUTRAL
    return _clamp_points(100.0 - humidity_percent)


def _wind_points(wind_speed_kmh: float | None) -> float:
    """Calm air is better. 0 km/h -> 100, >= WIND_MAX_KMH -> 0."""
    if wind_speed_kmh is None:
        return NEUTRAL
    return _clamp_points((WIND_MAX_KMH - wind_speed_kmh) / WIND_MAX_KMH * 100.0)


def _visibility_points(visibility_km: float | None) -> float:
    """Farther visibility is better. 0 km -> 0, >= VISIBILITY_MAX_KM -> 100."""
    if visibility_km is None:
        return NEUTRAL
    return _clamp_points(visibility_km / VISIBILITY_MAX_KM * 100.0)


def _precipitation_probability(weather_main: str | None) -> float:
    """Derive a precipitation probability (%) from the weather condition group.

    The current-weather endpoint has no probability field, so an active
    precipitation condition maps to a high probability and everything else
    (Clear, Clouds, Mist, etc.) to zero.
    """
    if not weather_main:
        return 0.0
    return _PRECIPITATION_PROBABILITY.get(weather_main, 0.0)


def _precipitation_points(weather_main: str | None) -> float:
    """No precipitation is best. 0% probability -> 100, 100% -> 0."""
    return _clamp_points(100.0 - _precipitation_probability(weather_main))


def compute_observing_score(weather: dict) -> int:
    """Weighted 0–100 observing score. Deterministic; ML may replace this."""
    score = (
        CLOUD_WEIGHT * _cloud_points(weather.get("cloud_cover_percent"))
        + HUMIDITY_WEIGHT * _humidity_points(weather.get("humidity_percent"))
        + WIND_WEIGHT * _wind_points(weather.get("wind_speed_kmh"))
        + VISIBILITY_WEIGHT * _visibility_points(weather.get("visibility_km"))
        + PRECIPITATION_WEIGHT * _precipitation_points(weather.get("weather_main"))
    )
    return int(round(score))


def score_to_quality(score: float) -> str:
    """Map a 0–100 score onto a quality band. Isolated so the mapping is reused
    for both the overall score and each per-factor rating."""
    for lower_bound, label in _QUALITY_BANDS:
        if score >= lower_bound:
            return label
    return "Unusable"


def assess(weather: dict) -> dict:
    """Build the full observing-conditions assessment from normalized weather.

    Reserved fields (seeing, transparency, moon_penalty, bortle_class) are left
    null for future sessions.
    """
    score = compute_observing_score(weather)
    quality = score_to_quality(score)

    cloud_rating = score_to_quality(_cloud_points(weather.get("cloud_cover_percent")))
    humidity_rating = score_to_quality(_humidity_points(weather.get("humidity_percent")))
    wind_rating = score_to_quality(_wind_points(weather.get("wind_speed_kmh")))

    logger.info("Observing Score Calculated -> score=%d quality=%s", score, quality)

    return {
        "observing_score": score,
        "observing_quality": quality,
        "cloud_rating": cloud_rating,
        "humidity_rating": humidity_rating,
        "wind_rating": wind_rating,
        "recommendation": _RECOMMENDATIONS[quality],
        # Reserved — do NOT populate in this session.
        "seeing": None,
        "transparency": None,
        "moon_penalty": None,
        "bortle_class": None,
    }
