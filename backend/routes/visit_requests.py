from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId
from backend.dependencies import get_current_user, get_database
from backend.services.planner_subscription_service import PlannerSubscriptionService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/planner", tags=["visit_requests"])

class VisitRequest(BaseModel):
    church_id: str
    trip_id: str
    message: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None

@router.post("/visit-requests")
async def create_visit_request(
    request: VisitRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = PlannerSubscriptionService(db)
    
    can_send = await service.check_visit_request_limit(str(current_user["_id"]))
    
    if not can_send:
        user = await db.users.find_one({"_id": ObjectId(str(current_user["_id"]))})
        planner_sub = user.get("planner_subscription", {})
        
        recent_requests = await db.visit_requests.find(
            {"user_id": str(current_user["_id"])}
        ).sort("created_at", -1).limit(3).to_list(3)
        
        raise HTTPException(
            status_code=402,
            detail={
                "error": "visit_request_limit_reached",
                "message": "You have reached your 3 free visit requests this month",
                "current_count": planner_sub.get("visit_requests_this_month", 0),
                "limit": 3,
                "reset_date": planner_sub.get("visit_requests_reset_date").isoformat() if planner_sub.get("visit_requests_reset_date") else None,
                "recent_requests": [
                    {
                        "church_name": req.get("church_name"),
                        "status": req.get("status"),
                        "created_at": req.get("created_at").isoformat() if req.get("created_at") else None
                    } for req in recent_requests
                ],
                "upgrade_url": "/planner/pricing"
            }
        )
    
    church = await db.churches.find_one({"_id": ObjectId(request.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visit_request_doc = {
        "user_id": str(current_user["_id"]):
        "church_id": request.church_id,
        "church_name": church.get("name"),
        "trip_id": request.trip_id,
        "message": request.message,
        "preferred_date": request.preferred_date,
        "preferred_time": request.preferred_time,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.visit_requests.insert_one(visit_request_doc)
    
    await service.increment_visit_request(str(current_user["_id"]))
    
    return {
        "id": str(result.inserted_id),
        "status": "pending",
        "message": "Visit request sent successfully"
    }

@router.get("/visit-requests")
async def get_visit_requests(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    requests = await db.visit_requests.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(100)
    
    for req in requests:
        req["id"] = str(req.pop("_id"))
        if "created_at" in req:
            req["created_at"] = req["created_at"].isoformat()
        if "updated_at" in req:
            req["updated_at"] = req["updated_at"].isoformat()
    
    return {"requests": requests}
