from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient, GEOSPHERE
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import anthropic
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not set")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set")

client = MongoClient(MONGODB_URI)
db = client["DEV-ChurchNavigator"]
churches_collection = db["churches"]
trips_collection = db["trips"]

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

churches_collection.create_index([("location", GEOSPHERE)])

class Church(BaseModel):
    name: str
    denomination: str
    address: str
    postcode: str
    city: str
    latitude: float
    longitude: float
    congregation_size: Optional[int] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    service_times: Optional[List[str]] = None
    image_url: Optional[str] = None
    senior_pastor: Optional[str] = None
    year_founded: Optional[int] = None
    facilities: Optional[List[str]] = None
    ministries: Optional[List[str]] = None

class TripItineraryItem(BaseModel):
    church_id: str
    date: str
    start_time: str
    end_time: str
    activity_type: str
    notes: Optional[str] = None

class Trip(BaseModel):
    name: str
    start_date: str
    end_date: str
    itinerary: List[TripItineraryItem] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/api/churches")
async def get_churches(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius: Optional[float] = Query(50),
    denomination: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    query = {}
    
    if denomination and denomination != "All":
        query["denomination"] = denomination
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"postcode": {"$regex": search, "$options": "i"}}
        ]
    
    if lat is not None and lng is not None:
        query["location"] = {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat]
                },
                "$maxDistance": radius * 1609.34
            }
        }
    
    churches = list(churches_collection.find(query).limit(limit))
    
    for church in churches:
        church["_id"] = str(church["_id"])
        if "location" in church and "coordinates" in church["location"]:
            church["longitude"] = church["location"]["coordinates"][0]
            church["latitude"] = church["location"]["coordinates"][1]
    
    return {"churches": churches, "count": len(churches)}

@app.get("/api/churches/{church_id}")
async def get_church(church_id: str):
    try:
        church = churches_collection.find_one({"_id": ObjectId(church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        church["_id"] = str(church["_id"])
        if "location" in church and "coordinates" in church["location"]:
            church["longitude"] = church["location"]["coordinates"][0]
            church["latitude"] = church["location"]["coordinates"][1]
        
        return church
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/planner/trips")
async def create_trip(trip: Trip):
    trip_dict = trip.dict()
    trip_dict["created_at"] = datetime.utcnow().isoformat()
    trip_dict["updated_at"] = datetime.utcnow().isoformat()
    
    result = trips_collection.insert_one(trip_dict)
    trip_dict["_id"] = str(result.inserted_id)
    
    return trip_dict

@app.get("/api/planner/trips/{trip_id}")
async def get_trip(trip_id: str):
    try:
        trip = trips_collection.find_one({"_id": ObjectId(trip_id)})
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        trip["_id"] = str(trip["_id"])
        return trip
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/planner/trips/{trip_id}")
async def update_trip(trip_id: str, trip: Trip):
    try:
        trip_dict = trip.dict()
        trip_dict["updated_at"] = datetime.utcnow().isoformat()
        
        result = trips_collection.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": trip_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        updated_trip = trips_collection.find_one({"_id": ObjectId(trip_id)})
        updated_trip["_id"] = str(updated_trip["_id"])
        
        return updated_trip
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/planner/trips/{trip_id}")
async def delete_trip(trip_id: str):
    try:
        result = trips_collection.delete_one({"_id": ObjectId(trip_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Trip not found")
        return {"message": "Trip deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/planner/trips/{trip_id}/analyse")
async def analyse_trip(trip_id: str):
    try:
        trip = trips_collection.find_one({"_id": ObjectId(trip_id)})
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        itinerary = trip.get("itinerary", [])
        if not itinerary:
            raise HTTPException(status_code=400, detail="Trip has no itinerary items")
        
        church_ids = [item["church_id"] for item in itinerary]
        churches = list(churches_collection.find({"_id": {"$in": [ObjectId(cid) for cid in church_ids]}}))
        church_map = {str(c["_id"]): c for c in churches}
        
        total_congregation = sum(church_map.get(cid, {}).get("congregation_size", 0) for cid in church_ids)
        social_reach_bonus = len(set(church_ids)) * 50
        ministry_reach = total_congregation + social_reach_bonus
        
        start_date = datetime.fromisoformat(trip["start_date"])
        end_date = datetime.fromisoformat(trip["end_date"])
        total_trip_hours = (end_date - start_date).total_seconds() / 3600
        
        active_hours = 0
        for item in itinerary:
            start = datetime.fromisoformat(f"{item['date']}T{item['start_time']}")
            end = datetime.fromisoformat(f"{item['date']}T{item['end_time']}")
            active_hours += (end - start).total_seconds() / 3600
        
        efficiency_score = min(100, (active_hours / max(total_trip_hours, 1)) * 100) if total_trip_hours > 0 else 0
        
        num_churches = len(set(church_ids))
        estimated_transport = num_churches * 50
        estimated_accommodation = max(0, (end_date - start_date).days) * 80
        meals_hosted = sum(1 for item in itinerary if item.get("activity_type") in ["Service", "Meeting"])
        estimated_cost = estimated_transport + estimated_accommodation
        
        ideal_cost = num_churches * 40
        cost_score = max(0, 100 - ((estimated_cost / max(ideal_cost, 1)) * 100)) if ideal_cost > 0 else 50
        
        impact_score = min(100, (ministry_reach / 500))
        trip_score = (impact_score * 0.4) + (efficiency_score * 0.35) + (cost_score * 0.25)
        
        if trip_score >= 90:
            score_band = "Excellent"
        elif trip_score >= 70:
            score_band = "Very Good"
        elif trip_score >= 50:
            score_band = "Good"
        elif trip_score >= 30:
            score_band = "Needs Improvement"
        else:
            score_band = "Reconsider"
        
        trip_summary = {
            "name": trip["name"],
            "duration_days": (end_date - start_date).days,
            "num_churches": num_churches,
            "total_congregation": total_congregation,
            "active_hours": round(active_hours, 1),
            "efficiency_percent": round(efficiency_score, 1)
        }
        
        prompt = f"""Analyse this missionary trip and provide commentary:

Trip: {trip_summary['name']}
Duration: {trip_summary['duration_days']} days
Churches: {trip_summary['num_churches']}
Total Congregation Reach: {trip_summary['total_congregation']}
Active Hours: {trip_summary['active_hours']}h
Efficiency: {trip_summary['efficiency_percent']}%
Estimated Cost: £{estimated_cost}
Trip Score: {round(trip_score, 1)}/100 ({score_band})

Provide:
1. One sentence overall commentary (max 15 words)
2. Three bullet points of what's working well (max 10 words each)
3. Two bullet points of suggestions to improve (max 12 words each)

Return as JSON:
{{
  "commentary": "...",
  "highlights": ["...", "...", "..."],
  "suggestions": ["...", "..."]
}}"""
        
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        ai_response = json.loads(message.content[0].text)
        
        all_churches = list(churches_collection.find({"_id": {"$nin": [ObjectId(cid) for cid in church_ids]}}).limit(100))
        recommendations = []
        
        for church in all_churches[:10]:
            cong = church.get("congregation_size", 0)
            extra_reach = cong + 50
            extra_cost = 50
            value_score = (extra_reach / max(extra_cost, 1)) * 10
            
            recommendations.append({
                "church_id": str(church["_id"]),
                "church_name": church.get("name", "Unknown"),
                "city": church.get("city", ""),
                "impact_score": round(extra_reach / 10, 1),
                "estimated_cost": extra_cost,
                "value_score": round(value_score, 1),
                "recommendation": f"Add {church.get('name', 'church')} to reach {cong} more people"
            })
        
        recommendations.sort(key=lambda x: x["value_score"], reverse=True)
        
        return {
            "trip_id": trip_id,
            "metrics": {
                "ministry_reach": ministry_reach,
                "efficiency_percent": round(efficiency_score, 1),
                "estimated_cost": estimated_cost,
                "transport_cost": estimated_transport,
                "accommodation_cost": estimated_accommodation,
                "meals_hosted_count": meals_hosted,
                "total_travel_time_hours": round(active_hours, 1),
                "rest_periods": round(total_trip_hours - active_hours, 1)
            },
            "trip_score": round(trip_score, 1),
            "score_band": score_band,
            "ai_commentary": ai_response["commentary"],
            "highlights": ai_response["highlights"],
            "suggestions": ai_response["suggestions"],
            "recommendations": recommendations[:3]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)