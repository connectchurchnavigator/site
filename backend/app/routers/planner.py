from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import re
from ..database import get_database
from ..models.planner import MinistryTrip, TripTemplate, ChurchPickerFilters, ChurchVisit, TripStructure
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

LANGUAGE_CONTEXTS = {
    "Telugu": {"preferences": "Extended worship, prophetic ministry", "service_length": "2-3 hours", "topics": "Family, prosperity, healing", "tips": "Greeting in Telugu appreciated", "note": "UK Telugu Christian community is one of the fastest-growing. Birmingham has 23 Telugu churches."},
    "Tamil": {"preferences": "Traditional hymns mixed with contemporary", "service_length": "2-2.5 hours", "topics": "Education, family values, migration testimony", "tips": "Respect for elders important", "note": "Large Sri Lankan Tamil community, especially in London."},
    "Yoruba": {"preferences": "Energetic praise, dancing, prophetic declarations", "service_length": "3-4 hours", "topics": "Breakthrough, prosperity, deliverance", "tips": "Dress formally, bring small gift for pastor", "note": "Largest Nigerian diaspora UK ~500,000. Expect vibrant, Spirit-led services."},
    "Igbo": {"preferences": "Corporate prayer, thanksgiving, testifying", "service_length": "2.5-3.5 hours", "topics": "Business success, education, family", "tips": "Punctuality valued, greet in Igbo", "note": "Igbo community very entrepreneurial, appreciate practical teaching."},
    "Malayalam": {"preferences": "Traditional liturgy, choir music", "service_length": "1.5-2 hours", "topics": "Scripture teaching, missions, social justice", "tips": "Keralite Christians are well-educated, expect depth", "note": "Keralite Christian community highly church-going, many Orthodox/Catholic."},
    "Twi": {"preferences": "Call-and-response, drumming, dance", "service_length": "3-4 hours", "topics": "Victory, spiritual warfare, prosperity", "tips": "Enthusiasm appreciated, bring energy", "note": "Ghanaian diaspora churches are warm and welcoming."},
    "Portuguese": {"preferences": "Worship bands, contemporary songs", "service_length": "2-2.5 hours", "topics": "Faith, community, transformation", "tips": "Brazilian vs Portuguese culture differs", "note": "Large Brazilian Pentecostal movement in UK."},
    "Spanish": {"preferences": "Latin worship style, passionate prayer", "service_length": "2-3 hours", "topics": "Hope, family, immigration journey", "tips": "Latin American congregations are familia-oriented", "note": "Diverse: Colombian, Ecuadorian, Spanish communities."},
    "Polish": {"preferences": "Catholic liturgy or charismatic Protestant", "service_length": "1-2 hours", "topics": "Faith resilience, Mary devotion, tradition", "tips": "Respect Catholic traditions if applicable", "note": "Large Polish community, mostly Catholic but growing Protestant."},
    "Mandarin": {"preferences": "Structured teaching, small groups", "service_length": "1.5-2 hours", "topics": "Discipleship, apologetics, community", "tips": "Intellectual approach valued", "note": "Chinese churches often have strong Bible study culture."}
}

@router.get("/church-picker")
async def get_churches_for_picker(
    q: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    size: Optional[str] = None,
    language: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,
    trip_id: Optional[str] = None,
    service_days: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db = Depends(get_database)
):
    query = {"status": "active"}
    
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
        size_map = {
            "small": {"$lt": 100},
            "medium": {"$gte": 100, "$lt": 500},
            "large": {"$gte": 500, "$lt": 1000},
            "mega": {"$gte": 1000}
        }
        if size.lower() in size_map:
            query["congregation_size"] = size_map[size.lower()]
    
    if language:
        query["languages"] = {"$in": [language]}
    
    if open_to_visits is not None:
        query["open_to_visits"] = open_to_visits
    
    if service_days:
        days = service_days.split(",")
        query["service_days"] = {"$in": days}
    
    if lat and lng and radius:
        query["location"] = {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius * 1609.34
            }
        }
    
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.churches.count_documents(query)
    
    result_churches = []
    for church in churches:
        church["_id"] = str(church["_id"])
        church["match_score"] = None
        if trip_id:
            pass
        result_churches.append(church)
    
    cultural_context = None
    if language and language in LANGUAGE_CONTEXTS:
        cultural_context = LANGUAGE_CONTEXTS[language]
    
    return {
        "churches": result_churches,
        "total": total,
        "cultural_context": cultural_context
    }

@router.get("/languages")
async def get_languages(db = Depends(get_database)):
    pipeline = [
        {"$unwind": "$languages"},
        {"$group": {"_id": "$languages", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.churches.aggregate(pipeline).to_list(length=100)
    
    languages = [
        {"name": r["_id"], "count": r["count"], "has_context": r["_id"] in LANGUAGE_CONTEXTS}
        for r in results if r["_id"]
    ]
    
    return {"languages": languages}

@router.post("/templates")
async def create_template(
    template: TripTemplate,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    template.created_by_user_id = current_user["user_id"]
    template.created_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    
    template_dict = template.dict(by_alias=True, exclude={"_id"})
    result = await db.planner_templates.insert_one(template_dict)
    
    return {"template_id": str(result.inserted_id), "message": "Template created successfully"}

@router.get("/templates")
async def get_templates(
    visibility: Optional[str] = None,
    tags: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    query = {}
    
    if visibility == "my":
        query["created_by_user_id"] = current_user["user_id"]
    elif visibility == "org":
        query["$or"] = [
            {"org_id": current_user.get("org_id")},
            {"visibility": "org", "org_id": current_user.get("org_id")}
        ]
    elif visibility == "public":
        query["visibility"] = "public"
    elif visibility == "curated":
        query["visibility"] = "curated"
    
    if tags:
        tag_list = tags.split(",")
        query["tags"] = {"$in": tag_list}
    
    templates = await db.planner_templates.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.planner_templates.count_documents(query)
    
    for template in templates:
        template["_id"] = str(template["_id"])
    
    return {"templates": templates, "total": total}

@router.get("/templates/{template_id}")
async def get_template(template_id: str, db = Depends(get_database)):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")
    
    template = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template["_id"] = str(template["_id"])
    return template

@router.post("/trips/from-template")
async def create_trip_from_template(
    template_id: str,
    start_date: str,
    missionary_name: str,
    missionary_denomination: Optional[str] = "",
    ministry_focus: Optional[str] = "",
    languages: Optional[List[str]] = [],
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")
    
    template = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    total_days = template["trip_structure"]["total_days"]
    end_dt = start_dt + timedelta(days=total_days - 1)
    
    visits = []
    for church_visit in template["trip_structure"]["churches"]:
        visit_date = start_dt + timedelta(days=church_visit["day_number"] - 1)
        visits.append({
            "church_id": church_visit["church_id"],
            "church_name": church_visit["church_name"],
            "day_number": church_visit["day_number"],
            "time_slot": church_visit["time_slot"],
            "visit_type": church_visit["visit_type"],
            "notes": church_visit.get("notes", ""),
            "status": "pending"
        })
    
    trip = {
        "user_id": current_user["user_id"],
        "org_id": current_user.get("org_id"),
        "missionary_name": missionary_name,
        "missionary_denomination": missionary_denomination,
        "ministry_focus": ministry_focus,
        "languages": languages or [],
        "start_date": start_dt,
        "end_date": end_dt,
        "total_days": total_days,
        "cities": template["trip_structure"]["cities"],
        "visits": visits,
        "status": "draft",
        "template_id": template_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "collaborators": [],
        "notes": ""
    }
    
    result = await db.ministry_trips.insert_one(trip)
    
    await db.planner_templates.update_one(
        {"_id": ObjectId(template_id)},
        {
            "$inc": {"use_count": 1},
            "$set": {"last_used": datetime.utcnow()}
        }
    )
    
    return {"trip_id": str(result.inserted_id), "message": "Trip created from template successfully"}

@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    template: TripTemplate,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")
    
    existing = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if existing["created_by_user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this template")
    
    template.updated_at = datetime.utcnow()
    template_dict = template.dict(by_alias=True, exclude={"_id", "created_at", "created_by_user_id", "use_count"})
    
    await db.planner_templates.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": template_dict}
    )
    
    return {"message": "Template updated successfully"}

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")
    
    existing = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if existing["created_by_user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")
    
    await db.planner_templates.delete_one({"_id": ObjectId(template_id)})
    
    return {"message": "Template deleted successfully"}