from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os
from pymongo import MongoClient
import secrets

router = APIRouter(prefix="/api/auth", tags=["auth"])

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "10080"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]
users_collection = db["users"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"}
)

oauth.register(
    name="facebook",
    client_id=os.getenv("FACEBOOK_APP_ID"),
    client_secret=os.getenv("FACEBOOK_APP_SECRET"),
    authorize_url="https://www.facebook.com/v18.0/dialog/oauth",
    authorize_params=None,
    access_token_url="https://graph.facebook.com/v18.0/oauth/access_token",
    access_token_params=None,
    client_kwargs={"scope": "email public_profile"}
)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def find_or_create_user(email: str, name: str, provider: str, provider_id: str):
    user = users_collection.find_one({"email": email})
    
    if user:
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        return user
    
    new_user = {
        "email": email,
        "name": name,
        "auth_provider": provider,
        "provider_id": provider_id,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "role": "user"
    }
    result = users_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{os.getenv('OAUTH_REDIRECT_URI')}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        
        if not user_info or not user_info.get("email"):
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        user = find_or_create_user(
            email=user_info["email"],
            name=user_info.get("name", ""),
            provider="google",
            provider_id=user_info["sub"]
        )
        
        access_token = create_access_token({
            "sub": user["email"],
            "user_id": str(user["_id"]),
            "role": user.get("role", "user")
        })
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={access_token}")
    
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")

@router.get("/facebook/login")
async def facebook_login(request: Request):
    redirect_uri = f"{os.getenv('OAUTH_REDIRECT_URI')}/api/auth/facebook/callback"
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
        
        user = find_or_create_user(
            email=user_info["email"],
            name=user_info.get("name", ""),
            provider="facebook",
            provider_id=user_info["id"]
        )
        
        access_token = create_access_token({
            "sub": user["email"],
            "user_id": str(user["_id"]),
            "role": user.get("role", "user")
        })
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={access_token}")
    
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=facebook_auth_failed}")

@router.post("/register")
async def register(email: str, password: str, name: str):
    existing = users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(password)
    user = {
        "email": email,
        "name": name,
        "password": hashed_password,
        "auth_provider": "email",
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "role": "user"
    }
    result = users_collection.insert_one(user)
    
    access_token = create_access_token({
        "sub": email,
        "user_id": str(result.inserted_id),
        "role": "user"
    })
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login")
async def login(email: str, password: str):
    user = users_collection.find_one({"email": email})
    if not user or not user.get("password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token = create_access_token({
        "sub": email,
        "user_id": str(user["_id"]),
        "role": user.get("role", "user")
    })
    
    return {"access_token": access_token, "token_type": "bearer"}