"""Moon endpoint — 'where is the Moon and how bright is it right now?'

    POST /api/v1/moon/current

Returns the full lunar state for an observer. Makes no recommendations and knows
nothing about telescopes or weather — it is the reusable source of truth every
lunar-aware engine will consume.
"""

from fastapi import APIRouter

from app.schemas.moon import MoonRequest, MoonResponse
from app.services import moon_service
from app.utils.time_utils import parse_time

router = APIRouter()


@router.post("/current", response_model=MoonResponse, summary="Current Moon state")
async def current(payload: MoonRequest) -> MoonResponse:
    data = moon_service.compute_moon(
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        timezone=payload.timezone,
        time=parse_time(payload.time),
    )
    return MoonResponse(
        message="Moon information calculated successfully.",
        data=data,
    )
