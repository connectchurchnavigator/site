from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
from bson import ObjectId
import os

from database import db
from auth import get_current_user
from email_service import send_email

router = APIRouter(prefix="/api/admin", tags=["admin"])

LISTING_TYPES = [
    "church",
    "pastor",
    "worship_leader",
    "media_team",
    "event",
    "bible_college"
]

class ApproveRequest(BaseModel):
    pass

class RejectRequest(BaseModel):
    reason: str

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/moderation-queue")
async def get_moderation_queue(admin: dict = Depends(get_admin_user)):
    queue = []
    
    for listing_type in LISTING_TYPES:
        collection_name = f"{listing_type}s" if listing_type != "media_team" else "media_teams"
        collection = db[collection_name]
        
        pending_listings = collection.find({"moderation_status": "pending"})
        
        for listing in pending_listings:
            user = None
            if listing.get("user_id"):
                user = db.users.find_one({"_id": ObjectId(listing["user_id"])})
            
            queue.append({
                "id": str(listing["_id"]),
                "type": listing_type,
                "name": listing.get("name") or listing.get("title") or listing.get("church_name") or "Untitled",
                "image": listing.get("image_url") or listing.get("logo_url") or listing.get("photo_url"),
                "location": listing.get("location") or listing.get("city"),
                "denomination": listing.get("denomination"),
                "created_at": listing.get("created_at"),
                "submitter_name": user.get("name") if user else "Unknown",
                "submitter_email": user.get("email") if user else "Unknown",
                "preview_data": {
                    "description": (listing.get("description") or listing.get("bio") or "")[:200],
                    "website": listing.get("website"),
                    "email": listing.get("email") or listing.get("contact_email"),
                    "phone": listing.get("phone") or listing.get("contact_phone")
                }
            })
    
    queue.sort(key=lambda x: x.get("created_at") or datetime.min, reverse=True)
    return {"queue": queue, "total": len(queue)}

@router.post("/moderation/{listing_type}/{listing_id}/approve")
async def approve_listing(listing_type: str, listing_id: str, admin: dict = Depends(get_admin_user)):
    if listing_type not in LISTING_TYPES:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_name = f"{listing_type}s" if listing_type != "media_team" else "media_teams"
    collection = db[collection_name]
    
    try:
        listing_oid = ObjectId(listing_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid listing ID")
    
    listing = collection.find_one({"_id": listing_oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    collection.update_one(
        {"_id": listing_oid},
        {"$set": {"moderation_status": "approved", "approved_at": datetime.utcnow()}}
    )
    
    if listing.get("user_id"):
        user = db.users.find_one({"_id": ObjectId(listing["user_id"])})
        if user and user.get("email"):
            listing_name = listing.get("name") or listing.get("title") or listing.get("church_name") or "Your listing"
            try:
                await send_email(
                    to_email=user["email"],
                    template_id="05",
                    template_data={
                        "user_name": user.get("name", "User"),
                        "listing_type": listing_type.replace("_", " ").title(),
                        "listing_name": listing_name,
                        "listing_url": f"https://churchnavigator.com/{listing_type}/{listing_id}"
                    }
                )
            except Exception as e:
                print(f"Email send failed: {e}")
    
    return {"success": True, "message": "Listing approved"}

@router.post("/moderation/{listing_type}/{listing_id}/reject")
async def reject_listing(
    listing_type: str,
    listing_id: str,
    reject_data: RejectRequest,
    admin: dict = Depends(get_admin_user)
):
    if listing_type not in LISTING_TYPES:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_name = f"{listing_type}s" if listing_type != "media_team" else "media_teams"
    collection = db[collection_name]
    
    try:
        listing_oid = ObjectId(listing_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid listing ID")
    
    listing = collection.find_one({"_id": listing_oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    collection.update_one(
        {"_id": listing_oid},
        {"$set": {
            "moderation_status": "rejected",
            "rejection_reason": reject_data.reason,
            "rejected_at": datetime.utcnow()
        }}
    )
    
    if listing.get("user_id"):
        user = db.users.find_one({"_id": ObjectId(listing["user_id"])})
        if user and user.get("email"):
            listing_name = listing.get("name") or listing.get("title") or listing.get("church_name") or "Your listing"
            try:
                await send_email(
                    to_email=user["email"],
                    template_id="12",
                    template_data={
                        "user_name": user.get("name", "User"),
                        "listing_type": listing_type.replace("_", " ").title(),
                        "listing_name": listing_name,
                        "rejection_reason": reject_data.reason,
                        "edit_url": f"https://churchnavigator.com/dashboard/listings"
                    }
                )
            except Exception as e:
                print(f"Email send failed: {e}")
    
    return {"success": True, "message": "Listing rejected"}
