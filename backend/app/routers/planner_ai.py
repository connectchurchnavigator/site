from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.database import db
from app.services.ai_planner_service import ai_planner_service
from app.auth import get_current_user
from bson import ObjectId
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/planner", tags=["planner-ai"])

@router.post("/{trip_id}/match-churches")
async def match_churches(trip_id: str, current_user: Dict = Depends(get_current_user)):
    trip = await db.planner_trips.find_one({"_id": ObjectId(trip_id), "minister_id": current_user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    minister_profile = {
        "user_id": current_user["user_id"],
        "name": current_user.get("name", "Minister"),
        "denomination": current_user.get("denomination", "Christian"),
        "preaching_style": current_user.get("preaching_style", "General"),
        "topics": current_user.get("topics", []),
        "congregation_size_preference": current_user.get("congregation_size_preference", "any"),
        "travel_radius_km": current_user.get("travel_radius_km", 100)
    }
    
    start_date = trip.get("start_date")
    end_date = trip.get("end_date")
    
    churches_cursor = db.churches.find({
        "open_to_visits": True,
        "status": "active"
    }).limit(50)
    available_churches = await churches_cursor.to_list(length=50)
    
    for church in available_churches:
        church["_id"] = str(church["_id"])
    
    matches = await ai_planner_service.match_churches(trip_id, minister_profile, available_churches)
    
    matches.sort(key=lambda x: x.get("overall_match_score", 0), reverse=True)
    
    return {"success": True, "matches": matches}

@router.post("/{trip_id}/check-conflicts")
async def check_conflicts(trip_id: str, current_user: Dict = Depends(get_current_user)):
    trip = await db.planner_trips.find_one({"_id": ObjectId(trip_id), "minister_id": current_user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    itinerary = trip.get("itinerary", [])
    
    for visit in itinerary:
        if "_id" in visit:
            visit["_id"] = str(visit["_id"])
        if "church_id" in visit:
            visit["church_id"] = str(visit["church_id"])
    
    conflicts = await ai_planner_service.check_conflicts(trip_id, itinerary)
    
    return {"success": True, **conflicts}

@router.post("/invitations/{invitation_id}/negotiation-advice")
async def negotiation_advice(invitation_id: str, current_user: Dict = Depends(get_current_user)):
    invitation = await db.planner_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if str(invitation.get("minister_id")) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    invitation_history = {
        "invitation_id": invitation_id,
        "church_name": invitation.get("church_name", "Church"),
        "requested_date": invitation.get("requested_date"),
        "status": invitation.get("status"),
        "decline_reason": invitation.get("decline_reason"),
        "alternative_proposed": invitation.get("alternative_proposed"),
        "messages": invitation.get("messages", [])
    }
    
    advice = await ai_planner_service.negotiation_advice(invitation_id, invitation_history)
    
    return {"success": True, **advice}

@router.post("/visits/{visit_id}/briefing")
async def generate_briefing(visit_id: str, current_user: Dict = Depends(get_current_user)):
    visit = await db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    church = await db.churches.find_one({"_id": ObjectId(visit.get("church_id"))})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    visit["_id"] = str(visit["_id"])
    
    briefing = await ai_planner_service.generate_briefing(visit_id, church, visit)
    
    return {"success": True, "briefing": briefing}

@router.post("/{trip_id}/predict-impact")
async def predict_impact(trip_id: str, current_user: Dict = Depends(get_current_user)):
    trip = await db.planner_trips.find_one({"_id": ObjectId(trip_id), "minister_id": current_user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    confirmed_itinerary = [v for v in trip.get("itinerary", []) if v.get("status") == "confirmed"]
    
    for visit in confirmed_itinerary:
        if "_id" in visit:
            visit["_id"] = str(visit["_id"])
        if "church_id" in visit:
            visit["church_id"] = str(visit["church_id"])
    
    impact = await ai_planner_service.predict_impact(trip_id, confirmed_itinerary)
    
    return {"success": True, **impact}

@router.post("/visits/{visit_id}/debrief")
async def generate_debrief(visit_id: str, current_user: Dict = Depends(get_current_user)):
    visit = await db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit["_id"] = str(visit["_id"])
    if "church_id" in visit:
        visit["church_id"] = str(visit["church_id"])
    
    church_feedback = visit.get("church_feedback")
    
    debrief = await ai_planner_service.generate_debrief(visit_id, visit, church_feedback)
    
    await db.planner_visits.update_one(
        {"_id": ObjectId(visit_id)},
        {"$set": {"debrief": debrief, "debrief_generated_at": datetime.utcnow()}}
    )
    
    return {"success": True, **debrief}