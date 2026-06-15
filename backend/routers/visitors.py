from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from database import get_database
from bson import ObjectId
from datetime import datetime
from services.ai_automation_service import AIAutomationService
from auth import get_current_user

router = APIRouter(prefix="/api/visitors", tags=["visitors"])

class VisitorCheckIn(BaseModel):
    church_id: str
    visitor_name: str
    visitor_email: Optional[EmailStr] = None
    visitor_phone: Optional[str] = None
    journey_stage: Optional[str] = "first_visit"
    notes: Optional[str] = None

class VisitorUpdate(BaseModel):
    journey_stage: Optional[str] = None
    notes: Optional[str] = None
    contact_preferences: Optional[dict] = None

@router.post("/check-in", status_code=201)
async def check_in_visitor(
    checkin: VisitorCheckIn,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(checkin.church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(checkin.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    existing_visitor = None
    if checkin.visitor_email:
        existing_visitor = await db.visitors.find_one({
            "church_id": checkin.church_id,
            "email": checkin.visitor_email
        })
    
    if existing_visitor:
        visitor_id = str(existing_visitor["_id"])
        await db.visitors.update_one(
            {"_id": ObjectId(visitor_id)},
            {
                "$inc": {"total_visits": 1},
                "$set": {
                    "last_visit": datetime.utcnow(),
                    "journey_stage": checkin.journey_stage
                }
            }
        )
    else:
        visitor_dict = {
            "church_id": checkin.church_id,
            "name": checkin.visitor_name,
            "email": checkin.visitor_email,
            "phone": checkin.visitor_phone,
            "journey_stage": checkin.journey_stage or "first_visit",
            "first_visit": datetime.utcnow(),
            "last_visit": datetime.utcnow(),
            "total_visits": 1,
            "notes": checkin.notes or "",
            "created_at": datetime.utcnow()
        }
        result = await db.visitors.insert_one(visitor_dict)
        visitor_id = str(result.inserted_id)
    
    checkin_record = {
        "church_id": checkin.church_id,
        "visitor_id": visitor_id,
        "checked_in_at": datetime.utcnow(),
        "checked_in_by": current_user["id"],
        "journey_stage": checkin.journey_stage,
        "notes": checkin.notes
    }
    await db.visitor_checkins.insert_one(checkin_record)
    
    if not existing_visitor and checkin.journey_stage == "first_visit":
        ai_service = AIAutomationService(db)
        await ai_service.generate_newcomer_followup(
            checkin.church_id,
            visitor_id,
            checkin.visitor_name
        )
    
    return {
        "visitor_id": visitor_id,
        "message": "Visitor checked in successfully",
        "is_new_visitor": not existing_visitor
    }

@router.get("/{church_id}")
async def get_church_visitors(
    church_id: str,
    journey_stage: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"church_id": church_id}
    if journey_stage:
        query["journey_stage"] = journey_stage
    
    visitors = await db.visitors.find(query).sort("last_visit", -1).skip(skip).limit(limit).to_list(None)
    total = await db.visitors.count_documents(query)
    
    for visitor in visitors:
        visitor["_id"] = str(visitor["_id"])
    
    return {"visitors": visitors, "total": total}

@router.get("/{church_id}/followup-queue")
async def get_followup_queue(
    church_id: str,
    status: Optional[str] = "pending",
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"church_id": church_id}
    if status:
        query["status"] = status
    
    followups = await db.followup_queue.find(query).sort("generated_at", -1).to_list(None)
    
    for followup in followups:
        followup["_id"] = str(followup["_id"])
    
    return {"followups": followups}

@router.post("/followup/{followup_id}/send")
async def send_followup(
    followup_id: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    visitor = await db.visitors.find_one({"_id": ObjectId(followup["visitor_id"])})
    if not visitor or not visitor.get("email"):
        raise HTTPException(status_code=400, detail="Visitor email not available")
    
    from services.email_service import EmailService
    email_service = EmailService()
    
    email_sent = await email_service.send_followup_message(
        to_email=visitor["email"],
        visitor_name=visitor["name"],
        church_name=church["name"],
        message=followup["message"]
    )
    
    if email_sent:
        await db.followup_queue.update_one(
            {"_id": ObjectId(followup_id)},
            {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
        )
        return {"message": "Followup sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

@router.put("/followup/{followup_id}")
async def update_followup(
    followup_id: str,
    message: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.followup_queue.update_one(
        {"_id": ObjectId(followup_id)},
        {"$set": {"message": message, "edited_at": datetime.utcnow()}}
    )
    
    return {"message": "Followup updated successfully"}

@router.delete("/followup/{followup_id}")
async def dismiss_followup(
    followup_id: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.followup_queue.update_one(
        {"_id": ObjectId(followup_id)},
        {"$set": {"status": "dismissed", "dismissed_at": datetime.utcnow()}}
    )
    
    return {"message": "Followup dismissed"}
