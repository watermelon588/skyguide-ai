"""Observer test endpoint.

Verifies EarthLocation construction and Astropy sidereal-time integration.
This is a diagnostic endpoint; production observer data will later flow from
the Express gateway.
"""

from fastapi import APIRouter

from app.schemas.common import SuccessResponse
from app.schemas.observer import ObserverTestRequest
from app.services import observer_service

router = APIRouter()


@router.post("/test", response_model=SuccessResponse, summary="Verify observer / EarthLocation")
async def observer_test(payload: ObserverTestRequest) -> SuccessResponse:
    data = observer_service.describe_observer(
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        timezone=payload.timezone,
    )
    return SuccessResponse(message="Observer resolved successfully.", data=data)
