"""Weather engine request/response schemas.

The response is provider-independent: nothing here mirrors OpenWeather's raw
JSON shape. Raw provider payloads never leave ``weather_service``.
"""

from pydantic import BaseModel, Field


class WeatherRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Degrees, -90 (S) to +90 (N)")
    longitude: float = Field(..., ge=-180, le=180, description="Degrees, -180 (W) to +180 (E)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.57,
                "longitude": 88.36,
            }
        }
    }


class NormalizedWeather(BaseModel):
    """Provider-independent weather snapshot (produced by weather_service)."""

    temperature_c: int | None = None
    feels_like_c: int | None = None
    humidity_percent: int | None = None
    cloud_cover_percent: int | None = None
    pressure_hpa: int | None = None
    wind_speed_kmh: float | None = None
    visibility_km: float | None = None
    weather_main: str | None = None
    weather_description: str | None = None


class ObservingConditions(BaseModel):
    """Astronomy-focused assessment derived from the normalized weather."""

    observing_score: int
    observing_quality: str
    cloud_rating: str
    humidity_rating: str
    wind_rating: str
    recommendation: str

    # --- Reserved for future sessions. Intentionally left null. ---
    seeing: float | None = None
    transparency: float | None = None
    moon_penalty: float | None = None
    bortle_class: int | None = None


class WeatherData(BaseModel):
    weather: NormalizedWeather
    observing_conditions: ObservingConditions


class WeatherResponse(BaseModel):
    success: bool = True
    message: str
    data: WeatherData
