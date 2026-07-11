"""Weather endpoint — 'how good are the observing conditions here right now?'

    POST /api/v1/weather/current

Fetches (cache-first) current weather for the observer's coordinates and
returns it alongside an astronomy-focused observing assessment. This endpoint
makes no celestial recommendations — it only describes the conditions.
"""

from fastapi import APIRouter

from app.schemas.weather import WeatherRequest, WeatherResponse
from app.services import moon_service, observing_conditions_service, weather_service

router = APIRouter()


@router.post("/current", response_model=WeatherResponse, summary="Current observing conditions")
async def current(payload: WeatherRequest) -> WeatherResponse:
    weather = await weather_service.get_current_weather(payload.latitude, payload.longitude)
    # The Moon's light is as much a "condition" as clouds are — folded into
    # the score via a documented penalty (see observing_conditions_service).
    moon = moon_service.light_state(payload.latitude, payload.longitude)
    observing_conditions = observing_conditions_service.assess(weather, moon=moon)
    return WeatherResponse(
        message="Weather retrieved successfully.",
        data={
            "weather": weather,
            "observing_conditions": observing_conditions,
        },
    )
