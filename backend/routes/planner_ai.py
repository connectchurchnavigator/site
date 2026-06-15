from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from bson import ObjectId
import anthropic
import os
import hashlib
import json
from ..database import get_database
from ..auth import get_current_user
import httpx

router = APIRouter(prefix="/api/planner", tags=["planner_ai"])
db = get_database()

anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CACHE_TTL = 86400

def get_cache_key(prefix: str, data: Any) -> str:
    data_str = json.dumps(data, sort_keys=True, default=str)
    return f"{prefix}:{hashlib.sha256(data_str.encode()).hexdigest()}"

def get_cached(key: str) -> Optional[Dict]:
    cache = db.ai_cache.find_one({"key": key, "expires_at": {"$gt": datetime.utcnow()}})
    return cache["value"] if cache else None

def set_cached(key: str, value: Dict, ttl: int = CACHE_TTL):
    db.ai_cache.update_one(
        {"key": key},
        {"$set": {"value": value, "expires_at": datetime.utcnow() + timedelta(seconds=ttl)}},
        upsert=True
    )

class ChurchMatchRequest(BaseModel):
    trip_id: str

class ChurchMatchResponse(BaseModel):
    matches: List[Dict]
    total_churches: int

@router.post("/{trip_id}/match-churches", response_model=ChurchMatchResponse)
async def match_churches(trip_id: str, user=Depends(get_current_user)):
    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(404, "Trip not found")
    
    minister_profile = db.users.find_one({"_id": ObjectId(user["_id"])})
    
    available_churches = list(db.churches.find({
        "open_to_visits": True,
        "location.city": {"$in": trip.get("target_cities", [])}
    }))
    
    if not available_churches:
        return ChurchMatchResponse(matches=[], total_churches=0)
    
    cache_key = get_cache_key(f"church_match:{trip_id}", {
        "minister_id": str(user["_id"]),
        "church_ids": [str(c["_id"]) for c in available_churches[:20]]
    })
    
    cached = get_cached(cache_key)
    if cached:
        return ChurchMatchResponse(**cached)
    
    matches = []
    for church in available_churches[:20]:
        prompt = f"""Analyze compatibility between minister and church for a visiting ministry trip.

MINISTER PROFILE:
- Denomination: {minister_profile.get('denomination', 'Not specified')}
- Preaching style: {minister_profile.get('preaching_style', 'Not specified')}
- Topics: {', '.join(minister_profile.get('ministry_topics', ['General ministry']))}
- Experience: {minister_profile.get('years_ministry', 0)} years

CHURCH PROFILE:
- Name: {church.get('name')}
- Denomination: {church.get('denomination', 'Not specified')}
- Size: {church.get('congregation_size', 'Not specified')}
- Worship style: {church.get('worship_style', 'Not specified')}
- Location: {church.get('location', {}).get('city', '')}
- Past visitor events: {len(church.get('events', []))}

Provide JSON response with these fields:
{{
  "overall_match_score": 0-100,
  "denominational_fit": 0-100,
  "audience_match": 0-100,
  "need_alignment": 0-100,
  "practical_fit": 0-100,
  "relationship_potential": 0-100,
  "impact_score": 0-100,
  "history_score": 0-100,
  "ai_reasoning": "2-3 sentence explanation",
  "ai_recommendation": "Brief action recommendation",
  "estimated_attendance": number,
  "estimated_impact_reach": number,
  "red_flags": ["list"],
  "green_flags": ["list"]
}}"""
        
        try:
            response = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result = json.loads(response.content[0].text)
            result["church_id"] = str(church["_id"])
            result["church_name"] = church["name"]
            matches.append(result)
        except Exception as e:
            print(f"AI match error for church {church['_id']}: {e}")
            continue
    
    matches.sort(key=lambda x: x["overall_match_score"], reverse=True)
    
    response_data = {"matches": matches, "total_churches": len(matches)}
    set_cached(cache_key, response_data, ttl=604800)
    
    return ChurchMatchResponse(**response_data)

class ConflictCheckResponse(BaseModel):
    conflicts: List[Dict]
    overall_feasibility: int
    feasibility_summary: str

@router.post("/{trip_id}/check-conflicts", response_model=ConflictCheckResponse)
async def check_conflicts(trip_id: str, user=Depends(get_current_user)):
    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(404, "Trip not found")
    
    visits = list(db.planner_visits.find({"trip_id": trip_id}).sort("scheduled_datetime", 1))
    
    if len(visits) < 2:
        return ConflictCheckResponse(conflicts=[], overall_feasibility=100, feasibility_summary="No conflicts detected.")
    
    cache_key = get_cache_key(f"conflicts:{trip_id}", {
        "visits": [{"id": str(v["_id"]), "time": str(v.get("scheduled_datetime"))} for v in visits]
    })
    
    cached = get_cached(cache_key)
    if cached:
        return ConflictCheckResponse(**cached)
    
    visit_details = []
    for v in visits:
        church = db.churches.find_one({"_id": ObjectId(v["church_id"])})
        visit_details.append({
            "visit_id": str(v["_id"]),
            "church_name": church["name"] if church else "Unknown",
            "scheduled_datetime": str(v.get("scheduled_datetime")),
            "location": church.get("location", {}).get("city") if church else "Unknown",
            "service_type": v.get("service_type", "service")
        })
    
    prompt = f"""Analyze this ministry trip itinerary for conflicts and issues.

ITINERARY:
{json.dumps(visit_details, indent=2)}

Detect:
1. Physical impossibility (travel time conflicts)
2. Scheduling conflicts (overlapping times)
3. Church preference mismatches
4. Rest and recovery issues
5. Geographic inefficiencies
6. Cultural/denominational concerns

Provide JSON response:
{{
  "conflicts": [
    {{
      "type": "physical_impossibility|scheduling_conflict|preference_mismatch|rest_recovery|geographic_inefficiency|cultural_concern",
      "severity": "critical|warning|suggestion",
      "affected_visits": ["visit_id1", "visit_id2"],
      "message": "Clear description",
      "suggested_fix": "Actionable solution"
    }}
  ],
  "overall_feasibility": 0-100,
  "feasibility_summary": "1-2 sentence summary"
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        set_cached(cache_key, result, ttl=120)
        return ConflictCheckResponse(**result)
    except Exception as e:
        print(f"Conflict check error: {e}")
        return ConflictCheckResponse(conflicts=[], overall_feasibility=50, feasibility_summary="Unable to analyze conflicts.")

class NegotiationAdviceResponse(BaseModel):
    situation_analysis: str
    recommended_response: str
    draft_counter_message: str
    alternative_dates: List[str]
    insider_tips: List[str]
    success_probability: int

@router.post("/invitations/{invitation_id}/negotiation-advice", response_model=NegotiationAdviceResponse)
async def get_negotiation_advice(invitation_id: str, user=Depends(get_current_user)):
    invitation = db.planner_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(404, "Invitation not found")
    
    trip = db.planner_trips.find_one({"_id": ObjectId(invitation["trip_id"]), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(403, "Not authorized")
    
    church = db.churches.find_one({"_id": ObjectId(invitation["church_id"])})
    
    cache_key = get_cache_key(f"negotiation:{invitation_id}", {
        "status": invitation.get("status"),
        "decline_reason": invitation.get("decline_reason", "")
    })
    
    cached = get_cached(cache_key)
    if cached:
        return NegotiationAdviceResponse(**cached)
    
    prompt = f"""Provide negotiation advice for a declined ministry visit invitation.

CONTEXT:
- Church: {church['name'] if church else 'Unknown'}
- Denomination: {church.get('denomination', 'Not specified') if church else 'Unknown'}
- Original request date: {invitation.get('requested_date', 'Not specified')}
- Decline reason: {invitation.get('decline_reason', 'No reason provided')}
- Church response: {invitation.get('church_message', 'No message')}

Provide JSON response:
{{
  "situation_analysis": "2-3 sentence analysis",
  "recommended_response": "counter_propose|accept_alternative|withdraw|escalate",
  "draft_counter_message": "Professional, gracious message (150-200 words)",
  "alternative_dates": ["date1", "date2", "date3"],
  "insider_tips": ["tip1", "tip2", "tip3"],
  "success_probability": 0-100
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        set_cached(cache_key, result)
        return NegotiationAdviceResponse(**result)
    except Exception as e:
        print(f"Negotiation advice error: {e}")
        raise HTTPException(500, "Unable to generate negotiation advice")

class PreVisitBriefingResponse(BaseModel):
    congregation_snapshot: str
    what_resonates: str
    what_to_avoid: str
    key_people: str
    practical_notes: str
    relationship_opportunity: str

@router.post("/visits/{visit_id}/briefing", response_model=PreVisitBriefingResponse)
async def get_pre_visit_briefing(visit_id: str, user=Depends(get_current_user)):
    visit = db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(404, "Visit not found")
    
    trip = db.planner_trips.find_one({"_id": ObjectId(visit["trip_id"]), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(403, "Not authorized")
    
    church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
    if not church:
        raise HTTPException(404, "Church not found")
    
    cache_key = get_cache_key(f"briefing:{visit_id}", {"church_id": str(church["_id"])})
    
    cached = get_cached(cache_key)
    if cached:
        return PreVisitBriefingResponse(**cached)
    
    reviews = list(db.reviews.find({"church_id": str(church["_id"])}).limit(10))
    events = church.get("events", [])[:5]
    
    prompt = f"""Generate a pre-visit briefing for a minister visiting this church.

CHURCH DETAILS:
- Name: {church.get('name')}
- Denomination: {church.get('denomination', 'Not specified')}
- Congregation size: {church.get('congregation_size', 'Not specified')}
- Worship style: {church.get('worship_style', 'Not specified')}
- Location: {church.get('location', {}).get('formatted_address', '')}
- Pastor: {church.get('pastor_name', 'Not specified')}
- Recent events: {len(events)}
- Average rating: {church.get('rating', {}).get('average', 0)}
- Total reviews: {len(reviews)}

Provide JSON response with these sections:
{{
  "congregation_snapshot": "2-3 sentences about congregation demographics and culture",
  "what_resonates": "What ministry approaches work well here",
  "what_to_avoid": "What to avoid or be cautious about",
  "key_people": "Key people to connect with (pastor, leaders)",
  "practical_notes": "Parking, timing, dress code, tech setup",
  "relationship_opportunity": "Long-term partnership potential"
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1536,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        set_cached(cache_key, result)
        return PreVisitBriefingResponse(**result)
    except Exception as e:
        print(f"Briefing error: {e}")
        raise HTTPException(500, "Unable to generate briefing")

class ImpactPredictionResponse(BaseModel):
    total_estimated_reach: int
    ministry_impact_score: int
    predicted_outcomes: Dict
    visit_by_visit_impact: List[Dict]
    trip_strengths: List[str]
    trip_weaknesses: List[str]
    improvement_suggestions: List[Dict]
    ai_verdict: str

@router.post("/{trip_id}/predict-impact", response_model=ImpactPredictionResponse)
async def predict_impact(trip_id: str, user=Depends(get_current_user)):
    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(404, "Trip not found")
    
    visits = list(db.planner_visits.find({"trip_id": trip_id, "status": "confirmed"}).sort("scheduled_datetime", 1))
    
    if not visits:
        raise HTTPException(400, "No confirmed visits to analyze")
    
    cache_key = get_cache_key(f"impact:{trip_id}", {
        "visit_ids": [str(v["_id"]) for v in visits]
    })
    
    cached = get_cached(cache_key)
    if cached:
        return ImpactPredictionResponse(**cached)
    
    visit_details = []
    for v in visits:
        church = db.churches.find_one({"_id": ObjectId(v["church_id"])})
        if church:
            visit_details.append({
                "visit_id": str(v["_id"]),
                "church_name": church["name"],
                "congregation_size": church.get("congregation_size", "Unknown"),
                "scheduled_datetime": str(v.get("scheduled_datetime")),
                "service_type": v.get("service_type", "service"),
                "location": church.get("location", {}).get("city", "")
            })
    
    prompt = f"""Predict the ministry impact of this completed trip itinerary.

ITINERARY:
{json.dumps(visit_details, indent=2)}

Total visits: {len(visit_details)}

Provide JSON response:
{{
  "total_estimated_reach": number,
  "ministry_impact_score": 0-100,
  "predicted_outcomes": {{
    "new_partnerships": number,
    "referrals_to_other_churches": number,
    "estimated_lives_impacted": number,
    "follow_up_engagements": number
  }},
  "visit_by_visit_impact": [
    {{
      "visit_id": "id",
      "church_name": "name",
      "estimated_attendance": number,
      "impact_score": 0-100,
      "impact_reasoning": "why this visit matters",
      "recommended_focus": "ministry focus suggestion"
    }}
  ],
  "trip_strengths": ["strength1", "strength2"],
  "trip_weaknesses": ["weakness1", "weakness2"],
  "improvement_suggestions": [
    {{
      "suggestion": "what to change",
      "impact_increase": "quantified benefit",
      "match_score_change": "score change"
    }}
  ],
  "ai_verdict": "2-3 sentence overall assessment"
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        set_cached(cache_key, result)
        return ImpactPredictionResponse(**result)
    except Exception as e:
        print(f"Impact prediction error: {e}")
        raise HTTPException(500, "Unable to predict impact")

class PostVisitDebriefResponse(BaseModel):
    visit_summary: str
    key_moments: List[str]
    follow_up_actions: List[Dict]
    partnership_potential: str
    notes_for_next_visit: str

@router.post("/visits/{visit_id}/debrief", response_model=PostVisitDebriefResponse)
async def get_post_visit_debrief(visit_id: str, user=Depends(get_current_user)):
    visit = db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(404, "Visit not found")
    
    trip = db.planner_trips.find_one({"_id": ObjectId(visit["trip_id"]), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(403, "Not authorized")
    
    church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
    
    cache_key = get_cache_key(f"debrief:{visit_id}", {
        "completed": visit.get("completed", False),
        "notes": visit.get("notes", "")
    })
    
    cached = get_cached(cache_key)
    if cached:
        return PostVisitDebriefResponse(**cached)
    
    prompt = f"""Generate a post-visit debrief for a completed ministry visit.

VISIT DETAILS:
- Church: {church['name'] if church else 'Unknown'}
- Date: {visit.get('scheduled_datetime', 'Unknown')}
- Service type: {visit.get('service_type', 'service')}
- Minister notes: {visit.get('notes', 'No notes provided')}
- Church feedback: {visit.get('church_feedback', 'No feedback yet')}

Provide JSON response:
{{
  "visit_summary": "2-3 sentence summary of how it went",
  "key_moments": ["moment1", "moment2", "moment3"],
  "follow_up_actions": [
    {{
      "action": "what to do",
      "deadline": "when",
      "template": "email_template_name or null",
      "auto_draft": true/false
    }}
  ],
  "partnership_potential": "HIGH|MEDIUM|LOW -- explanation",
  "notes_for_next_visit": "Things to remember for next time"
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result = json.loads(response.content[0].text)
        set_cached(cache_key, result, ttl=2592000)
        return PostVisitDebriefResponse(**result)
    except Exception as e:
        print(f"Debrief error: {e}")
        raise HTTPException(500, "Unable to generate debrief")