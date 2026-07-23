"""SkyGuide Astro Engine — FastAPI application entrypoint.

Wires together configuration, logging, CORS, MongoDB (Motor), Astropy setup,
the versioned API router, and consistent exception handling.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""

import hmac
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
    # Fail CLOSED: a production engine without a key is an open, unauthenticated
    # compute API on the public internet. Refusing to boot is the only outcome
    # that can't be missed — a warning here would scroll past and ship.
    if settings.is_production and not settings.INTERNAL_API_KEY:
        raise RuntimeError(
            "INTERNAL_API_KEY must be set when APP_ENV=production — the engine "
            "would otherwise accept unauthenticated requests from anyone."
        )
    if settings.INTERNAL_API_KEY:
        logger.info("Internal API key auth ENABLED (X-Internal-Key required)")
    else:
        logger.warning(
            "Internal API key auth DISABLED — development only. Set "
            "INTERNAL_API_KEY to require the gateway's shared secret."
        )
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
    # The interactive docs enumerate every endpoint and payload shape — useful
    # in development, free reconnaissance in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths reachable without the internal key: the root banner, the health probe
# (container orchestrators can't send custom headers), CORS preflight, and the
# interactive docs.
#
# Exempting the docs is safe BECAUSE they are disabled outright in production
# (docs_url=None above), so these paths 404 there regardless. Gating them would
# only break Swagger UI in development — the one environment where it exists.
_PUBLIC_PATHS = {
    "/",
    f"{settings.API_PREFIX}/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


@app.middleware("http")
async def require_internal_key(request: Request, call_next):
    """Gate /api/v1 on the shared secret the gateway holds.

    No-op when INTERNAL_API_KEY is unset, which keeps local development exactly
    as it was; production cannot reach that state because startup aborts first.

    `hmac.compare_digest` rather than `==` so the comparison doesn't leak the
    key one character at a time through response timing.
    """
    if not settings.INTERNAL_API_KEY:
        return await call_next(request)

    if request.method == "OPTIONS" or request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    supplied = request.headers.get("x-internal-key", "")
    if not hmac.compare_digest(supplied, settings.INTERNAL_API_KEY):
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Unauthorized."},
        )

    return await call_next(request)


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
