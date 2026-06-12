from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
from bson import ObjectId
import math
from ..database import get_database
from ..auth import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

class ChurchScore(BaseModel):
    church_id: str
    name: str
    denomination: str
    address: str
    city: str
    postcode: str
    lat: float
    lng: float
    congregation_size: Optional[int] = 0
    image_url: Optional[str] = None
    verified: bool = False
    cn_followers: int = 0
    distance_km: float
    distance_mi: float
    transport_cost: float
    overall_score: int
    congregation_score: int
    distance_score: int
    denomination_score: int
    slot_score: int
    invitation_score: int
    activity_score: int
    history_score: int
    recommendation_badge: str
    impact_percentage: int
    cost_percentage: int
    value_score: float
    why_recommended: List[str]
    has_invitation: bool
    has_event_during_dates: bool
    fits_schedule: bool

class DiscoverFilters(BaseModel):
    denominations: Optional[List[str]] = None
    max_distance_mi: Optional[float] = None
    congregation_size: Optional[str] = None
    has_invitation: Optional[bool] = None
    has_event: Optional[bool] = None

@router.get("/trips/{trip_id}/discover")
async def get_discover_churches(
    trip_id: str,
    sort_by: str = "ai_recommendation",
    denomination: Optional[str] = None,
    max_distance: Optional[float] = None,
    congregation_size: Optional[str] = None,
    has_invitation: Optional[bool] = None,
    has_event: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    trip = await db.planner_trips.find_one({
        "_id": ObjectId(trip_id),
        "user_id": current_user["user_id"]
    })
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    base_lat = trip["base_location"]["lat"]
    base_lng = trip["base_location"]["lng"]
    start_date = trip["start_date"]
    end_date = trip["end_date"]
    user_denomination = trip.get("user_denomination", "")
    
    radius_km = (max_distance or 50) * 1.60934
    
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [base_lng, base_lat]},
                "distanceField": "distance",
                "maxDistance": radius_km * 1000,
                "spherical": True
            }
        },
        {"$match": {"status": "active"}}
    ]
    
    if denomination:
        pipeline.append({"$match": {"denomination": {"$regex": denomination, "$options": "i"}}})
    
    churches_cursor = db.churches.aggregate(pipeline)
    churches = await churches_cursor.to_list(length=500)
    
    invitations = {}
    if has_invitation is not None:
        inv_cursor = db.planner_invitations.find({
            "trip_id": ObjectId(trip_id),
            "status": "accepted"
        })
        async for inv in inv_cursor:
            invitations[str(inv["church_id"])] = True
    
    events = {}
    if has_event is not None:
        event_cursor = db.events.find({
            "start_date": {"$lte": end_date},
            "end_date": {"$gte": start_date}
        })
        async for evt in event_cursor:
            church_id = str(evt["church_id"])
            if church_id not in events:
                events[church_id] = []
            events[church_id].append(evt)
    
    plan_items = await db.planner_items.find({"trip_id": ObjectId(trip_id)}).to_list(length=100)
    visited_churches = set(str(item["church_id"]) for item in plan_items)
    
    history_cursor = db.planner_items.find({
        "user_id": current_user["user_id"],
        "visited": True
    })
    visited_history = set()
    async for hist in history_cursor:
        visited_history.add(str(hist["church_id"]))
    
    max_followers = max((c.get("cn_followers", 0) for c in churches), default=1)
    
    scored_churches = []
    for church in churches:
        church_id = str(church["_id"])
        distance_m = church["distance"]
        distance_km = distance_m / 1000
        distance_mi = distance_km * 0.621371
        
        if max_distance and distance_mi > max_distance:
            continue
        
        size = church.get("congregation_size", 0)
        if congregation_size:
            if congregation_size == "small" and size > 100:
                continue
            elif congregation_size == "medium" and (size <= 100 or size > 500):
                continue
            elif congregation_size == "large" and (size <= 500 or size > 2000):
                continue
            elif congregation_size == "mega" and size <= 2000:
                continue
        
        has_inv = church_id in invitations
        if has_invitation is True and not has_inv:
            continue
        if has_invitation is False and has_inv:
            continue
        
        has_evt = church_id in events
        if has_event is True and not has_evt:
            continue
        if has_event is False and has_evt:
            continue
        
        cong_score = min(size / 1000, 1) * 20
        dist_score = max(0, (30 - distance_km) / 30) * 25
        
        denom = church.get("denomination", "")
        if user_denomination.lower() in denom.lower():
            denom_score = 15
        elif any(word in denom.lower() for word in user_denomination.lower().split()):
            denom_score = 8
        else:
            denom_score = 0
        
        fits_gap = len(plan_items) < 10
        slot_score = 10 if fits_gap else 5
        
        inv_score = 10 if has_inv else 0
        
        followers = church.get("cn_followers", 0)
        verified = church.get("verified", False)
        activity = (followers + (100 if verified else 0)) / max(max_followers, 1)
        activity_score = min(activity * 10, 10)
        
        hist_score = 5 if church_id in visited_history else 0
        
        total_score = int(cong_score + dist_score + denom_score + slot_score + inv_score + activity_score + hist_score)
        
        transport_cost = distance_mi * 0.45 * 2
        
        impact = (cong_score + denom_score + activity_score) / 45 * 100
        cost_pct = min(transport_cost / 50 * 100, 100)
        value = (total_score / max(transport_cost, 1)) if transport_cost > 0 else total_score
        
        if total_score >= 80:
            badge = "🟢 Highly Recommended"
        elif total_score >= 60:
            badge = "🔵 Recommended"
        elif total_score >= 40:
            badge = "🟡 Good Match"
        else:
            badge = "⚪ Available"
        
        why = []
        if cong_score >= 15:
            why.append(f"Large active congregation ({size:,} members)")
        if dist_score >= 20:
            why.append(f"Conveniently located ({distance_mi:.1f} miles away)")
        if denom_score == 15:
            why.append(f"Matches your denomination ({user_denomination})")
        if has_inv:
            why.append("You have an invitation from the minister")
        if verified:
            why.append("ChurchNavigator verified")
        if hist_score > 0:
            why.append("You've visited this church before")
        if has_evt:
            why.append(f"{len(events.get(church_id, []))} event(s) during your trip")
        if not why:
            why.append("Available for your visit dates")
        
        scored_churches.append(ChurchScore(
            church_id=church_id,
            name=church["name"],
            denomination=church.get("denomination", "Unknown"),
            address=church.get("address", ""),
            city=church.get("city", ""),
            postcode=church.get("postcode", ""),
            lat=church["location"]["coordinates"][1],
            lng=church["location"]["coordinates"][0],
            congregation_size=size,
            image_url=church.get("image_url"),
            verified=verified,
            cn_followers=followers,
            distance_km=round(distance_km, 2),
            distance_mi=round(distance_mi, 2),
            transport_cost=round(transport_cost, 2),
            overall_score=total_score,
            congregation_score=int(cong_score),
            distance_score=int(dist_score),
            denomination_score=int(denom_score),
            slot_score=int(slot_score),
            invitation_score=int(inv_score),
            activity_score=int(activity_score),
            history_score=int(hist_score),
            recommendation_badge=badge,
            impact_percentage=int(impact),
            cost_percentage=int(cost_pct),
            value_score=round(value, 2),
            why_recommended=why,
            has_invitation=has_inv,
            has_event_during_dates=has_evt,
            fits_schedule=fits_gap
        ))
    
    if sort_by == "ai_recommendation":
        scored_churches.sort(key=lambda x: x.overall_score, reverse=True)
    elif sort_by == "highest_impact":
        scored_churches.sort(key=lambda x: x.impact_percentage, reverse=True)
    elif sort_by == "lowest_cost":
        scored_churches.sort(key=lambda x: x.transport_cost)
    elif sort_by == "best_value":
        scored_churches.sort(key=lambda x: x.value_score, reverse=True)
    elif sort_by == "nearest":
        scored_churches.sort(key=lambda x: x.distance_mi)
    
    return {
        "trip_id": trip_id,
        "total_churches": len(scored_churches),
        "churches": [c.dict() for c in scored_churches],
        "filters_applied": {
            "denomination": denomination,
            "max_distance_mi": max_distance,
            "congregation_size": congregation_size,
            "has_invitation": has_invitation,
            "has_event": has_event
        },
        "sort_by": sort_by
    }
