from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from datetime import datetime
from bson import ObjectId
from database import db
from services.email_service import send_email
from dependencies import get_current_user

router = APIRouter(prefix="/api/followups", tags=["followups"])

@router.get("/church/{church_id}", response_model=List[Dict])
async def get_church_followups(
    church_id: str,
    status: str = "pending",
    current_user: Dict = Depends(get_current_user)
):
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    query = {"church_id": church_id}
    if status:
        query["status"] = status
    
    followups = await db.followup_queue.find(query).sort("generated_at", -1).to_list(length=100)
    
    for followup in followups:
        followup["id"] = str(followup.pop("_id"))
    
    return followups

@router.post("/{followup_id}/send")
async def send_followup(
    followup_id: str,
    current_user: Dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if not followup.get("visitor_email"):
        raise HTTPException(status_code=400, detail="Visitor email not available")
    
    try:
        await send_email(
            to_email=followup["visitor_email"],
            subject=f"Thank you for visiting {church['name']}",
            template="visitor_followup",
            context={
                "visitor_name": followup["visitor_name"],
                "church_name": church["name"],
                "message": followup["message"]
            }
        )
        
        await db.followup_queue.update_one(
            {"_id": ObjectId(followup_id)},
            {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
        )
        
        return {"message": "Followup email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{followup_id}")
async def update_followup(
    followup_id: str,
    message: str,
    current_user: Dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.followup_queue.update_one(
        {"_id": ObjectId(followup_id)},
        {"$set": {"message": message}}
    )
    
    return {"message": "Followup updated successfully"}

@router.delete("/{followup_id}")
async def dismiss_followup(
    followup_id: str,
    current_user: Dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(followup_id):
        raise HTTPException(status_code=400, detail="Invalid followup ID")
    
    followup = await db.followup_queue.find_one({"_id": ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail="Followup not found")
    
    church = await db.churches.find_one({"_id": ObjectId(followup["church_id"])})
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.followup_queue.update_one(
        {"_id": ObjectId(followup_id)},
        {"$set": {"status": "dismissed"}}
    )
    
    return {"message": "Followup dismissed"}