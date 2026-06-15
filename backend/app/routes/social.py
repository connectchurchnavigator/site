from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import httpx
import os
from cryptography.fernet import Fernet
import base64
from typing import Optional

router = APIRouter(prefix="/api/social", tags=["social"])

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID")
INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET")
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = Fernet.generate_key().decode()

cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return cipher.decrypt(encrypted.encode()).decode()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@router.get("/instagram/connect/{church_slug}")
async def instagram_connect(church_slug: str):
    if not INSTAGRAM_APP_ID:
        raise HTTPException(status_code=500, detail="Instagram not configured")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    redirect_uri = f"{BACKEND_URL}/api/social/instagram/callback"
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
async def instagram_callback(code: str, state: str):
    if not INSTAGRAM_APP_ID or not INSTAGRAM_APP_SECRET:
        raise HTTPException(status_code=500, detail="Instagram not configured")
    
    church_slug = state
    redirect_uri = f"{BACKEND_URL}/api/social/instagram/callback"
    
    async with httpx.AsyncClient() as client_http:
        token_response = await client_http.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": INSTAGRAM_APP_ID,
                "client_secret": INSTAGRAM_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": code
            }
        )
        
        if token_response.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_error=instagram_failed")
        
        token_data = token_response.json()
        short_token = token_data.get("access_token")
        user_id = token_data.get("user_id")
        
        long_token_response = await client_http.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": INSTAGRAM_APP_SECRET,
                "access_token": short_token
            }
        )
        
        if long_token_response.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_error=instagram_failed")
        
        long_token_data = long_token_response.json()
        access_token = long_token_data.get("access_token")
        expires_in = long_token_data.get("expires_in", 5184000)
        
        profile_response = await client_http.get(
            f"https://graph.instagram.com/{user_id}",
            params={"fields": "username", "access_token": access_token}
        )
        
        username = profile_response.json().get("username") if profile_response.status_code == 200 else None
    
    encrypted_token = encrypt_token(access_token)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    await db.churches.update_one(
        {"slug": church_slug},
        {
            "$set": {
                "social_connections.instagram.connected": True,
                "social_connections.instagram.username": username,
                "social_connections.instagram.access_token_encrypted": encrypted_token,
                "social_connections.instagram.token_expires_at": expires_at,
                "social_connections.instagram.last_synced": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_success=instagram")

@router.get("/facebook/connect/{church_slug}")
async def facebook_connect(church_slug: str):
    if not FACEBOOK_APP_ID:
        raise HTTPException(status_code=500, detail="Facebook not configured")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    redirect_uri = f"{BACKEND_URL}/api/social/facebook/callback"
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
async def facebook_callback(code: str, state: str):
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(status_code=500, detail="Facebook not configured")
    
    church_slug = state
    redirect_uri = f"{BACKEND_URL}/api/social/facebook/callback"
    
    async with httpx.AsyncClient() as client_http:
        token_response = await client_http.get(
            "https://graph.facebook.com/v18.0/oauth/access_token",
            params={
                "client_id": FACEBOOK_APP_ID,
                "client_secret": FACEBOOK_APP_SECRET,
                "redirect_uri": redirect_uri,
                "code": code
            }
        )
        
        if token_response.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_error=facebook_failed")
        
        token_data = token_response.json()
        user_token = token_data.get("access_token")
        
        pages_response = await client_http.get(
            "https://graph.facebook.com/v18.0/me/accounts",
            params={"access_token": user_token}
        )
        
        if pages_response.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_error=facebook_no_pages")
        
        pages_data = pages_response.json()
        pages = pages_data.get("data", [])
        
        if not pages:
            return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_error=facebook_no_pages")
        
        page = pages[0]
        page_id = page.get("id")
        page_token = page.get("access_token")
    
    encrypted_token = encrypt_token(page_token)
    
    await db.churches.update_one(
        {"slug": church_slug},
        {
            "$set": {
                "social_connections.facebook.connected": True,
                "social_connections.facebook.page_id": page_id,
                "social_connections.facebook.access_token_encrypted": encrypted_token,
                "social_connections.facebook.token_expires_at": None,
                "social_connections.facebook.last_synced": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return RedirectResponse(f"{FRONTEND_URL}/churches/{church_slug}?social_success=facebook")

@router.post("/disconnect/{church_slug}/{platform}")
async def disconnect_social(church_slug: str, platform: str):
    if platform not in ["instagram", "facebook"]:
        raise HTTPException(status_code=400, detail="Invalid platform")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one(
        {"slug": church_slug},
        {
            "$set": {
                f"social_connections.{platform}.connected": False,
                f"social_connections.{platform}.username": None,
                f"social_connections.{platform}.page_id": None,
                f"social_connections.{platform}.access_token_encrypted": None,
                f"social_connections.{platform}.token_expires_at": None,
                f"social_connections.{platform}.last_synced": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await db.social_posts.delete_many({"church_id": str(church["_id"]), "platform": platform})
    
    return {"success": True}

@router.get("/sync/{church_slug}")
async def sync_social(church_slug: str, background_tasks: BackgroundTasks):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    background_tasks.add_task(sync_church_social, str(church["_id"]), church)
    return {"success": True, "message": "Sync started"}

async def sync_church_social(church_id: str, church: dict):
    social = church.get("social_connections", {})
    
    if social.get("instagram", {}).get("connected"):
        await sync_instagram_posts(church_id, social["instagram"])
    
    if social.get("facebook", {}).get("connected"):
        await sync_facebook_posts(church_id, social["facebook"])

async def sync_instagram_posts(church_id: str, instagram: dict):
    encrypted_token = instagram.get("access_token_encrypted")
    if not encrypted_token:
        return
    
    try:
        access_token = decrypt_token(encrypted_token)
    except:
        return
    
    async with httpx.AsyncClient() as client_http:
        try:
            me_response = await client_http.get(
                "https://graph.instagram.com/me",
                params={"fields": "id", "access_token": access_token}
            )
            
            if me_response.status_code != 200:
                return
            
            user_id = me_response.json().get("id")
            
            media_response = await client_http.get(
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

async def sync_facebook_posts(church_id: str, facebook: dict):
    encrypted_token = facebook.get("access_token_encrypted")
    page_id = facebook.get("page_id")
    
    if not encrypted_token or not page_id:
        return
    
    try:
        access_token = decrypt_token(encrypted_token)
    except:
        return
    
    async with httpx.AsyncClient() as client_http:
        try:
            posts_response = await client_http.get(
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

@router.get("/posts/{church_slug}")
async def get_social_posts(church_slug: str, platform: Optional[str] = None):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    query = {"church_id": str(church["_id"])}
    if platform:
        query["platform"] = platform
    
    posts = await db.social_posts.find(query).sort("posted_at", -1).to_list(length=20)
    
    for post in posts:
        post["_id"] = str(post["_id"])
    
    return {"posts": posts}