from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
import anthropic
from ..database import db
from ..auth import get_current_user

router = APIRouter(prefix="/api/planner/invitations", tags=["planner_invitations"])

class InvitationCreate(BaseModel):
    from_church_id: str
    to_pastor_id: str
    proposed_dates: List[str]
    preferred_slot: str
    message: str

class InvitationResponse(BaseModel):
    status: str
    alternative_dates: Optional[List[str]] = None
    response_message: Optional[str] = None

class TripAssignment(BaseModel):
    trip_id: str

@router.post("/")
async def create_invitation(invitation: InvitationCreate, user = Depends(get_current_user)):
    church = await db.churches.find_one({"_id": ObjectId(invitation.from_church_id)})
    if not church:
        raise HTTPException(404, "Church not found")
    
    pastor = await db.pastors.find_one({"_id": ObjectId(invitation.to_pastor_id)})
    if not pastor:
        raise HTTPException(404, "Pastor not found")
    
    doc = {
        "from_church_id": invitation.from_church_id,
        "from_church_name": church.get("name", "Unknown Church"),
        "to_pastor_id": invitation.to_pastor_id,
        "to_pastor_name": pastor.get("name", "Unknown Pastor"),
        "proposed_dates": invitation.proposed_dates,
        "preferred_slot": invitation.preferred_slot,
        "message": invitation.message,
        "status": "pending",
        "ai_priority_score": None,
        "ai_score_breakdown": {},
        "trip_id": None,
        "created_at": datetime.utcnow(),
        "responded_at": None
    }
    
    result = await db.visit_invitations.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    
    return {"success": True, "invitation_id": str(result.inserted_id)}

@router.get("/")
async def get_invitations(pastor_id: Optional[str] = None, status: Optional[str] = None, user = Depends(get_current_user)):
    query = {}
    if pastor_id:
        query["to_pastor_id"] = pastor_id
    if status:
        query["status"] = status
    
    invitations = []
    async for inv in db.visit_invitations.find(query).sort("ai_priority_score", -1):
        inv["_id"] = str(inv["_id"])
        inv["created_at"] = inv["created_at"].isoformat() if inv.get("created_at") else None
        inv["responded_at"] = inv["responded_at"].isoformat() if inv.get("responded_at") else None
        invitations.append(inv)
    
    return {"invitations": invitations}

@router.get("/{invitation_id}")
async def get_invitation(invitation_id: str, user = Depends(get_current_user)):
    inv = await db.visit_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise HTTPException(404, "Invitation not found")
    
    inv["_id"] = str(inv["_id"])
    inv["created_at"] = inv["created_at"].isoformat() if inv.get("created_at") else None
    inv["responded_at"] = inv["responded_at"].isoformat() if inv.get("responded_at") else None
    
    church = await db.churches.find_one({"_id": ObjectId(inv["from_church_id"])})
    if church:
        inv["church_details"] = {
            "name": church.get("name"),
            "location": church.get("location", {}).get("formatted_address"),
            "coordinates": church.get("location", {}).get("coordinates"),
            "congregation_size": church.get("congregation_size"),
            "denomination": church.get("denomination"),
            "image": church.get("images", [{}])[0].get("url") if church.get("images") else None
        }
    
    return inv

@router.post("/{invitation_id}/score")
async def score_invitation(invitation_id: str, user = Depends(get_current_user)):
    inv = await db.visit_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise HTTPException(404, "Invitation not found")
    
    church = await db.churches.find_one({"_id": ObjectId(inv["from_church_id"])})
    pastor = await db.pastors.find_one({"_id": ObjectId(inv["to_pastor_id"])})
    
    if not church or not pastor:
        raise HTTPException(404, "Church or pastor not found")
    
    past_visits = await db.church_visits.count_documents({
        "church_id": inv["from_church_id"],
        "pastor_id": inv["to_pastor_id"]
    })
    
    trips = []
    async for trip in db.trips.find({"pastor_id": inv["to_pastor_id"]}):
        trips.append(trip)
    
    prompt = f"""Score this church visit invitation from 0-100 based on these factors:

CHURCH:
- Name: {church.get('name')}
- Congregation Size: {church.get('congregation_size', 'Unknown')}
- Denomination: {church.get('denomination', 'Unknown')}
- Location: {church.get('location', {}).get('formatted_address', 'Unknown')}
- Verified: {church.get('is_verified', False)}
- Active on ChurchNavigator: {church.get('last_login') is not None}

PASTOR:
- Name: {pastor.get('name')}
- Base Location: {pastor.get('base_location', 'Unknown')}
- Denomination: {pastor.get('denomination', 'Unknown')}
- Past visits to this church: {past_visits}

INVITATION:
- Proposed Dates: {', '.join(inv['proposed_dates'])}
- Preferred Slot: {inv['preferred_slot']}
- Message: {inv['message']}

EXISTING TRIPS: {len(trips)} trips planned

SCORING CRITERIA:
1. congregation_size (0-20 points): Larger = higher score
2. distance_from_base (0-20 points): Closer = higher score (if coordinates available)
3. denomination_match (0-20 points): Exact match = 20, Compatible = 10, Different = 5
4. time_slot_fit (0-15 points): Fits existing plan gaps = higher score
5. relationship (0-15 points): Past connections = higher score
6. church_activity (0-10 points): Verified + active = 10 points

Return ONLY valid JSON:
{{
  "total_score": 0-100,
  "breakdown": {{
    "congregation_size": {{"score": 0-20, "reason": "brief explanation"}},
    "distance_from_base": {{"score": 0-20, "reason": "brief explanation"}},
    "denomination_match": {{"score": 0-20, "reason": "brief explanation"}},
    "time_slot_fit": {{"score": 0-15, "reason": "brief explanation"}},
    "relationship": {{"score": 0-15, "reason": "brief explanation"}},
    "church_activity": {{"score": 0-10, "reason": "brief explanation"}}
  }},
  "priority_band": "High Priority|Good Fit|Worth Considering|Low Priority",
  "recommendation": "one sentence summary"
}}"""
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        import json
        result = json.loads(message.content[0].text)
        
        await db.visit_invitations.update_one(
            {"_id": ObjectId(invitation_id)},
            {"$set": {
                "ai_priority_score": result["total_score"],
                "ai_score_breakdown": result
            }}
        )
        
        return result
    except Exception as e:
        raise HTTPException(500, f"AI scoring failed: {str(e)}")

@router.patch("/{invitation_id}/respond")
async def respond_to_invitation(invitation_id: str, response: InvitationResponse, user = Depends(get_current_user)):
    inv = await db.visit_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise HTTPException(404, "Invitation not found")
    
    update = {
        "status": response.status,
        "responded_at": datetime.utcnow()
    }
    
    if response.alternative_dates:
        update["alternative_dates"] = response.alternative_dates
    if response.response_message:
        update["response_message"] = response.response_message
    
    await db.visit_invitations.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$set": update}
    )
    
    return {"success": True, "status": response.status}

@router.patch("/{invitation_id}/assign-trip")
async def assign_to_trip(invitation_id: str, assignment: TripAssignment, user = Depends(get_current_user)):
    inv = await db.visit_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not inv:
        raise HTTPException(404, "Invitation not found")
    
    trip = await db.trips.find_one({"_id": ObjectId(assignment.trip_id)})
    if not trip:
        raise HTTPException(404, "Trip not found")
    
    await db.visit_invitations.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$set": {"trip_id": assignment.trip_id, "status": "accepted"}}
    )
    
    church = await db.churches.find_one({"_id": ObjectId(inv["from_church_id"])})
    
    stop = {
        "church_id": inv["from_church_id"],
        "church_name": inv["from_church_name"],
        "location": church.get("location", {}).get("formatted_address"),
        "coordinates": church.get("location", {}).get("coordinates"),
        "visit_date": inv["proposed_dates"][0] if inv["proposed_dates"] else None,
        "time_slot": inv["preferred_slot"],
        "invitation_id": invitation_id
    }
    
    await db.trips.update_one(
        {"_id": ObjectId(assignment.trip_id)},
        {"$push": {"stops": stop}}
    )
    
    return {"success": True, "trip_id": assignment.trip_id}

@router.delete("/{invitation_id}")
async def delete_invitation(invitation_id: str, user = Depends(get_current_user)):
    result = await db.visit_invitations.delete_one({"_id": ObjectId(invitation_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Invitation not found")
    return {"success": True}