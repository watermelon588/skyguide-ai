from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = AsyncIOMotorClient(
    settings.MONGO_URI
)

db = client[
    settings.DATABASE_NAME
]