from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os

MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db_name = "DEV-ChurchNavigator" if os.getenv("ENV") == "dev" else "ChurchNavigator"
database = client.get_database(db_name)

async def get_database() -> AsyncIOMotorDatabase:
    return database
