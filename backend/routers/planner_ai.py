from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import anthropic
import os
from ..database import db
from bson import ObjectId
import json
from geopy.distance import geodesic
import asyncio

router = APIRouter(prefix="/api/planner", tags=["planner_ai"])
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class ChurchMatch(BaseModel):
    church_id: str
    church_name: str
    overall_match_score: int
    dimensions: Dict[str, int]
    ai_reasoning: str
    ai_recommendation: str
    estimated_attendance: int
    estimated_impact_reach: int
    red_flags: List[str]
    green_flags: List[str]

class Conflict(BaseModel):
    type: str
    severity: str
    affected_visits: List[str]
    message: str
    suggested_fix: str

class ConflictResponse(BaseModel):
    conflicts: List[Conflict]
    overall_feasibility: int
    feasibility_summary: str

class NegotiationAdvice(BaseModel):
    situation_analysis: str
    recommended_response: str
    draft_counter_message: str
    alternative_dates: List[str]
    insider_tips: List[str]
    success_probability: int

class VisitImpact(BaseModel):
    visit_id: str
    church_name: str
    estimated_attendance: int
    impact_score: int
    impact_reasoning: str
    recommended_focus: str

class ImpactPrediction(BaseModel):
    total_estimated_reach: int
    ministry_impact_score: int
    predicted_outcomes: Dict[str, int]
    visit_by_visit_impact: List[VisitImpact]
    trip_strengths: List[str]
    trip_weaknesses: List[str]
    improvement_suggestions: List[Dict[str, str]]
    ai_verdict: str

class Debrief(BaseModel):
    visit_summary: str
    key_moments: List[str]
    follow_up_actions: List[Dict[str, Any]]
    partnership_potential: str
    notes_for_next_visit: str

def get_cached_ai_result(cache_key: str, ttl_hours: int = 24):
    cache = db.ai_cache.find_one({"key": cache_key})
    if cache and datetime.utcnow() < cache["expires_at"]:
        return cache["result"]
    return None

def set_cached_ai_result(cache_key: str, result: Any, ttl_hours: int = 24):
    db.ai_cache.update_one(
        {"key": cache_key},
        {"$set": {
            "key": cache_key,
            "result": result,
            "expires_at": datetime.utcnow() + timedelta(hours=ttl_hours),
            "created_at": datetime.utcnow()
        }},
        upsert=True
    )

def call_claude(prompt: str, model: str = "claude-sonnet-4-20250514", max_tokens: int = 4000):
    try:
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI call failed: {str(e)}")

@router.post("/{trip_id}/match-churches")
async def match_churches(trip_id: str):
    cache_key = f"match_churches_{trip_id}"
    cached = get_cached_ai_result(cache_key, ttl_hours=168)
    if cached:
        return cached

    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    minister_id = trip["minister_id"]
    minister = db.users.find_one({"_id": ObjectId(minister_id)})
    start_date = trip["start_date"]
    end_date = trip["end_date"]

    available_churches = list(db.churches.find({
        "open_to_visits": True,
        "verification_status": "verified"
    }).limit(100))

    if not available_churches:
        return {"matches": []}

    minister_profile = {
        "name": minister.get("display_name", "Minister"),
        "denomination": minister.get("denomination", "Not specified"),
        "preaching_style": minister.get("preaching_style", "Not specified"),
        "topics": minister.get("topics", []),
        "congregation_preference": minister.get("congregation_preference", "Any size"),
        "travel_radius": trip.get("max_travel_radius_miles", 50),
        "languages": minister.get("languages", ["English"])
    }

    church_summaries = []
    for church in available_churches[:20]:
        church_summaries.append({
            "id": str(church["_id"]),
            "name": church["name"],
            "denomination": church.get("denomination", "Not specified"),
            "congregation_size": church.get("congregation_size", "Not specified"),
            "worship_style": church.get("worship_style", "Not specified"),
            "location": f"{church.get('city', '')}, {church.get('postcode', '')}",
            "coordinates": church.get("coordinates", {})
        })

    prompt = f"""You are an expert church-minister matching AI for ChurchNavigator.

MINISTER PROFILE:
{json.dumps(minister_profile, indent=2)}

AVAILABLE CHURCHES (top 20):
{json.dumps(church_summaries, indent=2)}

For EACH church, score it on these 7 dimensions (0-100):
1. denominational_fit - same/compatible denomination
2. audience_match - does minister reach this congregation well
3. need_alignment - what church needs vs what minister brings
4. practical_fit - travel time, service format
5. relationship_potential - likelihood of ongoing partnership
6. impact_score - estimated attendance lift
7. history_score - has church hosted visitors well before

Return ONLY valid JSON array with this exact structure:
[
  {{
    "church_id": "...",
    "church_name": "...",
    "overall_match_score": 87,
    "dimensions": {{
      "denominational_fit": 92,
      "audience_match": 85,
      "need_alignment": 78,
      "practical_fit": 95,
      "relationship_potential": 80,
      "impact_score": 88,
      "history_score": 90
    }},
    "ai_reasoning": "Brief 2-3 sentence explanation",
    "ai_recommendation": "One sentence action recommendation",
    "estimated_attendance": 750,
    "estimated_impact_reach": 2100,
    "red_flags": [],
    "green_flags": ["flag1", "flag2"]
  }}
]

Provide matches for ALL churches in the list."""

    response_text = call_claude(prompt, model="claude-sonnet-4-20250514", max_tokens=8000)
    
    try:
        matches = json.loads(response_text)
        matches.sort(key=lambda x: x["overall_match_score"], reverse=True)
        result = {"matches": matches}
        set_cached_ai_result(cache_key, result, ttl_hours=168)
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")

@router.post("/{trip_id}/check-conflicts")
async def check_conflicts(trip_id: str):
    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    visits = list(db.planner_visits.find({"trip_id": trip_id}).sort("scheduled_datetime", 1))
    
    if len(visits) < 2:
        return ConflictResponse(
            conflicts=[],
            overall_feasibility=100,
            feasibility_summary="Your itinerary looks good with no conflicts detected."
        )

    visit_summaries = []
    for v in visits:
        church = db.churches.find_one({"_id": ObjectId(v["church_id"])})
        visit_summaries.append({
            "visit_id": str(v["_id"]),
            "church_name": church["name"] if church else "Unknown",
            "datetime": v["scheduled_datetime"].isoformat(),
            "duration_hours": v.get("duration_hours", 2),
            "location": f"{church.get('city', '')} {church.get('postcode', '')}" if church else "",
            "coordinates": church.get("coordinates", {}) if church else {},
            "service_type": v.get("service_type", "Not specified"),
            "church_preferences": church.get("preferred_service_times", []) if church else []
        })

    prompt = f"""You are a trip conflict detection AI for ChurchNavigator ministry planning.

ITINERARY:
{json.dumps(visit_summaries, indent=2)}

Detect these conflict types:
1. physical_impossibility - travel time makes it impossible
2. scheduling_conflicts - overlapping times
3. preference_mismatch - church only does certain days/times
4. rest_recovery - too many consecutive days without rest
5. geographic_inefficiency - poor routing, wasted travel
6. cultural_denominational - style/topic mismatch

Return ONLY valid JSON:
{{
  "conflicts": [
    {{
      "type": "physical_impossibility",
      "severity": "critical",
      "affected_visits": ["visit_id_1", "visit_id_2"],
      "message": "Detailed explanation",
      "suggested_fix": "Actionable fix"
    }}
  ],
  "overall_feasibility": 78,
  "feasibility_summary": "One sentence summary"
}}

Severity: critical (must fix), warning (should fix), suggestion (nice to have)"""

    response_text = call_claude(prompt, model="claude-3-5-haiku-20241022", max_tokens=3000)
    
    try:
        result = json.loads(response_text)
        return ConflictResponse(**result)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"AI conflict detection failed: {str(e)}")

@router.post("/invitations/{invitation_id}/negotiation-advice")
async def get_negotiation_advice(invitation_id: str):
    invitation = db.planner_invitations.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    church = db.churches.find_one({"_id": ObjectId(invitation["church_id"])})
    minister = db.users.find_one({"_id": ObjectId(invitation["minister_id"])})

    history = {
        "status": invitation.get("status"),
        "requested_date": invitation.get("requested_datetime", datetime.utcnow()).isoformat(),
        "decline_reason": invitation.get("decline_reason", ""),
        "church_message": invitation.get("church_message", ""),
        "alternative_offered": invitation.get("alternative_datetime"),
        "church_name": church["name"] if church else "Unknown",
        "church_denomination": church.get("denomination") if church else "",
        "minister_name": minister.get("display_name") if minister else "",
        "minister_denomination": minister.get("denomination") if minister else ""
    }

    prompt = f"""You are a ministry negotiation advisor for ChurchNavigator.

INVITATION HISTORY:
{json.dumps(history, indent=2)}

Provide tactical advice for the minister to secure this visit.

Return ONLY valid JSON:
{{
  "situation_analysis": "2-3 sentence analysis of what happened",
  "recommended_response": "counter_propose|accept_alternative|withdraw|escalate",
  "draft_counter_message": "Professional, warm message ready to send",
  "alternative_dates": ["29 Jun", "6 Jul"],
  "insider_tips": ["tip1", "tip2", "tip3"],
  "success_probability": 78
}}

Be strategic, professional, and encouraging."""

    response_text = call_claude(prompt, model="claude-sonnet-4-20250514", max_tokens=2000)
    
    try:
        result = json.loads(response_text)
        return NegotiationAdvice(**result)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"AI negotiation advice failed: {str(e)}")

@router.post("/visits/{visit_id}/briefing")
async def generate_pre_visit_briefing(visit_id: str):
    cache_key = f"briefing_{visit_id}"
    cached = get_cached_ai_result(cache_key, ttl_hours=24)
    if cached:
        return cached

    visit = db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")

    reviews = list(db.reviews.find({"church_id": visit["church_id"]}).sort("created_at", -1).limit(10))
    events = list(db.events.find({"church_id": visit["church_id"]}).sort("date", -1).limit(5))

    church_data = {
        "name": church["name"],
        "denomination": church.get("denomination"),
        "congregation_size": church.get("congregation_size"),
        "worship_style": church.get("worship_style"),
        "address": church.get("formatted_address"),
        "pastor_name": church.get("pastor_name"),
        "recent_reviews": [{"rating": r.get("rating"), "comment": r.get("comment", "")[:200]} for r in reviews],
        "recent_events": [{"title": e.get("title"), "attendance": e.get("attendance")} for e in events],
        "parking": church.get("parking_info"),
        "service_times": church.get("service_times", [])
    }

    prompt = f"""You are a pre-visit briefing AI for ChurchNavigator ministers.

CHURCH DATA:
{json.dumps(church_data, indent=2)}

Generate a comprehensive "Know Before You Go" briefing.

Return ONLY valid JSON:
{{
  "congregation_snapshot": "2-3 sentences about who attends",
  "what_resonates": "What this congregation responds to best",
  "what_to_avoid": "Topics or styles to avoid",
  "key_people": [{{
    "name": "Pastor James",
    "role": "Senior Pastor",
    "note": "Why to connect with them"
  }}],
  "practical_notes": "Parking, timing, dress code, honorarium",
  "relationship_opportunity": "Long-term partnership potential"
}}

Be specific, actionable, and encouraging."""

    response_text = call_claude(prompt, model="claude-sonnet-4-20250514", max_tokens=3000)
    
    try:
        result = json.loads(response_text)
        set_cached_ai_result(cache_key, result, ttl_hours=24)
        return result
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"AI briefing generation failed: {str(e)}")

@router.post("/{trip_id}/predict-impact")
async def predict_trip_impact(trip_id: str):
    trip = db.planner_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    visits = list(db.planner_visits.find({"trip_id": trip_id, "status": "confirmed"}))
    
    if not visits:
        raise HTTPException(status_code=400, detail="No confirmed visits to analyze")

    visit_details = []
    for v in visits:
        church = db.churches.find_one({"_id": ObjectId(v["church_id"])})
        if church:
            visit_details.append({
                "visit_id": str(v["_id"]),
                "church_name": church["name"],
                "congregation_size": church.get("congregation_size"),
                "service_type": v.get("service_type"),
                "datetime": v.get("scheduled_datetime", datetime.utcnow()).isoformat(),
                "denomination": church.get("denomination")
            })

    prompt = f"""You are a ministry impact prediction AI for ChurchNavigator.

CONFIRMED ITINERARY:
{json.dumps(visit_details, indent=2)}

Predict the real-world impact of this trip.

Return ONLY valid JSON:
{{
  "total_estimated_reach": 4200,
  "ministry_impact_score": 84,
  "predicted_outcomes": {{
    "new_partnerships": 3,
    "referrals_to_other_churches": 5,
    "estimated_lives_impacted": 4200,
    "follow_up_engagements": 12
  }},
  "visit_by_visit_impact": [
    {{
      "visit_id": "...",
      "church_name": "...",
      "estimated_attendance": 750,
      "impact_score": 92,
      "impact_reasoning": "Why this visit matters",
      "recommended_focus": "What to focus on"
    }}
  ],
  "trip_strengths": ["strength1", "strength2"],
  "trip_weaknesses": ["weakness1"],
  "improvement_suggestions": [
    {{
      "suggestion": "Specific actionable improvement",
      "impact_increase": "+340 people",
      "match_score_change": "+12 points"
    }}
  ],
  "ai_verdict": "2-3 sentence overall assessment"
}}

Be realistic but encouraging."""

    response_text = call_claude(prompt, model="claude-sonnet-4-20250514", max_tokens=4000)
    
    try:
        result = json.loads(response_text)
        return ImpactPrediction(**result)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"AI impact prediction failed: {str(e)}")

@router.post("/visits/{visit_id}/debrief")
async def generate_post_visit_debrief(visit_id: str):
    visit = db.planner_visits.find_one({"_id": ObjectId(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
    
    visit_data = {
        "church_name": church["name"] if church else "Unknown",
        "scheduled_datetime": visit.get("scheduled_datetime", datetime.utcnow()).isoformat(),
        "actual_attendance": visit.get("actual_attendance"),
        "minister_notes": visit.get("minister_notes", ""),
        "church_feedback": visit.get("church_feedback", ""),
        "service_type": visit.get("service_type"),
        "pastor_name": church.get("pastor_name") if church else ""
    }

    prompt = f"""You are a post-visit debrief AI for ChurchNavigator ministers.

VISIT DATA:
{json.dumps(visit_data, indent=2)}

Generate a quick actionable debrief.

Return ONLY valid JSON:
{{
  "visit_summary": "2 sentences on how it went",
  "key_moments": ["moment1", "moment2"],
  "follow_up_actions": [
    {{
      "action": "Send thank you to Pastor",
      "deadline": "Within 24 hours",
      "template": "post_visit_thankyou",
      "auto_draft": true
    }}
  ],
  "partnership_potential": "HIGH/MEDIUM/LOW - explanation",
  "notes_for_next_visit": "What to remember for next time"
}}

Be encouraging and action-focused."""

    response_text = call_claude(prompt, model="claude-3-5-haiku-20241022", max_tokens=2000)
    
    try:
        result = json.loads(response_text)
        db.planner_visits.update_one(
            {"_id": ObjectId(visit_id)},
            {"$set": {"ai_debrief": result, "debrief_generated_at": datetime.utcnow()}}
        )
        return Debrief(**result)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"AI debrief generation failed: {str(e)}")
