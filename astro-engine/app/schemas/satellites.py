"""Satellite pass request/response schemas."""

from pydantic import BaseModel, Field


class SatellitePassRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Degrees, -90 (S) to +90 (N)")
    longitude: float = Field(..., ge=-180, le=180, description="Degrees, -180 (W) to +180 (E)")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Metres above sea level")
    timezone: str | None = Field(None, description="IANA timezone, e.g. 'Asia/Kolkata'")
    time: str | None = Field(
        None, description="ISO-8601 UTC window start; defaults to now. For reproducible tests."
    )
    hours: int = Field(24, ge=1, le=72, description="Look-ahead window in hours")
    satellite: str = Field(
        "ISS", min_length=2, max_length=40,
        description="Name (substring match) within the stations TLE group, e.g. 'ISS', 'CSS'",
    )
    visible_only: bool = Field(
        False,
        description=(
            "Return only passes that can actually be SEEN (station sunlit, sky "
            "dark). Default false returns the full geometry, invisible daytime "
            "passes included."
        ),
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.57,
                "longitude": 88.36,
                "timezone": "Asia/Kolkata",
                "hours": 24,
                "satellite": "ISS",
                "visible_only": True,
            }
        }
    }


class PassPoint(BaseModel):
    utc: str
    local: str
    altitude_deg: float
    azimuth_deg: float


class SatellitePass(BaseModel):
    rise: PassPoint
    peak: PassPoint
    set: PassPoint
    duration_minutes: float
    max_altitude_deg: float

    # --- Seeability, judged at peak (see satellite_service) ---
    sunlit: bool = Field(..., description="Station is out of the Earth's shadow")
    observer_dark: bool = Field(
        ..., description="Sun is at or below -6° (civil twilight) at the observer"
    )
    visible: bool = Field(
        ..., description="Sunlit AND dark below — the pass can actually be seen"
    )


class SatellitePassData(BaseModel):
    satellite: str
    window_hours: int
    minimum_altitude_deg: float
    visible_only: bool = False
    count: int
    passes: list[SatellitePass]


class SatellitePassResponse(BaseModel):
    success: bool = True
    message: str
    data: SatellitePassData
