"""Recommendation + sky-quality endpoints (Feature 8, Phase A).

    POST /api/v1/recommendations           personalized, explained ranking
    POST /api/v1/sky-quality               light pollution at a coordinate
    POST /api/v1/sky-quality/dark-sites    nearest meaningfully darker places

The engine is stateless about users: telescope and history arrive in the
request body (the gateway owns that data and forwards it).
"""

from fastapi import APIRouter

from app.schemas.recommendations import (
    DarkSitesRequest,
    DarkSitesResponse,
    RecommendationRequest,
    RecommendationResponse,
    SkyQualityRequest,
    SkyQualityResponse,
)
from app.services import recommendation_service, sky_quality_service
from app.utils.time_utils import parse_time

router = APIRouter()
sky_router = APIRouter()


@router.post(
    "",
    response_model=RecommendationResponse,
    summary="Personalized target recommendations",
)
async def recommendations(payload: RecommendationRequest) -> RecommendationResponse:
    data = await recommendation_service.compute_recommendations(
        latitude=payload.latitude,
        longitude=payload.longitude,
        elevation=payload.elevation,
        timezone=payload.timezone,
        time=parse_time(payload.time),
        telescope=payload.telescope.model_dump() if payload.telescope else None,
        history=payload.history.model_dump() if payload.history else None,
        limit=payload.limit,
    )
    return RecommendationResponse(
        message="Recommendations computed successfully.",
        data=data,
    )


@sky_router.post(
    "",
    response_model=SkyQualityResponse,
    summary="Sky quality (light pollution) at a coordinate",
)
async def sky_quality(payload: SkyQualityRequest) -> SkyQualityResponse:
    sample = await sky_quality_service.sample(payload.latitude, payload.longitude)
    return SkyQualityResponse(
        message=(
            "Sky quality sampled successfully."
            if sample is not None
            else "No atlas coverage for this coordinate."
        ),
        data={
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "sample": sample,
            "atlas_year": sky_quality_service.ATLAS_YEAR,
        },
    )


@sky_router.post(
    "/dark-sites",
    response_model=DarkSitesResponse,
    summary="Nearest darker observing sites",
)
async def dark_sites(payload: DarkSitesRequest) -> DarkSitesResponse:
    result = await sky_quality_service.find_darker_sites(
        payload.latitude,
        payload.longitude,
        max_km=payload.max_km,
        min_improvement=payload.min_improvement,
    )
    if result is None:
        return DarkSitesResponse(
            message="No atlas coverage for this coordinate.",
            data={
                "origin": None,
                "sites": [],
                "searched_km": payload.max_km,
                "atlas_year": sky_quality_service.ATLAS_YEAR,
            },
        )
    return DarkSitesResponse(
        message="Darker sites computed successfully.",
        data={**result, "atlas_year": sky_quality_service.ATLAS_YEAR},
    )
