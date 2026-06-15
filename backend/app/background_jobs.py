import asyncio
import logging
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

from .routers.social import sync_instagram_posts, sync_facebook_posts

logger = logging.getLogger(__name__)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "church_navigator")

async def sync_all_social_feeds():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    logger.info("Starting social feed sync job")
    
    churches = await db.churches.find({
        "$or": [
            {"social_connections.instagram.connected": True},
            {"social_connections.facebook.connected": True}
        ]
    }).to_list(length=None)
    
    logger.info(f"Found {len(churches)} churches with social connections")
    
    for church in churches:
        slug = church["slug"]
        
        try:
            instagram = church.get("social_connections", {}).get("instagram", {})
            if instagram.get("connected"):
                last_synced = instagram.get("last_synced")
                if not last_synced or (datetime.utcnow() - last_synced) > timedelta(hours=6):
                    logger.info(f"Syncing Instagram for {slug}")
                    await sync_instagram_posts(slug, db)
                    await asyncio.sleep(2)
            
            facebook = church.get("social_connections", {}).get("facebook", {})
            if facebook.get("connected"):
                last_synced = facebook.get("last_synced")
                if not last_synced or (datetime.utcnow() - last_synced) > timedelta(hours=6):
                    logger.info(f"Syncing Facebook for {slug}")
                    await sync_facebook_posts(slug, db)
                    await asyncio.sleep(2)
                    
        except Exception as e:
            logger.error(f"Error syncing {slug}: {e}")
            continue
    
    logger.info("Social feed sync job completed")
    client.close()

async def run_background_jobs():
    while True:
        try:
            await sync_all_social_feeds()
        except Exception as e:
            logger.error(f"Background job error: {e}")
        
        await asyncio.sleep(3600)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_background_jobs())