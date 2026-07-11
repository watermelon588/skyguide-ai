"""Visibility endpoints — 'what can I observe right now?'

    POST /api/v1/visibility/observable   all currently-visible objects, ranked
    POST /api/v1/visibility/recommended  the top 10 highest-ranked objects

Both accept an observer (+ optional filters) and never query astroquery — they
read the pre-seeded catalog and compute geometry with Astropy.
"""

from fastapi import APIRouter

from app.schemas.visibility import VisibilityRequest, VisibilityResponse
from app.services import visibility_service
from app.utils.time_utils import parse_time

router = APIRouter()

RECOMMENDED_LIMIT = 10


async def _observable(payload: VisibilityRequest) -> dict:
    """Shared computation for both endpoints."""
    return await visibility_service.compute_observable(
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        timezone=payload.timezone,
        time=parse_time(payload.time),
        minimum_altitude=payload.minimum_altitude,
        minimum_score=payload.minimum_score,
        object_type=payload.type,
        catalog=payload.catalog,
        constellation=payload.constellation,
    )


@router.post("/observable", response_model=VisibilityResponse, summary="Visible objects, ranked")
async def observable(payload: VisibilityRequest) -> VisibilityResponse:
    result = await _observable(payload)
    objects = result["objects"]
    return VisibilityResponse(
        message=f"{len(objects)} object(s) currently visible.",
        data={
            "observer": result["observer"],
            "utc_time": result["utc_time"],
            "moon": result["moon"],
            "count": len(objects),
            "objects": objects,
        },
    )


@router.post("/recommended", response_model=VisibilityResponse, summary="Top 10 objects")
async def recommended(payload: VisibilityRequest) -> VisibilityResponse:
    result = await _observable(payload)
    objects = result["objects"][:RECOMMENDED_LIMIT]
    return VisibilityResponse(
        message=f"Top {len(objects)} object(s) to observe now.",
        data={
            "observer": result["observer"],
            "utc_time": result["utc_time"],
            "moon": result["moon"],
            "count": len(objects),
            "objects": objects,
        },
    )
