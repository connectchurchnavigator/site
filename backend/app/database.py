from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
import logging

logger = logging.getLogger(__name__)

MONGO_URL = os.getenv("MONGODB_URL", "mongodb+srv://cluster.mongodb.net")
DB_NAME = os.getenv("MONGODB_DB", "DEV-ChurchNavigator")

client = None
database = None

async def connect_to_mongo():
    global client, database
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        database = client[DB_NAME]
        await database.command("ping")
        logger.info(f"Connected to MongoDB: {DB_NAME}")
        
        await database.homepage_activity.create_index("created_at", expireAfterSeconds=2592000)
        await database.cache.create_index("expires_at", expireAfterSeconds=0)
        
        logger.info("Created TTL indexes for homepage_activity and cache")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("Closed MongoDB connection")

async def get_database():
    return database