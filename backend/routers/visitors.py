from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..database import get_database
from typing import Optional

router = APIRouter(prefix="/api/visitors", tags=["visitors"])

class VisitorCheckIn(BaseModel):
    church_id: str
    name: str
    phone: str
    email: Optional[str] = None
    whatsapp_opt_in: bool = False
    source: str = "qr_code"

@router.post("/checkin")
async def check_in_visitor(
    visitor: VisitorCheckIn,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    church = await db.churches.find_one({"_id": ObjectId(visitor.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visitor_doc = {
        "church_id": visitor.church_id,
        "name": visitor.name,
        "phone": visitor.phone,
        "email": visitor.email,
        "source": visitor.source,
        "checked_in_at": datetime.utcnow(),
        "whatsapp_opt_in": visitor.whatsapp_opt_in
    }
    
    result = await db.visitors.insert_one(visitor_doc)
    
    if visitor.whatsapp_opt_in:
        await db.follows.update_one(
            {"church_id": visitor.church_id, "phone": visitor.phone},
            {
                "$set": {
                    "church_id": visitor.church_id,
                    "phone": visitor.phone,
                    "whatsapp_opted_in": True,
                    "opted_in_at": datetime.utcnow()
                },
                "$setOnInsert": {"created_at": datetime.utcnow()}
            },
            upsert=True
        )
        
        from .whatsapp import send_whatsapp_message
        pastor_name = church.get("pastor_name", "the team")
        service_times = church.get("service_times", [])
        service_time = service_times[0].get("time") if service_times else "soon"
        
        welcome_msg = f"""Welcome to {church['name']}! 🙏

We're so glad you're here, {visitor.name}!

Your pastor {pastor_name} looks forward to meeting you. Service starts at {service_time}.

See you soon!"""
        
        try:
            background_tasks.add_task(send_whatsapp_message, visitor.phone, welcome_msg)
        except:
            pass
    
    await db.churches.update_one(
        {"_id": ObjectId(visitor.church_id)},
        {"$inc": {"visitor_count": 1}}
    )
    
    return {
        "success": True,
        "visitor_id": str(result.inserted_id),
        "welcome_message_sent": visitor.whatsapp_opt_in
    }

@router.get("/church/{church_id}")
async def get_church_visitors(church_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    visitors = await db.visitors.find(
        {"church_id": church_id}
    ).sort("checked_in_at", -1).limit(100).to_list(100)
    
    return {
        "visitors": [
            {
                "id": str(v["_id"]),
                "name": v["name"],
                "phone": v["phone"],
                "email": v.get("email"),
                "checked_in_at": v["checked_in_at"].isoformat(),
                "source": v.get("source", "qr_code"),
                "whatsapp_opt_in": v.get("whatsapp_opt_in", False)
            }
            for v in visitors
        ]
    }
