from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import os
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "fallback-dev-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_MINUTES", "10080"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    authorize_url="https://www.facebook.com/v18.0/dialog/oauth",
    access_token_url="https://graph.facebook.com/v18.0/oauth/access_token",
    userinfo_endpoint="https://graph.facebook.com/me?fields=id,name,email,picture",
    client_kwargs={"scope": "email public_profile"},
)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

def get_db():
    from database import db
    return db

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def find_or_create_user(db, email: str, name: str, auth_provider: str) -> dict:
    users = db.users
    user = users.find_one({"email": email})
    
    if user:
        if user.get("auth_provider") != auth_provider:
            users.update_one(
                {"_id": user["_id"]},
                {"$set": {"auth_provider": auth_provider, "updated_at": datetime.utcnow()}}
            )
        return user
    
    new_user = {
        "email": email,
        "name": name,
        "auth_provider": auth_provider,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    db = get_db()
    if db.users.find_one({"email": request.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = {
        "email": request.email,
        "name": request.name,
        "password": pwd_context.hash(request.password),
        "auth_provider": "email",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = db.users.insert_one(user)
    user_id = str(result.inserted_id)
    token = create_token(user_id, request.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": request.email, "name": request.name}
    }

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    db = get_db()
    user = db.users.find_one({"email": request.email})
    
    if not user or not user.get("password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    token = create_token(user_id, user["email"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": user["email"], "name": user.get("name", "")}
    }

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
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        db = get_db()
        user = find_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name", ""),
            auth_provider="google"
        )
        
        user_id = str(user["_id"])
        auth_token = create_token(user_id, user["email"])
        
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?token={auth_token}&email={user['email']}&name={user.get('name', '')}"
        )
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
        resp = await oauth.facebook.get("me?fields=id,name,email,picture", token=token)
        user_info = resp.json()
        
        if not user_info or not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Failed to get user info from Facebook")
        
        db = get_db()
        user = find_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name", ""),
            auth_provider="facebook"
        )
        
        user_id = str(user["_id"])
        auth_token = create_token(user_id, user["email"])
        
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?token={auth_token}&email={user['email']}&name={user.get('name', '')}"
        )
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=facebook_auth_failed")
