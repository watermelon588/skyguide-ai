"""Moon Engine request/response schemas.

Kept independent of the other astronomy schemas (design rule: the Moon Engine
is self-contained). Mirrors the SkyGuide response contract:
``{ success, message, data }``.
"""

from pydantic import BaseModel, Field


class MoonRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Degrees, -90 (S) to +90 (N)")
    longitude: float = Field(..., ge=-180, le=180, description="Degrees, -180 (W) to +180 (E)")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Metres above sea level")
    timezone: str | None = Field(
        None, description="IANA timezone for rise/set times, e.g. 'Asia/Kolkata'. UTC if omitted."
    )
    time: str | None = Field(
        None, description="ISO-8601 UTC instant; defaults to now. For reproducible results."
    )

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


class MoonReserved(BaseModel):
    """Placeholders the downstream engines (Sky Quality, Recommendation, Eclipse,
    Supermoon…) will populate. Always null here — the Moon Engine only computes
    raw lunar geometry."""

    moon_penalty: float | None = None
    sky_brightness: float | None = None
    lunar_target_score: float | None = None
    earthshine: float | None = None
    eclipse: bool | None = None
    supermoon: bool | None = None


class MoonObject(BaseModel):
    phase: str = Field(..., description="Named phase, e.g. 'Waxing Gibbous'")
    illumination: float = Field(..., description="Illuminated fraction, 0–100 %")
    age_days: float = Field(..., description="Days since the last New Moon")
    altitude_deg: float = Field(..., description="Altitude above the horizon (topocentric)")
    azimuth_deg: float = Field(..., description="Azimuth, degrees East of North")
    hour_angle_hours: float = Field(..., description="Hour angle, -12..+12 h (0 = transit)")
    distance_km: float = Field(..., description="Geocentric Earth–Moon distance (km)")
    angular_diameter_arcmin: float = Field(..., description="Apparent diameter (arcminutes)")
    above_horizon: bool = Field(..., description="True when altitude > 0")
    moonrise: str | None = Field(None, description="Next moonrise, HH:MM in observer timezone")
    moonset: str | None = Field(None, description="Next moonset, HH:MM in observer timezone")
    moonrise_utc: str | None = Field(None, description="Next moonrise, ISO-8601 UTC")
    moonset_utc: str | None = Field(None, description="Next moonset, ISO-8601 UTC")
    ra_deg: float = Field(..., description="Geocentric apparent Right Ascension (deg)")
    dec_deg: float = Field(..., description="Geocentric apparent Declination (deg)")
    reserved: MoonReserved = Field(default_factory=MoonReserved)


class MoonObserverEcho(BaseModel):
    latitude: float
    longitude: float
    elevation: float
    timezone: str | None = None


class MoonData(BaseModel):
    utc_time: str
    observer: MoonObserverEcho
    moon: MoonObject


class MoonResponse(BaseModel):
    success: bool = True
    message: str
    data: MoonData
