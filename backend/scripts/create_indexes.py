import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "DEV-ChurchNavigator")

async def create_indexes():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    logger.info("Creating indexes for churches collection...")
    await db.churches.create_index([("slug", 1)], unique=True)
    await db.churches.create_index([("status", 1), ("city", 1)])
    await db.churches.create_index([("denomination", 1)])
    await db.churches.create_index([("languages", 1)])
    await db.churches.create_index([("is_featured", 1)])
    await db.churches.create_index([("open_to_visits", 1)])
    await db.churches.create_index([
        ("name", "text"),
        ("description", "text"),
        ("city", "text"),
        ("denomination", "text")
    ])
    logger.info("✓ Churches indexes created")
    
    logger.info("Creating indexes for events collection...")
    await db.events.create_index([("date", 1), ("status", 1)])
    await db.events.create_index([("church_id", 1)])
    await db.events.create_index([("slug", 1)], unique=True)
    await db.events.create_index([("city", 1), ("date", 1)])
    await db.events.create_index([
        ("name", "text"),
        ("description", "text"),
        ("city", "text")
    ])
    logger.info("✓ Events indexes created")
    
    logger.info("Creating indexes for pastors collection...")
    await db.pastors.create_index([("slug", 1)], unique=True)
    await db.pastors.create_index([("city", 1), ("status", 1)])
    await db.pastors.create_index([("open_to_visits", 1)])
    await db.pastors.create_index([
        ("name", "text"),
        ("bio", "text"),
        ("city", "text")
    ])
    logger.info("✓ Pastors indexes created")
    
    logger.info("Creating indexes for visitors collection...")
    await db.visitors.create_index([("church_id", 1), ("created_at", -1)])
    await db.visitors.create_index([("email", 1), ("church_id", 1)])
    await db.visitors.create_index([("is_at_risk", 1)])
    logger.info("✓ Visitors indexes created")
    
    logger.info("Creating indexes for ministry_trips collection...")
    await db.ministry_trips.create_index([("user_id", 1)])
    await db.ministry_trips.create_index([("status", 1)])
    logger.info("✓ Ministry trips indexes created")
    
    logger.info("Creating indexes for church_sites collection...")
    await db.church_sites.create_index([("domain", 1)], unique=True)
    await db.church_sites.create_index([("church_id", 1)])
    await db.church_sites.create_index([("church_slug", 1)])
    await db.church_sites.create_index([("hosting_status", 1)])
    logger.info("✓ Church sites indexes created")
    
    logger.info("Creating indexes for homepage_activity collection...")
    await db.homepage_activity.create_index(
        [("created_at", 1)],
        expireAfterSeconds=2592000
    )
    logger.info("✓ Homepage activity indexes created (30 day TTL)")
    
    logger.info("Creating indexes for reviews collection...")
    await db.reviews.create_index([("church_id", 1), ("created_at", -1)])
    await db.reviews.create_index([("rating", -1)])
    logger.info("✓ Reviews indexes created")
    
    logger.info("\n✅ All indexes created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())