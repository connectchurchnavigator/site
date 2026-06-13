from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from bson import ObjectId

from ..auth import get_current_user
from ..database import db

router = APIRouter(prefix="/api/users", tags=["users"])

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None

class NotificationPreferences(BaseModel):
    weekly_digest: bool = True
    event_reminders: bool = True
    new_follower_alerts: bool = True
    prayer_responses: bool = True
    digest_frequency: str = "weekly"

@router.get("/me/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    saved_churches_count = await db.user_saved_churches.count_documents({"user_id": str(user_id)})
    
    events_attended = await db.event_registrations.count_documents({
        "user_id": str(user_id),
        "status": "confirmed"
    })
    
    prayers_offered = await db.event_prayer_requests.count_documents({
        "prayers.user_id": str(user_id)
    })
    
    recent_activity = []
    
    recent_saves = await db.user_saved_churches.find(
        {"user_id": str(user_id)}
    ).sort("created_at", -1).limit(3).to_list(length=3)
    
    for save in recent_saves:
        church = await db.churches.find_one({"_id": ObjectId(save["church_id"])})
        if church:
            recent_activity.append({
                "type": "saved_church",
                "timestamp": save["created_at"],
                "data": {
                    "church_name": church.get("name"),
                    "church_id": save["church_id"]
                }
            })
    
    recent_events = await db.event_registrations.find(
        {"user_id": str(user_id), "status": "confirmed"}
    ).sort("registered_at", -1).limit(3).to_list(length=3)
    
    for reg in recent_events:
        event = await db.events.find_one({"_id": ObjectId(reg["event_id"])})
        if event:
            recent_activity.append({
                "type": "registered_event",
                "timestamp": reg["registered_at"],
                "data": {
                    "event_title": event.get("title"),
                    "event_id": reg["event_id"],
                    "event_date": event.get("start_datetime")
                }
            })
    
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = recent_activity[:5]
    
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return {
        "user": {
            "_id": str(user_id),
            "name": user_data.get("name", "User"),
            "email": user_data.get("email"),
            "photo_url": user_data.get("photo_url"),
            "created_at": user_data.get("created_at"),
            "notification_preferences": user_data.get("notification_preferences", {
                "weekly_digest": True,
                "event_reminders": True,
                "new_follower_alerts": True,
                "prayer_responses": True,
                "digest_frequency": "weekly"
            })
        },
        "stats": {
            "churches_followed": saved_churches_count,
            "events_attended": events_attended,
            "prayers_offered": prayers_offered
        },
        "recent_activity": recent_activity
    }

@router.get("/me/saved-churches")
async def get_saved_churches(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    saved = await db.user_saved_churches.find(
        {"user_id": str(user_id)}
    ).sort("created_at", -1).to_list(length=100)
    
    churches = []
    for save in saved:
        church = await db.churches.find_one({"_id": ObjectId(save["church_id"])})
        if church:
            churches.append({
                "_id": str(church["_id"]),
                "name": church.get("name"),
                "denomination": church.get("denomination"),
                "city": church.get("city"),
                "county": church.get("county"),
                "image_url": church.get("image_url"),
                "slug": church.get("slug"),
                "saved_at": save["created_at"]
            })
    
    return {"churches": churches}

@router.get("/me/registered-events")
async def get_registered_events(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    registrations = await db.event_registrations.find(
        {"user_id": str(user_id), "status": "confirmed"}
    ).sort("registered_at", -1).to_list(length=100)
    
    upcoming = []
    past = []
    now = datetime.utcnow()
    
    for reg in registrations:
        event = await db.events.find_one({"_id": ObjectId(reg["event_id"])})
        if not event:
            continue
        
        church = await db.churches.find_one({"_id": ObjectId(event["church_id"])})
        
        review_exists = await db.event_reviews.find_one({
            "event_id": reg["event_id"],
            "user_id": str(user_id)
        })
        
        event_data = {
            "_id": str(event["_id"]),
            "title": event.get("title"),
            "start_datetime": event.get("start_datetime"),
            "end_datetime": event.get("end_datetime"),
            "image_url": event.get("image_url"),
            "church_name": church.get("name") if church else "Unknown Church",
            "church_slug": church.get("slug") if church else None,
            "registration_id": str(reg["_id"]),
            "registered_at": reg["registered_at"],
            "has_reviewed": review_exists is not None,
            "qr_code": reg.get("qr_code")
        }
        
        event_end = event.get("end_datetime", event.get("start_datetime"))
        if event_end and event_end > now:
            upcoming.append(event_data)
        else:
            past.append(event_data)
    
    return {
        "upcoming": upcoming,
        "past": past
    }

@router.get("/me/prayer-history")
async def get_prayer_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    submitted_requests = await db.event_prayer_requests.find(
        {"user_id": str(user_id)}
    ).sort("created_at", -1).to_list(length=50)
    
    prayers_offered_cursor = await db.event_prayer_requests.find(
        {"prayers.user_id": str(user_id)}
    ).sort("created_at", -1).to_list(length=50)
    
    submitted = []
    for req in submitted_requests:
        event = await db.events.find_one({"_id": ObjectId(req["event_id"])})
        submitted.append({
            "_id": str(req["_id"]),
            "request_text": req.get("request_text"),
            "is_anonymous": req.get("is_anonymous", False),
            "prayer_count": len(req.get("prayers", [])),
            "created_at": req.get("created_at"),
            "event_title": event.get("title") if event else "Unknown Event",
            "event_id": req.get("event_id")
        })
    
    offered = []
    for req in prayers_offered_cursor:
        user_prayer = next((p for p in req.get("prayers", []) if p.get("user_id") == str(user_id)), None)
        if user_prayer:
            event = await db.events.find_one({"_id": ObjectId(req["event_id"])})
            offered.append({
                "request_id": str(req["_id"]),
                "request_text": req.get("request_text"),
                "prayed_at": user_prayer.get("created_at"),
                "event_title": event.get("title") if event else "Unknown Event",
                "event_id": req.get("event_id")
            })
    
    return {
        "submitted": submitted,
        "offered": offered
    }

@router.put("/me/profile")
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["_id"]
    
    update_data = {}
    if profile_update.name is not None:
        update_data["name"] = profile_update.name
    if profile_update.photo_url is not None:
        update_data["photo_url"] = profile_update.photo_url
    if profile_update.notification_preferences is not None:
        update_data["notification_preferences"] = profile_update.notification_preferences
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return {
        "success": True,
        "user": {
            "_id": str(updated_user["_id"]),
            "name": updated_user.get("name"),
            "email": updated_user.get("email"),
            "photo_url": updated_user.get("photo_url"),
            "notification_preferences": updated_user.get("notification_preferences")
        }
    }

@router.post("/me/saved-churches/{church_id}")
async def save_church(church_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    existing = await db.user_saved_churches.find_one({
        "user_id": str(user_id),
        "church_id": church_id
    })
    
    if existing:
        return {"success": True, "message": "Already saved"}
    
    await db.user_saved_churches.insert_one({
        "user_id": str(user_id),
        "church_id": church_id,
        "created_at": datetime.utcnow()
    })
    
    return {"success": True, "message": "Church saved"}

@router.delete("/me/saved-churches/{church_id}")
async def unsave_church(church_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    
    result = await db.user_saved_churches.delete_one({
        "user_id": str(user_id),
        "church_id": church_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved church not found")
    
    return {"success": True, "message": "Church unsaved"}