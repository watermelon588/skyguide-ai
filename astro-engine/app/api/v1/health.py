"""Health endpoint — reports service, Astropy and database status."""

from fastapi import APIRouter

from app.core.astro import verify_astropy
from app.core.config import settings
from app.core.database import ping as mongo_ping

router = APIRouter()


@router.get("")
@router.get("/")
async def health():
    astropy_ok = verify_astropy()
    mongo_ok = await mongo_ping()

    return {
        "success": True,
        "service": "astro-engine",
        "version": settings.API_VERSION,
        "astropy": "available" if astropy_ok else "unavailable",
        "database": "connected" if mongo_ok else "disconnected",
    }
