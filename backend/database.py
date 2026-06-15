import os
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "DEV-ChurchNavigator")

mongo_client = None

def get_mongo_client():
    global mongo_client
    if not mongo_client:
        mongo_client = AsyncIOMotorClient(
            MONGO_URL,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000
        )
        logger.info("MongoDB connection pool initialized")
    return mongo_client

async def get_database():
    client = get_mongo_client()
    return client[DATABASE_NAME]

async def close_mongo_connection():
    global mongo_client
    if mongo_client:
        mongo_client.close()
        mongo_client = None
        logger.info("MongoDB connection closed")