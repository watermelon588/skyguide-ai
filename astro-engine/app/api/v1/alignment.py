"""Alignment ephemeris endpoint.

Consumed by the Express gateway's realtime alignment engine: resolves a target
(catalog id or raw RA/DEC), computes its horizontal position + drift rates for
the observer, and returns a short-lived ephemeris segment the gateway can
extrapolate at packet rate.
"""

from fastapi import APIRouter, status

from app.core.exceptions import AstroEngineError
from app.schemas.alignment import AlignmentEphemerisRequest
from app.schemas.common import SuccessResponse
from app.services import alignment_service, catalog_service
from app.utils.time_utils import parse_time

router = APIRouter()


@router.post(
    "/ephemeris",
    response_model=SuccessResponse,
    summary="Target Alt/Az + drift rates for realtime alignment",
)
async def ephemeris(payload: AlignmentEphemerisRequest) -> SuccessResponse:
    time = parse_time(payload.time)

    if payload.catalog_id:
        obj = await catalog_service.get_object_by_catalog_id(payload.catalog_id)
        if obj is None:
            raise AstroEngineError("Target not found in catalog.", status_code=status.HTTP_404_NOT_FOUND)

        coords = obj.get("coordinates") or {}
        ra, dec = coords.get("ra_deg"), coords.get("dec_deg")
        if ra is None or dec is None:
            raise AstroEngineError(
                "Catalog object has no usable coordinates.",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        target = {
            "catalog_id": obj.get("catalog_id"),
            "name": obj.get("name") or obj.get("catalog_id"),
            "object_type": obj.get("object_type"),
            "ra_deg": ra,
            "dec_deg": dec,
        }
    else:
        ra, dec = payload.ra, payload.dec
        target = {
            "catalog_id": None,
            "name": payload.name or f"RA {ra:.2f}° / DEC {dec:+.2f}°",
            "object_type": None,
            "ra_deg": ra,
            "dec_deg": dec,
        }

    data = alignment_service.compute_ephemeris(
        ra_deg=ra,
        dec_deg=dec,
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        time=time,
    )
    data["target"] = target

    return SuccessResponse(message="Ephemeris computed successfully.", data=data)
