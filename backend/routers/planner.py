from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from ..database import db
from ..auth import get_current_user
import math

router = APIRouter(prefix="/api/planner", tags=["planner"])

class ChurchPickerResult(BaseModel):
    id: str
    name: str
    city: str
    postcode: Optional[str]
    denomination: Optional[str]
    congregation_size: Optional[int]
    image_url: Optional[str]
    languages: List[str] = []
    open_to_visits: bool = False
    service_days: List[str] = []
    match_score: Optional[int] = None
    distance_miles: Optional[float] = None
    lat: Optional[float]
    lng: Optional[float]

class SlotData(BaseModel):
    day_number: int
    time_slot: str
    visit_type: str
    notes: Optional[str] = ""

class AddChurchToTrip(BaseModel):
    church_id: str
    slot: SlotData

class TripStructure(BaseModel):
    total_days: int
    cities: List[str]
    churches: List[dict]
    daily_structure: List[dict]

class CreateTemplate(BaseModel):
    trip_id: str
    name: str
    description: str
    tags: List[str]
    visibility: str = "private"
    include_churches: bool = True
    include_structure: bool = True
    include_notes: bool = True

class CreateTripFromTemplate(BaseModel):
    template_id: str
    start_date: str
    missionary_name: str
    missionary_denomination: Optional[str]
    ministry_focus: Optional[str]
    languages: List[str] = []
    customizations: Optional[dict] = {}

class TemplateReview(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str]

def calculate_distance(lat1, lon1, lat2, lon2):
    if not all([lat1, lon1, lat2, lon2]):
        return None
    R = 3959
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 1)

def calculate_match_score(church, trip_context):
    score = 50
    if trip_context.get("preferred_denominations") and church.get("denomination") in trip_context["preferred_denominations"]:
        score += 20
    if trip_context.get("languages"):
        church_langs = set(church.get("languages", []))
        trip_langs = set(trip_context["languages"])
        if church_langs & trip_langs:
            score += 15
    if trip_context.get("min_congregation") and church.get("congregation_size", 0) >= trip_context["min_congregation"]:
        score += 10
    if church.get("open_to_visits"):
        score += 5
    return min(score, 100)

@router.get("/church-picker")
async def church_picker(
    q: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    size: Optional[str] = None,
    language: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    service_day: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[int] = None,
    trip_id: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    query = {"status": "approved"}
    
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"pastor_name": {"$regex": q, "$options": "i"}}
        ]
    
    if city and city != "All UK":
        query["city"] = {"$regex": city, "$options": "i"}
    
    if denomination and denomination != "All":
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    if size:
        size_ranges = {
            "Small": {"$lt": 100},
            "Medium": {"$gte": 100, "$lt": 500},
            "Large": {"$gte": 500, "$lt": 1000},
            "Mega": {"$gte": 1000}
        }
        if size in size_ranges:
            query["congregation_size"] = size_ranges[size]
    
    if language:
        query["languages"] = {"$in": [language]}
    
    if open_to_visits is not None:
        query["open_to_visits"] = open_to_visits
    
    if service_day:
        query["service_days"] = {"$in": [service_day]}
    
    churches_cursor = db.churches.find(query).limit(limit)
    churches = list(churches_cursor)
    
    trip_context = None
    if trip_id:
        try:
            trip = db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
            if trip:
                trip_context = {
                    "preferred_denominations": trip.get("preferred_denominations", []),
                    "languages": trip.get("languages", []),
                    "min_congregation": trip.get("min_congregation_size")
                }
        except:
            pass
    
    results = []
    for church in churches:
        distance = None
        if lat and lng and church.get("coordinates"):
            church_coords = church["coordinates"].get("coordinates", [])
            if len(church_coords) == 2:
                distance = calculate_distance(lat, lng, church_coords[1], church_coords[0])
        
        if radius and distance and distance > radius:
            continue
        
        match_score = None
        if trip_context:
            match_score = calculate_match_score(church, trip_context)
        
        church_coords = church.get("coordinates", {}).get("coordinates", [])
        results.append(ChurchPickerResult(
            id=str(church["_id"]),
            name=church["name"],
            city=church.get("city", ""),
            postcode=church.get("postcode"),
            denomination=church.get("denomination"),
            congregation_size=church.get("congregation_size"),
            image_url=church.get("image_url"),
            languages=church.get("languages", []),
            open_to_visits=church.get("open_to_visits", False),
            service_days=church.get("service_days", []),
            match_score=match_score,
            distance_miles=distance,
            lat=church_coords[1] if len(church_coords) == 2 else None,
            lng=church_coords[0] if len(church_coords) == 2 else None
        ))
    
    if trip_context:
        results.sort(key=lambda x: x.match_score or 0, reverse=True)
    elif lat and lng:
        results.sort(key=lambda x: x.distance_miles or 999)
    
    return {"churches": results, "total": len(results)}

@router.post("/trips/{trip_id}/add-church")
async def add_church_to_trip(trip_id: str, data: AddChurchToTrip, user=Depends(get_current_user)):
    try:
        trip = db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        if str(trip["user_id"]) != str(user["_id"]) and str(user["_id"]) not in [str(c) for c in trip.get("collaborators", [])]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        church = db.churches.find_one({"_id": ObjectId(data.church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        visit = {
            "_id": ObjectId(),
            "church_id": ObjectId(data.church_id),
            "church_name": church["name"],
            "church_city": church.get("city"),
            "day_number": data.slot.day_number,
            "time_slot": data.slot.time_slot,
            "visit_type": data.slot.visit_type,
            "notes": data.slot.notes,
            "status": "pending",
            "added_at": datetime.utcnow()
        }
        
        db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$push": {"visits": visit}}
        )
        
        return {"success": True, "visit_id": str(visit["_id"]), "message": "Church added to trip"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
async def get_languages():
    pipeline = [
        {"$match": {"status": "approved", "languages": {"$exists": True, "$ne": []}}},
        {"$unwind": "$languages"},
        {"$group": {"_id": "$languages", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = list(db.churches.aggregate(pipeline))
    
    language_groups = {
        "African": ["Yoruba", "Igbo", "Twi", "Akan", "Ga", "Ewe", "Hausa", "Amharic", "Tigrinya", "Somali", "Swahili", "Zulu", "Xhosa", "Shona", "Ndebele", "Lingala", "Wolof"],
        "South Asian": ["Telugu", "Tamil", "Malayalam", "Hindi", "Urdu", "Punjabi", "Gujarati", "Sinhala", "Bengali"],
        "East/Southeast Asian": ["Mandarin", "Cantonese", "Korean", "Filipino", "Tagalog", "Vietnamese", "Indonesian"],
        "European": ["Portuguese", "Spanish", "Polish", "Romanian", "French"],
        "Middle Eastern": ["Arabic", "Persian", "Farsi", "Aramaic"],
        "Other": ["English"]
    }
    
    grouped_languages = {group: [] for group in language_groups}
    grouped_languages["Other"] = []
    
    for result in results:
        lang = result["_id"]
        count = result["count"]
        placed = False
        for group, langs in language_groups.items():
            if lang in langs:
                grouped_languages[group].append({"language": lang, "count": count})
                placed = True
                break
        if not placed:
            grouped_languages["Other"].append({"language": lang, "count": count})
    
    return {"languages": grouped_languages}

@router.post("/templates")
async def create_template(data: CreateTemplate, user=Depends(get_current_user)):
    try:
        trip = db.ministry_trips.find_one({"_id": ObjectId(data.trip_id)})
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        if str(trip["user_id"]) != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Only trip owner can create template")
        
        churches_data = []
        cities = set()
        if data.include_churches and trip.get("visits"):
            for visit in trip["visits"]:
                church_data = {
                    "church_id": str(visit.get("church_id", "")),
                    "church_name": visit.get("church_name", ""),
                    "day_number": visit.get("day_number"),
                    "time_slot": visit.get("time_slot"),
                    "visit_type": visit.get("visit_type"),
                    "notes": visit.get("notes", "") if data.include_notes else ""
                }
                churches_data.append(church_data)
                if visit.get("church_city"):
                    cities.add(visit["church_city"])
        
        daily_structure = []
        if data.include_structure:
            days = {}
            for visit in trip.get("visits", []):
                day_num = visit.get("day_number", 1)
                if day_num not in days:
                    days[day_num] = {"day": day_num, "visits": 0, "time_slots": []}
                days[day_num]["visits"] += 1
                days[day_num]["time_slots"].append(visit.get("time_slot"))
            daily_structure = list(days.values())
        
        template = {
            "created_by_user_id": ObjectId(user["_id"]),
            "org_id": user.get("org_id"),
            "name": data.name,
            "description": data.description,
            "tags": data.tags,
            "visibility": data.visibility,
            "trip_structure": {
                "total_days": trip.get("total_days", len(daily_structure)),
                "cities": list(cities),
                "churches": churches_data,
                "daily_structure": daily_structure
            },
            "use_count": 0,
            "avg_trip_score": 0,
            "last_used": None,
            "reviews": [],
            "created_at": datetime.utcnow()
        }
        
        result = db.planner_templates.insert_one(template)
        return {"success": True, "template_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_templates(
    visibility: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    
    if visibility == "mine":
        query["created_by_user_id"] = ObjectId(user["_id"])
    elif visibility == "org":
        if user.get("org_id"):
            query["$or"] = [
                {"org_id": user["org_id"], "visibility": {"$in": ["org", "public"]}},
                {"created_by_user_id": ObjectId(user["_id"])}
            ]
    elif visibility == "public":
        query["visibility"] = "public"
    else:
        query["$or"] = [
            {"created_by_user_id": ObjectId(user["_id"])},
            {"org_id": user.get("org_id"), "visibility": {"$in": ["org", "public"]}},
            {"visibility": "public"}
        ]
    
    if tags:
        tag_list = tags.split(",")
        query["tags"] = {"$in": tag_list}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    templates = list(db.planner_templates.find(query).sort("use_count", -1))
    
    results = []
    for template in templates:
        creator = db.users.find_one({"_id": template["created_by_user_id"]})
        results.append({
            "id": str(template["_id"]),
            "name": template["name"],
            "description": template["description"],
            "tags": template["tags"],
            "visibility": template["visibility"],
            "creator_name": creator.get("name", "Unknown") if creator else "Unknown",
            "use_count": template["use_count"],
            "avg_trip_score": template["avg_trip_score"],
            "total_days": template["trip_structure"]["total_days"],
            "total_churches": len(template["trip_structure"]["churches"]),
            "cities": template["trip_structure"]["cities"],
            "created_at": template["created_at"].isoformat()
        })
    
    return {"templates": results, "total": len(results)}

@router.get("/templates/{template_id}")
async def get_template_detail(template_id: str, user=Depends(get_current_user)):
    try:
        template = db.planner_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        can_view = (
            str(template["created_by_user_id"]) == str(user["_id"]) or
            template["visibility"] == "public" or
            (template["visibility"] == "org" and template.get("org_id") == user.get("org_id"))
        )
        
        if not can_view:
            raise HTTPException(status_code=403, detail="Not authorized to view this template")
        
        creator = db.users.find_one({"_id": template["created_by_user_id"]})
        
        return {
            "id": str(template["_id"]),
            "name": template["name"],
            "description": template["description"],
            "tags": template["tags"],
            "visibility": template["visibility"],
            "creator_name": creator.get("name", "Unknown") if creator else "Unknown",
            "use_count": template["use_count"],
            "avg_trip_score": template["avg_trip_score"],
            "trip_structure": template["trip_structure"],
            "reviews": template.get("reviews", []),
            "created_at": template["created_at"].isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trips/from-template")
async def create_trip_from_template(data: CreateTripFromTemplate, user=Depends(get_current_user)):
    try:
        template = db.planner_templates.find_one({"_id": ObjectId(data.template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        can_use = (
            str(template["created_by_user_id"]) == str(user["_id"]) or
            template["visibility"] == "public" or
            (template["visibility"] == "org" and template.get("org_id") == user.get("org_id"))
        )
        
        if not can_use:
            raise HTTPException(status_code=403, detail="Not authorized to use this template")
        
        start_date = datetime.fromisoformat(data.start_date)
        
        visits = []
        for church_data in template["trip_structure"]["churches"]:
            if data.customizations.get("skip_churches") and church_data["church_id"] in data.customizations["skip_churches"]:
                continue
            
            visit = {
                "_id": ObjectId(),
                "church_id": ObjectId(church_data["church_id"]),
                "church_name": church_data["church_name"],
                "day_number": church_data["day_number"],
                "time_slot": church_data["time_slot"],
                "visit_type": church_data["visit_type"],
                "notes": church_data["notes"],
                "status": "pending"
            }
            visits.append(visit)
        
        trip = {
            "user_id": ObjectId(user["_id"]),
            "template_id": ObjectId(data.template_id),
            "missionary_name": data.missionary_name,
            "missionary_denomination": data.missionary_denomination,
            "ministry_focus": data.ministry_focus,
            "languages": data.languages,
            "start_date": start_date,
            "total_days": template["trip_structure"]["total_days"],
            "visits": visits,
            "status": "draft",
            "collaborators": [],
            "created_at": datetime.utcnow()
        }
        
        result = db.ministry_trips.insert_one(trip)
        
        db.planner_templates.update_one(
            {"_id": ObjectId(data.template_id)},
            {
                "$inc": {"use_count": 1},
                "$set": {"last_used": datetime.utcnow()}
            }
        )
        
        return {"success": True, "trip_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/review")
async def add_template_review(template_id: str, review: TemplateReview, user=Depends(get_current_user)):
    try:
        template = db.planner_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        trip_using_template = db.ministry_trips.find_one({
            "user_id": ObjectId(user["_id"]),
            "template_id": ObjectId(template_id)
        })
        
        if not trip_using_template:
            raise HTTPException(status_code=403, detail="Can only review templates you've used")
        
        review_data = {
            "user_id": ObjectId(user["_id"]),
            "user_name": user.get("name", "Anonymous"),
            "rating": review.rating,
            "comment": review.comment,
            "created_at": datetime.utcnow()
        }
        
        db.planner_templates.update_one(
            {"_id": ObjectId(template_id)},
            {"$push": {"reviews": review_data}}
        )
        
        template = db.planner_templates.find_one({"_id": ObjectId(template_id)})
        reviews = template.get("reviews", [])
        if reviews:
            avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
            db.planner_templates.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": {"avg_trip_score": round(avg_rating * 20)}}
            )
        
        return {"success": True, "message": "Review added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user)):
    try:
        template = db.planner_templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if str(template["created_by_user_id"]) != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Only template creator can delete")
        
        db.planner_templates.delete_one({"_id": ObjectId(template_id)})
        return {"success": True, "message": "Template deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))