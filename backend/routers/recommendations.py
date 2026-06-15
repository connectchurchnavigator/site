from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from database import get_database
from services.ai_automation_service import AIAutomationService
from auth import get_current_user

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

@router.get("/events/{user_id}", response_model=List[Dict])
async def get_event_recommendations(
    user_id: str,
    limit: int = 5,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    ai_service = AIAutomationService(db)
    recommendations = await ai_service.get_event_recommendations(user_id, limit)
    return recommendations

@router.get("/events", response_model=List[Dict])
async def get_my_event_recommendations(
    limit: int = 5,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    ai_service = AIAutomationService(db)
    recommendations = await ai_service.get_event_recommendations(current_user["id"], limit)
    return recommendations
