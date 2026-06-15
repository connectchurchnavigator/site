from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from typing import Optional
import os
import httpx
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.base_client import OAuthError

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-key-min-32-characters")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_MINUTES", "10080"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

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
    client_kwargs={"scope": "email public_profile"},
)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

def create_jwt_token(user_data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION)
    to_encode = {"sub": str(user_data["_id"]), "email": user_data["email"], "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_user_dict(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]),
        "email": user_doc["email"],
        "name": user_doc["name"],
        "auth_provider": user_doc.get("auth_provider", "email"),
        "created_at": user_doc.get("created_at", ""),
    }

async def find_or_create_oauth_user(db, email: str, name: str, provider: str) -> dict:
    users_collection = db["users"]
    user = await users_collection.find_one({"email": email})
    
    if not user:
        user_doc = {
            "email": email,
            "name": name,
            "auth_provider": provider,
            "created_at": datetime.utcnow().isoformat(),
            "password_hash": None,
        }
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return user_doc
    
    if user.get("auth_provider") != provider:
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"auth_provider": provider}}
        )
        user["auth_provider"] = provider
    
    return user

@router.post("/register", response_model=Token)
async def register(user: UserRegister, request: Request):
    db = request.app.mongodb
    users_collection = db["users"]
    
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": user.email,
        "name": user.name,
        "password_hash": pwd_context.hash(user.password),
        "auth_provider": "email",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    token = create_jwt_token(user_doc)
    return Token(access_token=token, token_type="bearer", user=get_user_dict(user_doc))

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    db = request.app.mongodb
    users_collection = db["users"]
    
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user)
    return Token(access_token=token, token_type="bearer", user=get_user_dict(user))

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        email = user_info.get("email")
        name = user_info.get("name", email.split("@")[0])
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        db = request.app.mongodb
        user = await find_or_create_oauth_user(db, email, name, "google")
        jwt_token = create_jwt_token(user)
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    
    except OAuthError as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed")

@router.get("/facebook/login")
async def facebook_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(request, redirect_uri)

@router.get("/facebook/callback")
async def facebook_callback(request: Request):
    try:
        token = await oauth.facebook.authorize_access_token(request)
        access_token = token.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.facebook.com/me?fields=email,name&access_token={access_token}"
            )
            user_info = response.json()
        
        email = user_info.get("email")
        name = user_info.get("name", "Facebook User")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Facebook")
        
        db = request.app.mongodb
        user = await find_or_create_oauth_user(db, email, name, "facebook")
        jwt_token = create_jwt_token(user)
        
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}")
    
    except OAuthError as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed")

@router.get("/me")
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        from bson import ObjectId
        db = request.app.mongodb
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return get_user_dict(user)
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")