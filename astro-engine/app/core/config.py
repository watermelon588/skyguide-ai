from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str
    APP_ENV: str
    APP_PORT: int

    MONGO_URI: str
    DATABASE_NAME: str

    class Config:
        env_file = ".env"


settings = Settings()