from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime
from models.user import User
from database import db
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_data = await db.users.find_one({"_id": user_id})
    if user_data is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_data)

async def require_premium_or_network(current_user: User = Depends(get_current_user)) -> User:
    if current_user.plan not in ["premium", "network", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Premium or Network plan required for this feature"
        )
    return current_user

async def require_network_plan(current_user: User = Depends(get_current_user)) -> User:
    if current_user.plan not in ["network", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Network plan required for this feature"
        )
    return current_user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.plan != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user
