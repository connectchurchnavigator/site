from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import httpx
import os
from typing import Optional
from cryptography.fernet import Fernet
import base64
from bson import ObjectId

router = APIRouter(prefix="/api/social", tags=["social"])

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID")
INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET")
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
BASE_URL = os.getenv("BASE_URL", "https://api.churchnavigator.com")

def get_db(request: Request) -> AsyncIOMotorClient:
    return request.app.mongodb

def encrypt_token(token: str) -> str:
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    return cipher.decrypt(encrypted_token.encode()).decode()

@router.get("/instagram/connect/{church_slug}")
async def instagram_connect(church_slug: str, db: AsyncIOMotorClient = Depends(get_db)):
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
async def instagram_callback(code: str, state: str, request: Request, db: AsyncIOMotorClient = Depends(get_db)):
    church_slug = state
    redirect_uri = f"{BASE_URL}/api/social/instagram/callback"
    
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
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        access_token = token_data["access_token"]
        user_id = token_data["user_id"]
        
        long_token_response = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": INSTAGRAM_APP_SECRET,
                "access_token": access_token
            }
        )
        
        if long_token_response.status_code == 200:
            long_token_data = long_token_response.json()
            access_token = long_token_data["access_token"]
            expires_in = long_token_data.get("expires_in", 5184000)
        else:
            expires_in = 3600
        
        user_response = await client.get(
            f"https://graph.instagram.com/{user_id}",
            params={"fields": "username", "access_token": access_token}
        )
        username = user_response.json().get("username", "")
        
        encrypted_token = encrypt_token(access_token)
        
        await db.churches.update_one(
            {"slug": church_slug},
            {
                "$set": {
                    "social_connections.instagram.connected": True,
                    "social_connections.instagram.username": username,
                    "social_connections.instagram.access_token": encrypted_token,
                    "social_connections.instagram.token_expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
                    "social_connections.instagram.last_synced": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    frontend_url = os.getenv("FRONTEND_URL", "https://churchnavigator.com")
    return RedirectResponse(f"{frontend_url}/dashboard?social=instagram_connected")

@router.get("/facebook/connect/{church_slug}")
async def facebook_connect(church_slug: str, db: AsyncIOMotorClient = Depends(get_db)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    redirect_uri = f"{BASE_URL}/api/social/facebook/callback"
    auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth"
        f"?client_id={FACEBOOK_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=pages_show_list,pages_read_engagement"
        f"&state={church_slug}"
    )
    return RedirectResponse(auth_url)

@router.get("/facebook/callback")
async def facebook_callback(code: str, state: str, request: Request, db: AsyncIOMotorClient = Depends(get_db)):
    church_slug = state
    redirect_uri = f"{BASE_URL}/api/social/facebook/callback"
    
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
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")
        
        token_data = token_response.json()
        user_access_token = token_data["access_token"]
        
        pages_response = await client.get(
            "https://graph.facebook.com/v18.0/me/accounts",
            params={"access_token": user_access_token}
        )
        
        pages_data = pages_response.json()
        if not pages_data.get("data"):
            raise HTTPException(status_code=400, detail="No Facebook pages found")
        
        page = pages_data["data"][0]
        page_id = page["id"]
        page_access_token = page["access_token"]
        
        long_token_response = await client.get(
            "https://graph.facebook.com/v18.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": FACEBOOK_APP_ID,
                "client_secret": FACEBOOK_APP_SECRET,
                "fb_exchange_token": page_access_token
            }
        )
        
        if long_token_response.status_code == 200:
            long_token_data = long_token_response.json()
            page_access_token = long_token_data["access_token"]
        
        encrypted_token = encrypt_token(page_access_token)
        
        await db.churches.update_one(
            {"slug": church_slug},
            {
                "$set": {
                    "social_connections.facebook.connected": True,
                    "social_connections.facebook.page_id": page_id,
                    "social_connections.facebook.access_token": encrypted_token,
                    "social_connections.facebook.token_expires_at": datetime.utcnow() + timedelta(days=60),
                    "social_connections.facebook.last_synced": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    frontend_url = os.getenv("FRONTEND_URL", "https://churchnavigator.com")
    return RedirectResponse(f"{frontend_url}/dashboard?social=facebook_connected")

@router.post("/sync/{church_slug}")
async def sync_social_posts(church_slug: str, db: AsyncIOMotorClient = Depends(get_db)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church_id = str(church["_id"])
    results = {"instagram": None, "facebook": None}
    
    async with httpx.AsyncClient() as client:
        if church.get("social_connections", {}).get("instagram", {}).get("connected"):
            ig_conn = church["social_connections"]["instagram"]
            try:
                access_token = decrypt_token(ig_conn["access_token"])
                
                me_response = await client.get(
                    "https://graph.instagram.com/me",
                    params={"fields": "id", "access_token": access_token}
                )
                user_id = me_response.json()["id"]
                
                media_response = await client.get(
                    f"https://graph.instagram.com/{user_id}/media",
                    params={
                        "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
                        "limit": 9,
                        "access_token": access_token
                    }
                )
                
                if media_response.status_code == 200:
                    media_data = media_response.json()
                    await db.social_posts.delete_many({"church_id": church_id, "platform": "instagram"})
                    
                    for post in media_data.get("data", []):
                        await db.social_posts.insert_one({
                            "church_id": church_id,
                            "platform": "instagram",
                            "post_id": post["id"],
                            "caption": post.get("caption", ""),
                            "image_url": post.get("media_url") if post.get("media_type") != "VIDEO" else post.get("thumbnail_url"),
                            "thumbnail_url": post.get("thumbnail_url"),
                            "permalink": post["permalink"],
                            "posted_at": datetime.fromisoformat(post["timestamp"].replace("Z", "+00:00")),
                            "synced_at": datetime.utcnow()
                        })
                    
                    await db.churches.update_one(
                        {"_id": church["_id"]},
                        {"$set": {"social_connections.instagram.last_synced": datetime.utcnow()}}
                    )
                    results["instagram"] = f"Synced {len(media_data.get('data', []))} posts"
            except Exception as e:
                results["instagram"] = f"Error: {str(e)}"
        
        if church.get("social_connections", {}).get("facebook", {}).get("connected"):
            fb_conn = church["social_connections"]["facebook"]
            try:
                access_token = decrypt_token(fb_conn["access_token"])
                page_id = fb_conn["page_id"]
                
                posts_response = await client.get(
                    f"https://graph.facebook.com/v18.0/{page_id}/posts",
                    params={
                        "fields": "id,message,full_picture,permalink_url,created_time",
                        "limit": 6,
                        "access_token": access_token
                    }
                )
                
                if posts_response.status_code == 200:
                    posts_data = posts_response.json()
                    await db.social_posts.delete_many({"church_id": church_id, "platform": "facebook"})
                    
                    for post in posts_data.get("data", []):
                        await db.social_posts.insert_one({
                            "church_id": church_id,
                            "platform": "facebook",
                            "post_id": post["id"],
                            "message": post.get("message", ""),
                            "image_url": post.get("full_picture"),
                            "permalink": post["permalink_url"],
                            "posted_at": datetime.fromisoformat(post["created_time"].replace("+0000", "+00:00")),
                            "synced_at": datetime.utcnow()
                        })
                    
                    await db.churches.update_one(
                        {"_id": church["_id"]},
                        {"$set": {"social_connections.facebook.last_synced": datetime.utcnow()}}
                    )
                    results["facebook"] = f"Synced {len(posts_data.get('data', []))} posts"
            except Exception as e:
                results["facebook"] = f"Error: {str(e)}"
    
    return results

@router.get("/posts/{church_slug}")
async def get_social_posts(church_slug: str, db: AsyncIOMotorClient = Depends(get_db)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church_id = str(church["_id"])
    posts = await db.social_posts.find(
        {"church_id": church_id}
    ).sort("posted_at", -1).to_list(length=100)
    
    for post in posts:
        post["_id"] = str(post["_id"])
        post["posted_at"] = post["posted_at"].isoformat()
        post["synced_at"] = post["synced_at"].isoformat()
    
    return {
        "instagram": [p for p in posts if p["platform"] == "instagram"][:9],
        "facebook": [p for p in posts if p["platform"] == "facebook"][:6]
    }

@router.delete("/disconnect/{church_slug}/{platform}")
async def disconnect_social(church_slug: str, platform: str, db: AsyncIOMotorClient = Depends(get_db)):
    if platform not in ["instagram", "facebook"]:
        raise HTTPException(status_code=400, detail="Invalid platform")
    
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church_id = str(church["_id"])
    
    await db.churches.update_one(
        {"slug": church_slug},
        {
            "$set": {
                f"social_connections.{platform}.connected": False,
                f"social_connections.{platform}.username": None,
                f"social_connections.{platform}.page_id": None,
                f"social_connections.{platform}.access_token": None,
                f"social_connections.{platform}.token_expires_at": None,
                f"social_connections.{platform}.last_synced": None
            }
        }
    )
    
    await db.social_posts.delete_many({"church_id": church_id, "platform": platform})
    
    return {"success": True, "message": f"{platform.capitalize()} disconnected"}