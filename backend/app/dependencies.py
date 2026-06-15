from fastapi import Header, HTTPException

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    return {
        "user_id": "demo_user_123",
        "org_id": "demo_org_456"
    }