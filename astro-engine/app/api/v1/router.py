"""Aggregates all v1 routers under a single include point."""

from fastapi import APIRouter

from app.api.v1 import catalog, coordinates, health, observer, visibility, weather

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(observer.router, prefix="/observer", tags=["Observer"])
api_router.include_router(coordinates.router, prefix="/coordinates", tags=["Coordinates"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
api_router.include_router(visibility.router, prefix="/visibility", tags=["Visibility"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
