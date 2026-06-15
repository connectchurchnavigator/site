import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta
import httpx
from cryptography.fernet import Fernet

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()

cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def decrypt_token(encrypted: str) -> str:
    return cipher.decrypt(encrypted.encode()).decode()

async def sync_all_churches():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    churches = await db.churches.find({
        "$or": [
            {"social_connections.instagram.connected": True},
            {"social_connections.facebook.connected": True}
        ]
    }).to_list(length=None)
    
    for church in churches:
        church_id = str(church["_id"])
        social = church.get("social_connections", {})
        
        if social.get("instagram", {}).get("connected"):
            await sync_instagram_posts(db, church_id, social["instagram"])
        
        if social.get("facebook", {}).get("connected"):
            await sync_facebook_posts(db, church_id, social["facebook"])
        
        await asyncio.sleep(0.5)
    
    client.close()

async def sync_instagram_posts(db, church_id: str, instagram: dict):
    encrypted_token = instagram.get("access_token_encrypted")
    if not encrypted_token:
        return
    
    try:
        access_token = decrypt_token(encrypted_token)
    except:
        return
    
    async with httpx.AsyncClient() as client:
        try:
            me_response = await client.get(
                "https://graph.instagram.com/me",
                params={"fields": "id", "access_token": access_token}
            )
            
            if me_response.status_code != 200:
                return
            
            user_id = me_response.json().get("id")
            
            media_response = await client.get(
                f"https://graph.instagram.com/{user_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
                    "limit": 9,
                    "access_token": access_token
                }
            )
            
            if media_response.status_code != 200:
                return
            
            posts = media_response.json().get("data", [])
            
            await db.social_posts.delete_many({"church_id": church_id, "platform": "instagram"})
            
            for post in posts:
                image_url = post.get("media_url")
                if post.get("media_type") == "VIDEO":
                    image_url = post.get("thumbnail_url", image_url)
                
                await db.social_posts.insert_one({
                    "church_id": church_id,
                    "platform": "instagram",
                    "post_id": post.get("id"),
                    "caption": post.get("caption"),
                    "image_url": image_url,
                    "permalink": post.get("permalink"),
                    "likes_count": 0,
                    "comments_count": 0,
                    "posted_at": datetime.fromisoformat(post.get("timestamp").replace("Z", "+00:00")),
                    "synced_at": datetime.utcnow()
                })
            
            await db.churches.update_one(
                {"_id": church_id},
                {"$set": {"social_connections.instagram.last_synced": datetime.utcnow()}}
            )
        except:
            pass

async def sync_facebook_posts(db, church_id: str, facebook: dict):
    encrypted_token = facebook.get("access_token_encrypted")
    page_id = facebook.get("page_id")
    
    if not encrypted_token or not page_id:
        return
    
    try:
        access_token = decrypt_token(encrypted_token)
    except:
        return
    
    async with httpx.AsyncClient() as client:
        try:
            posts_response = await client.get(
                f"https://graph.facebook.com/v18.0/{page_id}/posts",
                params={
                    "fields": "message,full_picture,permalink_url,created_time",
                    "limit": 6,
                    "access_token": access_token
                }
            )
            
            if posts_response.status_code != 200:
                return
            
            posts = posts_response.json().get("data", [])
            
            await db.social_posts.delete_many({"church_id": church_id, "platform": "facebook"})
            
            for post in posts:
                await db.social_posts.insert_one({
                    "church_id": church_id,
                    "platform": "facebook",
                    "post_id": post.get("id"),
                    "caption": post.get("message"),
                    "image_url": post.get("full_picture"),
                    "permalink": post.get("permalink_url"),
                    "likes_count": 0,
                    "comments_count": 0,
                    "posted_at": datetime.fromisoformat(post.get("created_time").replace("+0000", "+00:00")),
                    "synced_at": datetime.utcnow()
                })
            
            await db.churches.update_one(
                {"_id": church_id},
                {"$set": {"social_connections.facebook.last_synced": datetime.utcnow()}}
            )
        except:
            pass

if __name__ == "__main__":
    asyncio.run(sync_all_churches())