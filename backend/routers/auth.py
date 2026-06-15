from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from authlib.integrations.starlette_client import OAuth
import httpx
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/auth", tags=["auth"])

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "DEV-ChurchNavigator")
JWT_SECRET = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_MINUTES", "43200"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DATABASE_NAME]
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
    authorize_url="https://www.facebook.com/v12.0/dialog/oauth",
    access_token_url="https://graph.facebook.com/v12.0/oauth/access_token",
    client_kwargs={"scope": "email public_profile"},
)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def find_or_create_user(email: str, full_name: str, auth_provider: str) -> dict:
    users_collection = db["users"]
    user = await users_collection.find_one({"email": email})
    
    if user:
        if user.get("auth_provider") != auth_provider:
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"auth_provider": auth_provider, "updated_at": datetime.utcnow()}}
            )
        return user
    
    new_user = {
        "email": email,
        "full_name": full_name,
        "auth_provider": auth_provider,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    result = await users_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user

@router.post("/register")
async def register(user_data: UserRegister):
    users_collection = db["users"]
    existing = await users_collection.find_one({"email": user_data.email})
    
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data.password)
    new_user = {
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "auth_provider": "email",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    result = await users_collection.insert_one(new_user)
    token = create_access_token(str(result.inserted_id), user_data.email)
    
    return {"access_token": token, "token_type": "bearer", "user": {"email": user_data.email, "full_name": user_data.full_name}}

@router.post("/login")
async def login(credentials: UserLogin):
    users_collection = db["users"]
    user = await users_collection.find_one({"email": credentials.email})
    
    if not user or not user.get("password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(str(user["_id"]), user["email"])
    return {"access_token": token, "token_type": "bearer", "user": {"email": user["email"], "full_name": user.get("full_name", "")}}

@router.get("/google/login")
async def google_login():
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(redirect_uri)

@router.get("/google/callback")
async def google_callback(code: str):
    try:
        redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/auth/google/callback"
        token = await oauth.google.authorize_access_token(redirect_uri=redirect_uri)
        user_info = token.get("userinfo")
        
        if not user_info or not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        email = user_info["email"]
        full_name = user_info.get("name", email.split("@")[0])
        
        user = await find_or_create_user(email, full_name, "google")
        jwt_token = create_access_token(str(user["_id"]), email)
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

@router.get("/facebook/login")
async def facebook_login():
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(redirect_uri)

@router.get("/facebook/callback")
async def facebook_callback(code: str):
    try:
        redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/auth/facebook/callback"
        token = await oauth.facebook.authorize_access_token(redirect_uri=redirect_uri)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.facebook.com/me",
                params={"fields": "id,name,email", "access_token": token["access_token"]}
            )
            user_info = response.json()
        
        if not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Email permission required")
        
        email = user_info["email"]
        full_name = user_info.get("name", email.split("@")[0])
        
        user = await find_or_create_user(email, full_name, "facebook")
        jwt_token = create_access_token(str(user["_id"]), email)
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=facebook_auth_failed")
