from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import os
import anthropic
import httpx
import json
import secrets
from ..database import get_database
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

class ExtractRequest(BaseModel):
    free_text: str
    user_id: str

class BuildRequest(BaseModel):
    extracted_data: Dict[str, Any]

class OptimiseRequest(BaseModel):
    itinerary: List[Dict[str, Any]]

class UpdateRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    itinerary: Optional[List[Dict[str, Any]]] = None

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    return doc

async def call_claude(system: str, user_message: str, max_tokens: int = 4000) -> str:
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_message}]
        )
        return message.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")

async def get_travel_time(origin: Dict, destination: Dict) -> int:
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"https://router.project-osrm.org/route/v1/driving/{origin['lng']},{origin['lat']};{destination['lng']},{destination['lat']}",
                params={"overview": "false"},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("routes"):
                    return int(data["routes"][0]["duration"] / 60)
    except:
        pass
    return 30

@router.post("/extract")
async def extract_trip_details(request: ExtractRequest, db=Depends(get_database)):
    system = """You are an expert trip planner. Extract structured trip details from natural language.

Return ONLY valid JSON with this exact structure:
{
  "visitor_name": "string or null",
  "visitor_role": "string or null",
  "visitor_from": "country/city or null",
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "base_location": "city name or null",
  "accommodation_area": "neighborhood/area or null",
  "must_attend": [{"type": "meeting|event|service", "name": "string", "date": "YYYY-MM-DD or null", "time": "HH:MM or null", "location": "string or null"}],
  "preferences": {
    "denominations": ["string"],
    "min_churches": number or null,
    "focus_topics": ["string"]
  },
  "logistics": {
    "arrival_airport": "code or null",
    "arrival_date": "YYYY-MM-DD or null",
    "arrival_time": "HH:MM or null",
    "transport_notes": "string or null"
  },
  "confidence": {"visitor_name": 0-100, "start_date": 0-100, "base_location": 0-100},
  "missing_required": ["field names"]
}

Rules:
- Use null if information not provided
- Infer reasonable defaults where appropriate
- Confidence scores: 100=explicit, 80=strong inference, 50=weak inference, 0=missing
- missing_required: list fields that are critical but missing"""

    response_text = await call_claude(system, request.free_text)
    
    try:
        extracted = json.loads(response_text)
    except:
        raise HTTPException(status_code=500, detail="Failed to parse Claude response")
    
    return {"extracted": extracted}

@router.post("/build")
async def build_itinerary(request: BuildRequest, db=Depends(get_database)):
    data = request.extracted_data
    
    if not data.get("base_location") or not data.get("start_date") or not data.get("end_date"):
        raise HTTPException(status_code=400, detail="Missing required fields: base_location, start_date, end_date")
    
    start = datetime.fromisoformat(data["start_date"])
    end = datetime.fromisoformat(data["end_date"])
    duration = (end - start).days + 1
    
    prefs = data.get("preferences", {})
    query = {"location.city": {"$regex": data["base_location"], "$options": "i"}}
    if prefs.get("denominations"):
        query["denomination"] = {"$in": prefs["denominations"]}
    
    churches = list(db.churches.find(query).limit(50))
    
    events_query = {
        "location.city": {"$regex": data["base_location"], "$options": "i"},
        "date": {"$gte": data["start_date"], "$lte": data["end_date"]}
    }
    events = list(db.events.find(events_query).limit(20))
    
    context = {
        "trip_details": data,
        "duration_days": duration,
        "available_churches": [{"name": c["name"], "denomination": c.get("denomination"), "area": c.get("location", {}).get("area"), "lat": c.get("location", {}).get("lat"), "lng": c.get("location", {}).get("lng")} for c in churches[:20]],
        "available_events": [{"name": e["name"], "date": e["date"], "time": e.get("time"), "location": e.get("location")} for e in events]
    }
    
    system = """You are an expert trip planner. Build a day-by-day itinerary.

Return ONLY valid JSON:
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "items": [
        {
          "time": "HH:MM",
          "type": "arrival|meeting|church_visit|event|departure|free_time",
          "name": "string",
          "location": "string",
          "notes": "string or null",
          "status": "confirmed|tentative",
          "contact": "string or null"
        }
      ]
    }
  ]
}

Rules:
- Include ALL must_attend items
- Max 10 active hours per day (8am-6pm)
- Group nearby churches on same day
- Leave 45-60 min travel time between locations
- Include arrival/departure logistics
- Add free_time slots for meals/rest
- Realistic timing (church visits: 90-120 min, meetings: 60 min)"""
    
    response_text = await call_claude(system, json.dumps(context), max_tokens=6000)
    
    try:
        result = json.loads(response_text)
        itinerary = result["itinerary"]
    except:
        raise HTTPException(status_code=500, detail="Failed to parse itinerary")
    
    must_attend = data.get("must_attend", [])
    must_attend_included = []
    for item in must_attend:
        found = False
        for day in itinerary:
            if any(item["name"].lower() in day_item["name"].lower() for day_item in day["items"]):
                found = True
                break
        must_attend_included.append({"item": item["name"], "included": found})
    
    warnings = []
    if any(not x["included"] for x in must_attend_included):
        warnings.append("Some must-attend items missing from itinerary")
    
    for day in itinerary:
        if len(day["items"]) > 8:
            warnings.append(f"Day {day['day']} has {len(day['items'])} items - may be too packed")
    
    feasibility = {
        "is_feasible": len(warnings) == 0,
        "score": 100 - (len(warnings) * 15),
        "warnings": warnings,
        "must_attend_check": must_attend_included
    }
    
    summary_system = "Summarize this trip itinerary in 2-3 sentences. Focus on key highlights and overall flow."
    ai_summary = await call_claude(summary_system, json.dumps(itinerary), max_tokens=200)
    
    return {
        "itinerary": itinerary,
        "feasibility": feasibility,
        "ai_summary": ai_summary
    }

@router.post("/optimise")
async def optimise_itinerary(request: OptimiseRequest, db=Depends(get_database)):
    system = """You are an expert trip optimizer. Reorder itinerary items to minimize travel time.

Return ONLY valid JSON with same structure as input, but with optimized order.

Rules:
- Keep must-attend items at their fixed times
- Group nearby locations on same day
- Minimize backtracking
- Maintain realistic timing
- Note changes made

Also return:
{
  "optimised_itinerary": [...],
  "time_saved_minutes": number,
  "changes": ["description of each change"]
}"""
    
    response_text = await call_claude(system, json.dumps(request.itinerary), max_tokens=6000)
    
    try:
        result = json.loads(response_text)
        return result
    except:
        raise HTTPException(status_code=500, detail="Failed to parse optimisation result")

@router.post("/create")
async def create_trip(request: BuildRequest, user=Depends(get_current_user), db=Depends(get_database)):
    data = request.extracted_data
    
    build_result = await build_itinerary(request, db)
    
    start = datetime.fromisoformat(data["start_date"])
    end = datetime.fromisoformat(data["end_date"])
    duration = (end - start).days + 1
    
    trip = {
        "user_id": user["_id"],
        "title": f"{data.get('visitor_name', 'Trip')} - {data['base_location']}",
        "status": "draft",
        "visitor_name": data.get("visitor_name"),
        "visitor_role": data.get("visitor_role"),
        "visitor_from": data.get("visitor_from"),
        "start_date": data["start_date"],
        "end_date": data["end_date"],
        "duration_days": duration,
        "base_location": data["base_location"],
        "accommodation_area": data.get("accommodation_area"),
        "must_attend": data.get("must_attend", []),
        "preferences": data.get("preferences", {}),
        "logistics": data.get("logistics", {}),
        "itinerary": build_result["itinerary"],
        "feasibility": build_result["feasibility"],
        "ai_summary": build_result["ai_summary"],
        "share_token": secrets.token_urlsafe(16),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = db.ministry_trips.insert_one(trip)
    trip["_id"] = result.inserted_id
    
    return serialize_doc(trip)

@router.get("/{trip_id}")
async def get_trip(trip_id: str, user=Depends(get_current_user), db=Depends(get_database)):
    try:
        trip = db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["_id"]})
    except:
        raise HTTPException(status_code=400, detail="Invalid trip ID")
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return serialize_doc(trip)

@router.put("/{trip_id}")
async def update_trip(trip_id: str, request: UpdateRequest, user=Depends(get_current_user), db=Depends(get_database)):
    try:
        oid = ObjectId(trip_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid trip ID")
    
    trip = db.ministry_trips.find_one({"_id": oid, "user_id": user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    if request.title is not None:
        update_data["title"] = request.title
    if request.status is not None:
        update_data["status"] = request.status
    if request.itinerary is not None:
        update_data["itinerary"] = request.itinerary
    
    db.ministry_trips.update_one({"_id": oid}, {"$set": update_data})
    
    updated_trip = db.ministry_trips.find_one({"_id": oid})
    return serialize_doc(updated_trip)

@router.get("/{trip_id}/share")
async def get_shared_trip(trip_id: str, db=Depends(get_database)):
    try:
        trip = db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid trip ID")
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    public_trip = {
        "title": trip["title"],
        "visitor_name": trip.get("visitor_name"),
        "visitor_role": trip.get("visitor_role"),
        "visitor_from": trip.get("visitor_from"),
        "start_date": trip["start_date"],
        "end_date": trip["end_date"],
        "duration_days": trip["duration_days"],
        "base_location": trip["base_location"],
        "itinerary": trip["itinerary"],
        "ai_summary": trip.get("ai_summary")
    }
    
    return serialize_doc(public_trip)

@router.get("/user/trips")
async def get_user_trips(user=Depends(get_current_user), db=Depends(get_database)):
    trips = list(db.ministry_trips.find({"user_id": user["_id"]}).sort("created_at", -1))
    return serialize_doc(trips)