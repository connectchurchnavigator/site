from fastapi import HTTPException, Header, Depends
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_plan(required_plan: str):
    async def plan_checker(current_user: dict = Depends(get_current_user)):
        user_plan = current_user.get("plan", "free")
        plans = ["free", "standard", "premium"]
        
        if plans.index(user_plan) < plans.index(required_plan):
            raise HTTPException(
                status_code=403,
                detail=f"This feature requires {required_plan} plan or higher"
            )
        return True
    return plan_checker

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=30)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
