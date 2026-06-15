from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from bson import ObjectId
from database import db
from services.ai_automation_service import ai_service
from dependencies import get_current_user

router = APIRouter(prefix="/api/visitors", tags=["visitors"])

class VisitorCheckin(BaseModel):
    church_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    journey_stage: str = "first_visit"

@router.post("/checkin", response_model=Dict)
async def checkin_visitor(checkin: VisitorCheckin):
    if not ObjectId.is_valid(checkin.church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(checkin.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visitor = await db.visitors.find_one({
        "church_id": checkin.church_id,
        "email": checkin.email
    })
    
    if visitor:
        await db.visitors.update_one(
            {"_id": visitor["_id"]},
            {
                "$inc": {"total_visits": 1},
                "$set": {"last_visit": datetime.utcnow()}
            }
        )
        visitor_id = str(visitor["_id"])
        is_first_visit = False
    else:
        visitor_doc = {
            "church_id": checkin.church_id,
            "name": checkin.name,
            "email": checkin.email,
            "phone": checkin.phone,
            "journey_stage": checkin.journey_stage,
            "total_visits": 1,
            "first_visit": datetime.utcnow(),
            "last_visit": datetime.utcnow()
        }
        result = await db.visitors.insert_one(visitor_doc)
        visitor_id = str(result.inserted_id)
        is_first_visit = True
    
    checkin_doc = {
        "church_id": checkin.church_id,
        "visitor_id": visitor_id,
        "created_at": datetime.utcnow()
    }
    await db.visitor_checkins.insert_one(checkin_doc)
    
    if is_first_visit and checkin.email:
        await ai_service.generate_newcomer_followup(visitor_id, checkin.church_id)
    
    return {
        "visitor_id": visitor_id,
        "is_first_visit": is_first_visit,
        "message": "Check-in successful"
    }

@router.get("/church/{church_id}", response_model=List[Dict])
async def get_church_visitors(
    church_id: str,
    current_user: Dict = Depends(get_current_user)
):
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    visitors = await db.visitors.find({"church_id": church_id}).sort("last_visit", -1).to_list(length=200)
    
    for visitor in visitors:
        visitor["id"] = str(visitor.pop("_id"))
    
    return visitors