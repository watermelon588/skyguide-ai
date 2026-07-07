"""Alignment ephemeris request/response schemas.

The alignment engine (Express gateway) asks this service WHERE a target is in
the observer's sky — and how fast that position drifts — so it can compare the
telescope's realtime pointing against it at packet rate without a round-trip
per sensor frame.
"""

from pydantic import BaseModel, Field, model_validator


class AlignmentEphemerisRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Observer latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Observer longitude in degrees")
    elevation: float = Field(0.0, ge=-500, le=9000, description="Observer elevation in metres")

    catalog_id: str | None = Field(
        None,
        min_length=1,
        max_length=64,
        description="Catalog object id, e.g. 'M42'. Takes precedence over ra/dec.",
    )
    ra: float | None = Field(None, ge=0, le=360, description="Right Ascension in degrees (ICRS)")
    dec: float | None = Field(None, ge=-90, le=90, description="Declination in degrees (ICRS)")
    name: str | None = Field(
        None, max_length=100, description="Display name when targeting raw ra/dec"
    )

    time: str | None = Field(
        None,
        description="ISO-8601 UTC time, e.g. '2026-07-07T20:30:00'. Defaults to now.",
    )

    @model_validator(mode="after")
    def _require_target(self) -> "AlignmentEphemerisRequest":
        if self.catalog_id is None and (self.ra is None or self.dec is None):
            raise ValueError("Provide either catalog_id or both ra and dec.")
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.57,
                "longitude": 88.36,
                "elevation": 10,
                "catalog_id": "M42",
            }
        }
    }


class AlignmentEphemeris(BaseModel):
    """Documented shape of the `data` payload (returned via SuccessResponse)."""

    target: dict
    utc_time: str
    altitude_deg: float
    azimuth_deg: float
    altitude_rate_deg_s: float
    azimuth_rate_deg_s: float
    valid_for_s: float
    above_horizon: bool
