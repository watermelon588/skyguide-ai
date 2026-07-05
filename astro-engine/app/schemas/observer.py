"""Observer request/response schemas."""

from pydantic import BaseModel, Field


class ObserverTestRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Degrees, -90 (S) to +90 (N)")
    longitude: float = Field(..., ge=-180, le=180, description="Degrees, -180 (W) to +180 (E)")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Metres above sea level")
    timezone: str | None = Field(None, description="IANA timezone, e.g. 'Asia/Kolkata'")

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.57,
                "longitude": 88.36,
                "elevation": 0,
                "timezone": "Asia/Kolkata",
            }
        }
    }


class ObserverInfo(BaseModel):
    latitude_deg: float
    longitude_deg: float
    elevation_m: float
    timezone: str | None = None
    # Geocentric cartesian position of the observer (metres).
    geocentric_x_m: float
    geocentric_y_m: float
    geocentric_z_m: float


class ObserverTestResponse(BaseModel):
    observer: ObserverInfo
    utc_time: str
    local_sidereal_time: str
    local_sidereal_time_hours: float
