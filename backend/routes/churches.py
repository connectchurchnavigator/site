from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
from models import Church, VisitPreferences
from database import db
from auth import get_current_user
from geopy.distance import geodesic
import math

router = APIRouter()

@router.get("/churches/{slug}")
async def get_church(slug: str):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    if "visit_preferences" not in church:
        church["visit_preferences"] = {
            "open_to_visits": False,
            "preferred_days": [],
            "preferred_times": [],
            "min_notice_weeks": 2,
            "max_visits_per_month": 2
        }
    return church

@router.put("/churches/{slug}/visit-preferences")
async def update_visit_preferences(
    slug: str,
    preferences: VisitPreferences,
    current_user: dict = Depends(get_current_user)
):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church.get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized to update this church")
    
    result = await db.churches.update_one(
        {"slug": slug},
        {
            "$set": {
                "visit_preferences": preferences.dict(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update preferences")
    
    return {"message": "Visit preferences updated successfully"}

@router.get("/planner/available-hosts")
async def get_available_hosts(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(50, ge=1, le=500),
    denomination: Optional[str] = None,
    dates: Optional[str] = None
):
    query = {"visit_preferences.open_to_visits": True}
    
    if denomination and denomination != "Any":
        query["$or"] = [
            {"denomination": denomination},
            {"visit_preferences.denomination_preference": "Any"},
            {"visit_preferences.denomination_preference": None}
        ]
    
    churches = await db.churches.find(query).to_list(length=1000)
    pastors = await db.pastors.find(query).to_list(length=1000)
    
    results = []
    base_coords = (lat, lng)
    
    for church in churches:
        if church.get("location") and church["location"].get("coordinates"):
            coords = church["location"]["coordinates"]
            church_coords = (coords[1], coords[0])
            distance = geodesic(base_coords, church_coords).miles
            
            if distance <= radius:
                church["_id"] = str(church["_id"])
                church["distance_miles"] = round(distance, 1)
                church["type"] = "church"
                results.append(church)
    
    for pastor in pastors:
        if pastor.get("location") and pastor["location"].get("coordinates"):
            coords = pastor["location"]["coordinates"]
            pastor_coords = (coords[1], coords[0])
            distance = geodesic(base_coords, pastor_coords).miles
            
            if distance <= radius:
                pastor["_id"] = str(pastor["_id"])
                pastor["distance_miles"] = round(distance, 1)
                pastor["type"] = "pastor"
                results.append(pastor)
    
    results.sort(key=lambda x: x["distance_miles"])
    return results

@router.post("/visits/invite")
async def send_visit_invitation(
    from_church_slug: str,
    to_type: str,
    to_slug: str,
    message: str,
    proposed_dates: List[str],
    contact_email: str,
    contact_phone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    from_church = await db.churches.find_one({"slug": from_church_slug})
    if not from_church or from_church.get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if to_type == "church":
        to_entity = await db.churches.find_one({"slug": to_slug})
    else:
        to_entity = await db.pastors.find_one({"slug": to_slug})
    
    if not to_entity:
        raise HTTPException(status_code=404, detail="Target not found")
    
    invitation = {
        "from_church_slug": from_church_slug,
        "from_church_name": from_church["name"],
        "to_type": to_type,
        "to_slug": to_slug,
        "to_name": to_entity["name"],
        "message": message,
        "proposed_dates": proposed_dates,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.visit_invitations.insert_one(invitation)
    return {"message": "Invitation sent successfully", "invitation_id": str(result.inserted_id)}