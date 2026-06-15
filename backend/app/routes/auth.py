from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os
from app.models.user import User, UserCreate, UserLogin, Token

router = APIRouter(prefix="/auth", tags=["authentication"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
oauth.register(
    name='facebook',
    client_id=os.getenv('FACEBOOK_APP_ID'),
    client_secret=os.getenv('FACEBOOK_APP_SECRET'),
    authorize_url='https://www.facebook.com/dialog/oauth',
    access_token_url='https://graph.facebook.com/oauth/access_token',
    client_kwargs={'scope': 'email public_profile'}
)

def get_db():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    return client[os.getenv('MONGODB_DB_NAME')]

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=int(os.getenv('JWT_EXPIRATION_MINUTES', 10080)))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv('JWT_SECRET_KEY'), algorithm=os.getenv('JWT_ALGORITHM', 'HS256'))

async def find_or_create_user(db, email: str, full_name: str, provider: str, provider_id: str):
    users = db.users
    user = await users.find_one({"email": email})
    if user:
        await users.update_one(
            {"email": email},
            {"$set": {"auth_provider": provider, "provider_id": provider_id}}
        )
        user['_id'] = str(user['_id'])
        return user
    new_user = {
        "email": email,
        "full_name": full_name,
        "auth_provider": provider,
        "provider_id": provider_id,
        "hashed_password": None,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    result = await users.insert_one(new_user)
    new_user['_id'] = str(result.inserted_id)
    return new_user

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(user_data.password)
    new_user = {
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "auth_provider": "email",
        "provider_id": None,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    result = await db.users.insert_one(new_user)
    token = create_access_token({"sub": user_data.email, "user_id": str(result.inserted_id)})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user_data.email, "full_name": user_data.full_name}}

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": user_data.email})
    if not user or not user.get('hashed_password') or not pwd_context.verify(user_data.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user['email'], "user_id": str(user['_id'])})
    return {"access_token": token, "token_type": "bearer", "user": {"email": user['email'], "full_name": user.get('full_name')}}

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{os.getenv('BACKEND_URL')}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        db = get_db()
        user = await find_or_create_user(
            db,
            email=user_info['email'],
            full_name=user_info.get('name', ''),
            provider='google',
            provider_id=user_info['sub']
        )
        access_token = create_access_token({"sub": user['email'], "user_id": user['_id']})
        frontend_url = os.getenv('FRONTEND_URL')
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={access_token}")
    except Exception as e:
        return RedirectResponse(url=f"{os.getenv('FRONTEND_URL')}/login?error=google_auth_failed")

@router.get("/facebook/login")
async def facebook_login(request: Request):
    redirect_uri = f"{os.getenv('BACKEND_URL')}/api/auth/facebook/callback"
    return await oauth.facebook.authorize_redirect(request, redirect_uri)

@router.get("/facebook/callback")
async def facebook_callback(request: Request):
    try:
        token = await oauth.facebook.authorize_access_token(request)
        resp = await oauth.facebook.get('https://graph.facebook.com/me?fields=id,name,email', token=token)
        user_info = resp.json()
        if not user_info.get('email'):
            raise HTTPException(status_code=400, detail="Email not provided by Facebook")
        db = get_db()
        user = await find_or_create_user(
            db,
            email=user_info['email'],
            full_name=user_info.get('name', ''),
            provider='facebook',
            provider_id=user_info['id']
        )
        access_token = create_access_token({"sub": user['email'], "user_id": user['_id']})
        frontend_url = os.getenv('FRONTEND_URL')
        return RedirectResponse(url=f"{frontend_url}/auth/callback?token={access_token}")
    except Exception as e:
        return RedirectResponse(url=f"{os.getenv('FRONTEND_URL')}/login?error=facebook_auth_failed")