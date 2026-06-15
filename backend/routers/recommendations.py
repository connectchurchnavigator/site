from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from services.ai_automation_service import ai_service
from dependencies import get_current_user

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/events/{user_id}", response_model=List[Dict])
async def get_event_recommendations(
    user_id: str,
    limit: int = 5,
    current_user: Dict = Depends(get_current_user)
):
    if str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        recommendations = await ai_service.get_event_recommendations(user_id, limit)
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))