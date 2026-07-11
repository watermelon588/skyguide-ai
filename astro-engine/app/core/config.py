"""Application configuration.

All runtime configuration is loaded from environment variables via
``pydantic-settings``. There must be NO hardcoded configuration scattered
across the codebase — everything flows through this single ``settings`` object.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Application ---
    APP_NAME: str = "SkyGuide Astro Engine"
    APP_ENV: str = "development"
    APP_PORT: int = 8000

    # --- API ---
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # --- Database (MongoDB Atlas via Motor) ---
    MONGO_URI: str
    DATABASE_NAME: str

    # --- CORS ---
    # Stored as a comma-separated string so it can be overridden from a plain
    # ``.env`` value without needing JSON. Use ``cors_origins`` to consume it.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://192.168.92.253:5173"

    # --- Weather (OpenWeather) ---
    # The key is supplied via ``.env`` and MUST never be hardcoded. It defaults
    # to an empty string so the service boots without it; ``weather_service``
    # fails cleanly (503) when a weather call is attempted without a key.
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5/weather"
    # Cached weather is considered fresh for this many seconds (TTL = 10 min).
    WEATHER_CACHE_TTL_SECONDS: int = 600

    # --- Satellites (Celestrak TLEs) ---
    # The 'stations' group carries the ISS and CSS. TLEs age gracefully, so a
    # day-old cache is fine for pass prediction, and a stale cache is still
    # used (with a warning) when Celestrak is unreachable.
    TLE_URL: str = (
        "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    )
    TLE_CACHE_PATH: str = "data/stations.tle"
    TLE_CACHE_MAX_AGE_SECONDS: int = 24 * 3600

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        """CORS origins as a clean list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


settings = Settings()
