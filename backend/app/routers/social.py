from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import httpx
import os
from typing import Optional
from cryptography.fernet import Fernet
import base64
import logging

from ..database import get_database
from ..models.social_post import SocialPost

router = APIRouter(prefix="/api/social", tags=["social"])
logger = logging.getLogger(__name__)

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
fernet = Fernet(ENCRYPTION_KEY.encode())

INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
BASE_URL = os.getenv("BASE_URL", "https://api.churchnavigator.com")

def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()

@router.get("/instagram/connect/{church_slug}")
async def instagram_connect(church_slug: str, db = Depends(get_database)):
    if not INSTAGRAM_APP_ID:
        raise HTTPException(status_code=503, detail="Instagram integration not configured")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    redirect_uri = f"{BASE_URL}/api/social/instagram/callback"
    auth_url = (
        f"https://api.instagram.com/oauth/authorize"
        f"?client_id={INSTAGRAM_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user_profile,user_media"
        f"&response_type=code"
        f"&state={church_slug}"
    )
    return RedirectResponse(auth_url)

@router.get("/instagram/callback")
async def instagram_callback(
    code: str = Query(...),
    state: str = Query(...),
    db = Depends(get_database)
):
    church_slug = state
    redirect_uri = f"{BASE_URL}/api/social/instagram/callback"
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://api.instagram.com/oauth/access_token",
                data={
                    "client_id": INSTAGRAM_APP_ID,
                    "client_secret": INSTAGRAM_APP_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                    "code": code
                }
            )
            token_data = token_response.json()
            
            if "access_token" not in token_data:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            short_token = token_data["access_token"]
            user_id = token_data["user_id"]
            
            long_token_response = await client.get(
                "https://graph.instagram.com/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": INSTAGRAM_APP_SECRET,
                    "access_token": short_token
                }
            )
            long_token_data = long_token_response.json()
            access_token = long_token_data["access_token"]
            expires_in = long_token_data.get("expires_in", 5184000)
            
            profile_response = await client.get(
                f"https://graph.instagram.com/{user_id}",
                params={"fields": "username", "access_token": access_token}
            )
            profile_data = profile_response.json()
            username = profile_data.get("username", "")
            
            encrypted_token = encrypt_token(access_token)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            await db.churches.update_one(
                {"slug": church_slug},
                {
                    "$set": {
                        "social_connections.instagram.connected": True,
                        "social_connections.instagram.username": username,
                        "social_connections.instagram.access_token": encrypted_token,
                        "social_connections.instagram.token_expires_at": expires_at,
                        "social_connections.instagram.last_synced": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            await sync_instagram_posts(church_slug, db)
            
    except Exception as e:
        logger.error(f"Instagram OAuth error: {e}")
        return RedirectResponse(f"https://churchnavigator.com/manage/{church_slug}?error=instagram_failed")
    
    return RedirectResponse(f"https://churchnavigator.com/manage/{church_slug}?success=instagram_connected")

@router.get("/facebook/connect/{church_slug}")
async def facebook_connect(church_slug: str, db = Depends(get_database)):
    if not FACEBOOK_APP_ID:
        raise HTTPException(status_code=503, detail="Facebook integration not configured")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    redirect_uri = f"{BASE_URL}/api/social/facebook/callback"
    auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth"
        f"?client_id={FACEBOOK_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=pages_show_list,pages_read_engagement"
        f"&response_type=code"
        f"&state={church_slug}"
    )
    return RedirectResponse(auth_url)

@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db = Depends(get_database)
):
    church_slug = state
    redirect_uri = f"{BASE_URL}/api/social/facebook/callback"
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code
                }
            )
            token_data = token_response.json()
            
            if "access_token" not in token_data:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            user_token = token_data["access_token"]
            
            pages_response = await client.get(
                "https://graph.facebook.com/v18.0/me/accounts",
                params={"access_token": user_token}
            )
            pages_data = pages_response.json()
            
            if not pages_data.get("data"):
                raise HTTPException(status_code=400, detail="No Facebook pages found")
            
            page = pages_data["data"][0]
            page_id = page["id"]
            page_token = page["access_token"]
            
            encrypted_token = encrypt_token(page_token)
            expires_at = datetime.utcnow() + timedelta(days=60)
            
            await db.churches.update_one(
                {"slug": church_slug},
                {
                    "$set": {
                        "social_connections.facebook.connected": True,
                        "social_connections.facebook.page_id": page_id,
                        "social_connections.facebook.access_token": encrypted_token,
                        "social_connections.facebook.token_expires_at": expires_at,
                        "social_connections.facebook.last_synced": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            await sync_facebook_posts(church_slug, db)
            
    except Exception as e:
        logger.error(f"Facebook OAuth error: {e}")
        return RedirectResponse(f"https://churchnavigator.com/manage/{church_slug}?error=facebook_failed")
    
    return RedirectResponse(f"https://churchnavigator.com/manage/{church_slug}?success=facebook_connected")

@router.post("/disconnect/{church_slug}/{platform}")
async def disconnect_social(church_slug: str, platform: str, db = Depends(get_database)):
    if platform not in ["instagram", "facebook"]:
        raise HTTPException(status_code=400, detail="Invalid platform")
    
    await db.churches.update_one(
        {"slug": church_slug},
        {
            "$set": {
                f"social_connections.{platform}.connected": False,
                f"social_connections.{platform}.username": None,
                f"social_connections.{platform}.page_id": None,
                f"social_connections.{platform}.access_token": None,
                f"social_connections.{platform}.token_expires_at": None,
                f"social_connections.{platform}.last_synced": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await db.social_posts.delete_many({"church_id": church_slug, "platform": platform})
    
    return {"success": True}

async def sync_instagram_posts(church_slug: str, db):
    church = await db.churches.find_one({"slug": church_slug})
    if not church or not church.get("social_connections", {}).get("instagram", {}).get("connected"):
        return
    
    instagram = church["social_connections"]["instagram"]
    access_token = decrypt_token(instagram["access_token"])
    
    try:
        async with httpx.AsyncClient() as client:
            me_response = await client.get(
                "https://graph.instagram.com/me",
                params={"fields": "id", "access_token": access_token}
            )
            user_id = me_response.json()["id"]
            
            media_response = await client.get(
                f"https://graph.instagram.com/{user_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
                    "limit": 9,
                    "access_token": access_token
                }
            )
            media_data = media_response.json()
            
            await db.social_posts.delete_many({"church_id": church_slug, "platform": "instagram"})
            
            for item in media_data.get("data", []):
                post = {
                    "church_id": church_slug,
                    "platform": "instagram",
                    "post_id": item["id"],
                    "caption": item.get("caption", ""),
                    "image_url": item.get("media_url") if item["media_type"] == "IMAGE" else item.get("thumbnail_url"),
                    "permalink": item["permalink"],
                    "likes_count": item.get("like_count", 0),
                    "comments_count": item.get("comments_count", 0),
                    "posted_at": datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00")),
                    "synced_at": datetime.utcnow()
                }
                await db.social_posts.insert_one(post)
            
            await db.churches.update_one(
                {"slug": church_slug},
                {"$set": {"social_connections.instagram.last_synced": datetime.utcnow()}}
            )
    except Exception as e:
        logger.error(f"Instagram sync error for {church_slug}: {e}")

async def sync_facebook_posts(church_slug: str, db):
    church = await db.churches.find_one({"slug": church_slug})
    if not church or not church.get("social_connections", {}).get("facebook", {}).get("connected"):
        return
    
    facebook = church["social_connections"]["facebook"]
    access_token = decrypt_token(facebook["access_token"])
    page_id = facebook["page_id"]
    
    try:
        async with httpx.AsyncClient() as client:
            posts_response = await client.get(
                f"https://graph.facebook.com/v18.0/{page_id}/posts",
                params={
                    "fields": "id,message,full_picture,permalink_url,created_time,reactions.summary(true),comments.summary(true)",
                    "limit": 6,
                    "access_token": access_token
                }
            )
            posts_data = posts_response.json()
            
            await db.social_posts.delete_many({"church_id": church_slug, "platform": "facebook"})
            
            for item in posts_data.get("data", []):
                post = {
                    "church_id": church_slug,
                    "platform": "facebook",
                    "post_id": item["id"],
                    "caption": item.get("message", ""),
                    "image_url": item.get("full_picture"),
                    "permalink": item["permalink_url"],
                    "likes_count": item.get("reactions", {}).get("summary", {}).get("total_count", 0),
                    "comments_count": item.get("comments", {}).get("summary", {}).get("total_count", 0),
                    "posted_at": datetime.fromisoformat(item["created_time"].replace("+0000", "+00:00")),
                    "synced_at": datetime.utcnow()
                }
                await db.social_posts.insert_one(post)
            
            await db.churches.update_one(
                {"slug": church_slug},
                {"$set": {"social_connections.facebook.last_synced": datetime.utcnow()}}
            )
    except Exception as e:
        logger.error(f"Facebook sync error for {church_slug}: {e}")

@router.get("/sync/{church_slug}")
async def sync_social_posts(church_slug: str, db = Depends(get_database)):
    await sync_instagram_posts(church_slug, db)
    await sync_facebook_posts(church_slug, db)
    return {"success": True}

@router.get("/posts/{church_slug}")
async def get_social_posts(church_slug: str, platform: Optional[str] = None, db = Depends(get_database)):
    query = {"church_id": church_slug}
    if platform:
        query["platform"] = platform
    
    posts = await db.social_posts.find(query).sort("posted_at", -1).to_list(length=100)
    
    for post in posts:
        post["_id"] = str(post["_id"])
    
    return {"posts": posts}