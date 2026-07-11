"""Visibility engine request/response schemas."""

from pydantic import BaseModel, Field


class VisibilityRequest(BaseModel):
    # --- Observer ---
    latitude: float = Field(..., ge=-90, le=90, description="Degrees, -90 (S) to +90 (N)")
    longitude: float = Field(..., ge=-180, le=180, description="Degrees, -180 (W) to +180 (E)")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Metres above sea level")
    timezone: str | None = Field(None, description="IANA timezone, e.g. 'Asia/Kolkata'")
    time: str | None = Field(
        None, description="ISO-8601 UTC time; defaults to now. For reproducible tests."
    )

    # --- Filters (all optional) ---
    minimum_altitude: float = Field(
        0.0, ge=0, le=90, description="Only objects at or above this altitude (deg)"
    )
    minimum_score: int = Field(0, ge=0, le=100, description="Only objects at or above this score")
    type: str | None = Field(None, description="Filter by object type, e.g. 'Galaxy'")
    catalog: str | None = Field(None, description="Filter by catalog, e.g. 'Messier'")
    constellation: str | None = Field(None, description="Filter by constellation, e.g. 'Orion'")

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


class VisibleObject(BaseModel):
    catalog_id: str
    name: str | None = None
    object_type: str | None = None
    constellation: str | None = None
    altitude_deg: float
    azimuth_deg: float
    hour_angle_hours: float
    airmass: float | None = None
    moon_separation_deg: float | None = None
    moon_penalty: float = 0.0
    visibility_score: int
    is_visible: bool
    # Next events, local HH:MM in the observer's timezone (None where the
    # concept doesn't apply — e.g. rise/set for a circumpolar target).
    circumpolar: bool = False
    rise: str | None = None
    transit: str | None = None
    set: str | None = None
    hours_until_set: float | None = None


class MoonSummary(BaseModel):
    """The Moon as it affects tonight's scores — full state lives at /moon."""

    altitude_deg: float
    azimuth_deg: float
    illumination: float
    above_horizon: bool


class ObserverEcho(BaseModel):
    latitude: float
    longitude: float
    elevation: float
    timezone: str | None = None


class VisibilityData(BaseModel):
    observer: ObserverEcho
    utc_time: str
    moon: MoonSummary | None = None
    count: int
    objects: list[VisibleObject]


class VisibilityResponse(BaseModel):
    success: bool = True
    message: str
    data: VisibilityData
