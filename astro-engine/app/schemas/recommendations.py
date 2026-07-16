"""Recommendation + sky-quality request/response schemas."""

from pydantic import BaseModel, Field

from app.schemas.visibility import MoonSummary, ObserverEcho, VisibleObject


# --------------------------------------------------------------------------
# Requests
# --------------------------------------------------------------------------

class TelescopeSpec(BaseModel):
    """What the observer points at the sky — all optional; the engine degrades
    to pure visibility ranking without it."""

    aperture_mm: float | None = Field(None, gt=0, le=5000)
    focal_length_mm: float | None = Field(None, gt=0, le=20000)
    bortle_scale: int | None = Field(None, ge=1, le=9)


class ObservedEntry(BaseModel):
    id: str = Field(..., description="Catalog id, e.g. 'M42'")
    at: str | None = Field(None, description="ISO-8601 timestamp of the observation")


class HistorySpec(BaseModel):
    """The observer's past behaviour, forwarded by the gateway — the engine
    stays stateless and never reads user collections."""

    observed: list[ObservedEntry] = Field(default_factory=list)
    skipped: list[str] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: float = Field(0.0, ge=-500, le=9000)
    timezone: str | None = None
    time: str | None = Field(None, description="ISO-8601 UTC; defaults to now")

    telescope: TelescopeSpec | None = None
    history: HistorySpec | None = None
    limit: int = Field(10, ge=1, le=50)

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.57,
                "longitude": 88.36,
                "timezone": "Asia/Kolkata",
                "telescope": {"aperture_mm": 150, "focal_length_mm": 1200},
                "history": {"observed": [{"id": "M42", "at": "2026-07-01T18:00:00Z"}]},
            }
        }
    }


class SkyQualityRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class DarkSitesRequest(SkyQualityRequest):
    max_km: float = Field(150.0, ge=10, le=300, description="Search radius")
    min_improvement: int = Field(2, ge=1, le=5, description="Bortle classes darker")


# --------------------------------------------------------------------------
# Responses
# --------------------------------------------------------------------------

class BestWindow(BaseModel):
    start: str | None = None
    peak: str | None = None
    end: str | None = None
    duration_hours: float | None = None
    peak_altitude_deg: float | None = None


class ScoreBreakdown(BaseModel):
    base: int
    aperture: float = 0.0
    fov: float = 0.0
    novelty: float = 0.0
    window: float = 0.0


class RecommendedObject(VisibleObject):
    recommendation_score: int
    reasons: list[str] = Field(default_factory=list)
    best_window: BestWindow | None = None
    score_breakdown: ScoreBreakdown


class SkyQualitySample(BaseModel):
    ratio: float
    mpsas: float
    bortle: int
    zone: str


class DarknessWindow(BaseModel):
    start: str | None = None
    end: str | None = None
    kind: str


class TelescopeUsed(BaseModel):
    aperture_mm: float | None = None
    focal_length_mm: float | None = None
    bortle_scale: int | None = None
    limiting_magnitude: float | None = None
    eyepiece_fov_arcmin: float | None = None


class RecommendationData(BaseModel):
    observer: ObserverEcho
    utc_time: str
    moon: MoonSummary | None = None
    sky_quality: SkyQualitySample | None = None
    darkness: DarknessWindow | None = None
    telescope_used: TelescopeUsed
    model: str
    objects: list[RecommendedObject]


class RecommendationResponse(BaseModel):
    success: bool = True
    message: str
    data: RecommendationData


class SkyQualityData(BaseModel):
    latitude: float
    longitude: float
    sample: SkyQualitySample | None = None
    atlas_year: int


class SkyQualityResponse(BaseModel):
    success: bool = True
    message: str
    data: SkyQualityData


class DarkSite(SkyQualitySample):
    latitude: float
    longitude: float
    distance_km: float
    bearing: str


class DarkSitesData(BaseModel):
    origin: SkyQualitySample | None = None
    sites: list[DarkSite] = Field(default_factory=list)
    searched_km: float
    atlas_year: int


class DarkSitesResponse(BaseModel):
    success: bool = True
    message: str
    data: DarkSitesData
