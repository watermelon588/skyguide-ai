"""SkyGuide Astro Engine — FastAPI application entrypoint.

Wires together configuration, logging, CORS, MongoDB (Motor), Astropy setup,
the versioned API router, and consistent exception handling.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.astro import configure_astropy, verify_astropy
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.services import catalog_service, weather_service

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # --- Startup ---
    logger.info("Astro Engine Started -> env=%s", settings.APP_ENV)
    configure_astropy()
    if verify_astropy():
        logger.info("Astropy verification passed")
    else:
        logger.warning("Astropy verification FAILED — coordinate endpoints may error")
    mongo_ok = await connect_to_mongo()
    if mongo_ok:
        try:
            await catalog_service.ensure_indexes()
        except Exception as exc:  # noqa: BLE001 - never block startup on index setup
            logger.warning("Catalog index setup skipped: %s", exc)
        try:
            await weather_service.ensure_indexes()
        except Exception as exc:  # noqa: BLE001 - never block startup on index setup
            logger.warning("Weather cache index setup skipped: %s", exc)
    logger.info("Routes Registered -> prefix=%s", settings.API_PREFIX)

    yield

    # --- Shutdown ---
    await close_mongo_connection()
    logger.info("Astro Engine stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.API_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "success": True,
        "service": "astro-engine",
        "message": "SkyGuide Astro Engine API",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
    }
