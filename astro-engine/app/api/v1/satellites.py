"""Satellite endpoints — 'when does the ISS fly over me?'

    POST /api/v1/satellites/passes

Predicts passes of a station (ISS by default) above the observer within a
look-ahead window. TLEs come from Celestrak with an on-disk cache; see
``satellite_service`` for the freshness policy.

Passes are annotated with ``visible`` (station sunlit + sky dark); pass
``visible_only`` to get just those. The default is the raw geometry, invisible
daytime passes included.
"""

from fastapi import APIRouter

from app.schemas.satellites import SatellitePassRequest, SatellitePassResponse
from app.services import satellite_service
from app.utils.time_utils import parse_time

router = APIRouter()


@router.post("/passes", response_model=SatellitePassResponse, summary="Upcoming passes")
async def passes(payload: SatellitePassRequest) -> SatellitePassResponse:
    data = await satellite_service.compute_passes(
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        timezone=payload.timezone,
        time=parse_time(payload.time),
        hours=payload.hours,
        satellite=payload.satellite,
        visible_only=payload.visible_only,
    )
    qualifier = "visible pass(es)" if data["visible_only"] else "pass(es)"
    return SatellitePassResponse(
        message=f"{data['count']} {qualifier} of {data['satellite']} in the next {data['window_hours']}h.",
        data=data,
    )
