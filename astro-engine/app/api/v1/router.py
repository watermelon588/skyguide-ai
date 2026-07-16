"""Aggregates all v1 routers under a single include point."""

from fastapi import APIRouter

from app.api.v1 import (
    alignment,
    catalog,
    coordinates,
    health,
    moon,
    observer,
    recommendations,
    satellites,
    visibility,
    weather,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(observer.router, prefix="/observer", tags=["Observer"])
api_router.include_router(coordinates.router, prefix="/coordinates", tags=["Coordinates"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
api_router.include_router(visibility.router, prefix="/visibility", tags=["Visibility"])
api_router.include_router(moon.router, prefix="/moon", tags=["Moon"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(alignment.router, prefix="/alignment", tags=["Alignment"])
api_router.include_router(satellites.router, prefix="/satellites", tags=["Satellites"])
api_router.include_router(
    recommendations.router, prefix="/recommendations", tags=["Recommendations"]
)
api_router.include_router(
    recommendations.sky_router, prefix="/sky-quality", tags=["Sky Quality"]
)
