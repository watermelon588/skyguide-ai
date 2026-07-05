"""Coordinate transformation request/response schemas."""

from pydantic import BaseModel, Field


class CoordinateTransformRequest(BaseModel):
    ra: float = Field(..., ge=0, le=360, description="Right Ascension in degrees (0-360)")
    dec: float = Field(..., ge=-90, le=90, description="Declination in degrees (-90 to +90)")
    latitude: float = Field(..., ge=-90, le=90, description="Observer latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Observer longitude in degrees")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Observer elevation in metres")
    time: str | None = Field(
        None,
        description="ISO-8601 UTC time, e.g. '2026-07-05T20:30:00'. Defaults to now.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "ra": 83.82,
                "dec": -5.39,
                "latitude": 22.57,
                "longitude": 88.36,
                "elevation": 0,
                "time": "2026-07-05T20:30:00",
            }
        }
    }


class CoordinateTransformResponse(BaseModel):
    utc_time: str
    altitude_deg: float
    azimuth_deg: float
    hour_angle_deg: float
    hour_angle_hours: float
    local_sidereal_time_hours: float
    is_above_horizon: bool
