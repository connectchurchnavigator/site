from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
import os
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_MINUTES", "43200"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="facebook",
    client_id=os.getenv("FACEBOOK_APP_ID"),
    client_secret=os.getenv("FACEBOOK_APP_SECRET"),
    authorize_url="https://www.facebook.com/v12.0/dialog/oauth",
    access_token_url="https://graph.facebook.com/v12.0/oauth/access_token",
    client_kwargs={"scope": "email public_profile"},
)

class UserResponse(BaseModel):
    token: str
    user: dict

def create_jwt_token(user_data: dict) -> str:
    expires = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION)
    payload = {
        "sub": str(user_data["_id"]),
        "email": user_data["email"],
        "exp": expires
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_or_create_user(db, email: str, name: str, provider: str) -> dict:
    users = db["users"]
    user = users.find_one({"email": email})
    
    if user:
        if user.get("auth_provider") != provider:
            users.update_one(
                {"_id": user["_id"]},
                {"$set": {"auth_provider": provider, "updated_at": datetime.utcnow()}}
            )
        return user
    
    new_user = {
        "email": email,
        "name": name,
        "auth_provider": provider,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    result = users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{request.base_url}api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        
        if not user_info or not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        db = request.app.mongodb
        user = await get_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name", user_info["email"]),
            provider="google"
        )
        
        jwt_token = create_jwt_token(user)
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

@router.get("/facebook/login")
async def facebook_login(request: Request):
    redirect_uri = f"{request.base_url}api/auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(request, redirect_uri)

@router.get("/facebook/callback")
async def facebook_callback(request: Request):
    try:
        token = await oauth.facebook.authorize_access_token(request)
        
        resp = await oauth.facebook.get(
            "https://graph.facebook.com/me?fields=id,name,email",
            token=token
        )
        user_info = resp.json()
        
        if not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Email not provided by Facebook")
        
        db = request.app.mongodb
        user = await get_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name", user_info["email"]),
            provider="facebook"
        )
        
        jwt_token = create_jwt_token(user)
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=facebook_auth_failed}")

@router.post("/login")
async def login(request: Request, email: str, password: str):
    raise HTTPException(status_code=501, detail="Email/password login not yet implemented")