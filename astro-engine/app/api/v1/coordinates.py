"""Coordinate transformation test endpoint.

Transforms an equatorial target (RA/DEC) into horizontal coordinates
(altitude/azimuth) for a given observer and time, plus hour angle and LST.
Diagnostic endpoint that exercises the coordinate service end-to-end.
"""

import astropy.units as u
from fastapi import APIRouter

from app.schemas.common import SuccessResponse
from app.schemas.coordinates import CoordinateTransformRequest
from app.services import coordinate_service
from app.utils.time_utils import parse_time

router = APIRouter()


@router.post("/transform", response_model=SuccessResponse, summary="Equatorial → horizontal")
async def transform(payload: CoordinateTransformRequest) -> SuccessResponse:
    time = parse_time(payload.time)
    observer = coordinate_service.create_observer(
        payload.latitude, payload.longitude, payload.elevation
    )

    altaz = coordinate_service.equatorial_to_horizontal(
        payload.ra, payload.dec, observer, time
    )
    ha = coordinate_service.hour_angle(payload.ra, observer, time)
    lst = coordinate_service.current_sidereal_time(observer, time)

    altitude_deg = float(altaz.alt.to(u.deg).value)

    data = {
        "utc_time": time.isot,
        "altitude_deg": round(altitude_deg, 4),
        "azimuth_deg": round(float(altaz.az.to(u.deg).value), 4),
        "hour_angle_deg": round(float(ha.to(u.deg).value), 4),
        "hour_angle_hours": round(float(ha.to(u.hourangle).value), 4),
        "local_sidereal_time_hours": round(float(lst.hourangle), 4),
        "is_above_horizon": altitude_deg > 0,
    }
    return SuccessResponse(message="Coordinates transformed successfully.", data=data)
