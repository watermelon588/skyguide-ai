from fastapi import FastAPI
from app.api.v1.health import router as health_router

app = FastAPI(
    title="SkyGuide Astro Engine",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "message": "SkyGuide Astro Engine API"
    }
    
app.include_router(
    health_router,
    prefix="/api/v1/health",
    tags=["Health"]
)