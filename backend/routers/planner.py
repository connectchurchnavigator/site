from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
import math

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

class ChurchInPicker(BaseModel):
    id: str
    name: str
    city: str
    postcode: Optional[str] = None
    denomination: Optional[str] = None
    congregation_size: Optional[int] = None
    photo_url: Optional[str] = None
    open_to_visits: bool = False
    languages: List[str] = []
    service_days: List[str] = []
    match_score: Optional[int] = None
    distance_miles: Optional[float] = None

class AddChurchToTripRequest(BaseModel):
    church_id: str
    day_number: int
    time_slot: str
    visit_type: str
    notes: Optional[str] = None

class SaveTemplateRequest(BaseModel):
    name: str
    description: str
    tags: List[str]
    visibility: str
    include_notes: bool = True

class CreateTripFromTemplateRequest(BaseModel):
    template_id: str
    start_date: str
    missionary_name: str
    missionary_denomination: Optional[str] = None
    missionary_focus: Optional[str] = None
    missionary_languages: List[str] = []
    customizations: Optional[dict] = None

LANGUAGE_CONTEXT = {
    "Telugu": {
        "region": "South Asian",
        "context": "UK Telugu Christian community is one of the fastest-growing congregations. Birmingham has 23 Telugu churches, many meeting in homes or rented halls.",
        "worship_style": "Extended worship sessions with contemporary and traditional Telugu Christian songs. Prophetic ministry highly valued.",
        "service_length": "2-3 hours typical, often longer on special occasions",
        "topics": "Family values, prosperity, healing, breakthrough, spiritual warfare",
        "etiquette": "Even a greeting or scripture in Telugu will be deeply appreciated. Dress modestly and conservatively."
    },
    "Tamil": {
        "region": "South Asian",
        "context": "Large Sri Lankan and Indian Tamil diaspora. Strong church attendance culture, especially among Sri Lankan Tamil Christians.",
        "worship_style": "Mix of traditional hymns and contemporary worship. Value reverence and order in services.",
        "service_length": "2-2.5 hours",
        "topics": "Faith in adversity, family unity, education, healing",
        "etiquette": "Formal greetings appreciated. Remove shoes if entering homes. Modest dress essential."
    },
    "Yoruba": {
        "region": "African",
        "context": "Largest Nigerian diaspora in UK (~500,000). Vibrant, expressive worship culture with strong Pentecostal influence.",
        "worship_style": "High-energy praise and worship, dance, prophetic declarations. Expect 'praise breaks' and spontaneous worship.",
        "service_length": "3-4 hours common, especially on Sundays",
        "topics": "Breakthrough, prosperity, deliverance, spiritual warfare, covenant blessings",
        "etiquette": "Dress very well - appearance matters. Be prepared for long services. Accepting prayer cloth or anointing oil is respectful."
    },
    "Igbo": {
        "region": "African",
        "context": "Strong Igbo Christian community across UK, particularly London and Manchester. Known for entrepreneurial spirit.",
        "worship_style": "Energetic worship with traditional Igbo gospel songs. Value testimonies and practical teaching.",
        "service_length": "2.5-3.5 hours",
        "topics": "Business success, prosperity, family, breakthrough, wisdom",
        "etiquette": "Professional attire recommended. Punctuality valued. Gift-giving culture - small token appreciated."
    },
    "Twi": {
        "region": "African",
        "context": "Ghanaian Akan-speaking community. Strong Presbyterian and Pentecostal traditions. Very hospitable.",
        "worship_style": "Mix of hymns and contemporary worship. Choirs highly valued. Expect multiple music ministrations.",
        "service_length": "2.5-3 hours",
        "topics": "Gratitude, perseverance, education, family values, prosperity",
        "etiquette": "Formal dress. Greet elders first. Stay for refreshments after service - refusing is considered rude."
    },
    "Malayalam": {
        "region": "South Asian",
        "context": "Keralite Christian community - ancient Christian heritage. Well-educated, strong church-going culture.",
        "worship_style": "Liturgical or contemporary depending on tradition (Orthodox, Catholic, Pentecostal). Value reverence.",
        "service_length": "1.5-2.5 hours",
        "topics": "Faith and reason, social justice, family, education, spiritual growth",
        "etiquette": "Formal attire. Intellectual approach appreciated. Many are highly educated professionals."
    },
    "Portuguese": {
        "region": "European",
        "context": "Brazilian and Portuguese diaspora. Brazilian Pentecostal churches growing rapidly in UK.",
        "worship_style": "Warm, expressive worship. Brazilian churches very Pentecostal with emphasis on Holy Spirit.",
        "service_length": "2-3 hours",
        "topics": "Victory, breakthrough, healing, family restoration, prosperity",
        "etiquette": "Friendly and informal culture. Hugs and physical greetings common. Expect strong emotional expression."
    },
    "Spanish": {
        "region": "European",
        "context": "Latin American diaspora from various countries. Growing Spanish-speaking evangelical movement.",
        "worship_style": "Passionate worship with Latin rhythms. Strong emphasis on prayer and intercession.",
        "service_length": "2-3 hours",
        "topics": "Faith, family, deliverance, provision, identity in Christ",
        "etiquette": "Warm greetings. Family-oriented culture. Children often present throughout service."
    },
    "Amharic": {
        "region": "African",
        "context": "Ethiopian and Eritrean Orthodox and evangelical communities. Ancient Christian heritage.",
        "worship_style": "Orthodox churches very liturgical. Evangelical churches more contemporary but retain cultural elements.",
        "service_length": "2-4 hours (Orthodox longer)",
        "topics": "Fasting, prayer, spiritual discipline, perseverance, heritage",
        "etiquette": "Very formal and respectful. Remove shoes in Orthodox churches. Modest dress essential."
    },
    "Mandarin": {
        "region": "East Asian",
        "context": "Growing Chinese Christian community, mix of mainland and diaspora. Often highly educated.",
        "worship_style": "Contemporary worship with Chinese Christian songs. Value teaching and discipleship.",
        "service_length": "1.5-2 hours",
        "topics": "Discipleship, spiritual growth, wisdom, family, purpose",
        "etiquette": "Formal and reserved culture. Intellectual sermons appreciated. Tea and fellowship highly valued."
    },
    "Korean": {
        "region": "East Asian",
        "context": "Strong Korean Christian community. Known for prayer and early morning prayer meetings.",
        "worship_style": "Fervent prayer, contemporary worship. Very committed to spiritual disciplines.",
        "service_length": "2-2.5 hours (plus prayer meetings)",
        "topics": "Prayer, spiritual breakthrough, missions, perseverance, holiness",
        "etiquette": "Very respectful of hierarchy. Bow to elders. Expect intense prayer sessions. Remove shoes often."
    },
    "Filipino": {
        "region": "Southeast Asian",
        "context": "Large Filipino community, predominantly Catholic but growing evangelical presence. Very hospitable.",
        "worship_style": "Joyful, musical worship. Strong choir tradition. Mix of traditional and contemporary.",
        "service_length": "1.5-2.5 hours",
        "topics": "Faith, hope, family, perseverance, gratitude",
        "etiquette": "Very warm and welcoming. Expect to be invited to meals. Respect for elders paramount."
    },
    "Polish": {
        "region": "European",
        "context": "Large Polish Catholic community, also growing evangelical churches. Strong Marian devotion.",
        "worship_style": "Traditional Catholic or contemporary evangelical. Value reverence and tradition.",
        "service_length": "1-2 hours",
        "topics": "Faith in hardship, Mary, saints, family values, hope",
        "etiquette": "Formal attire. Catholics may cross themselves. Respect for tradition important."
    },
    "Romanian": {
        "region": "European",
        "context": "Growing Romanian community, predominantly Orthodox but increasing Pentecostal presence.",
        "worship_style": "Orthodox very liturgical. Pentecostal churches energetic with Eastern European worship style.",
        "service_length": "2-3 hours",
        "topics": "Miracles, healing, provision, spiritual warfare, family",
        "etiquette": "Modest dress. Stand during Orthodox services. Strong hospitality culture."
    },
    "Arabic": {
        "region": "Middle Eastern",
        "context": "Arab Christian diaspora from Egypt, Lebanon, Iraq, Syria. Ancient church traditions.",
        "worship_style": "Varies by tradition (Coptic, Maronite, Assyrian). Many liturgical, some contemporary.",
        "service_length": "1.5-3 hours",
        "topics": "Faith under persecution, heritage, martyrs, family, hope",
        "etiquette": "Very hospitable. Coffee culture strong. Respect for church fathers and tradition."
    }
}

def calculate_distance(lat1, lon1, lat2, lon2):
    if None in [lat1, lon1, lat2, lon2]:
        return None
    R = 3959
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@router.get("/church-picker")
async def get_churches_for_picker(
    q: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    size: Optional[str] = None,
    language: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    service_day: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,
    trip_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    query = {"status": "active"}
    
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"pastor_name": {"$regex": q, "$options": "i"}}
        ]
    
    if city and city != "All UK":
        query["city"] = city
    
    if denomination and denomination != "All":
        query["denomination"] = denomination
    
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
        query["languages"] = language
    
    if open_to_visits is not None:
        query["open_to_visits"] = open_to_visits
    
    if service_day:
        query["service_days"] = service_day
    
    skip = (page - 1) * limit
    churches_cursor = db.churches.find(query).skip(skip).limit(limit)
    churches = await churches_cursor.to_list(length=limit)
    total = await db.churches.count_documents(query)
    
    trip = None
    if trip_id:
        trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    
    result_churches = []
    for church in churches:
        distance = None
        if lat and lng and church.get("location"):
            church_coords = church["location"].get("coordinates")
            if church_coords and len(church_coords) == 2:
                distance = calculate_distance(lat, lng, church_coords[1], church_coords[0])
        
        if radius and distance and distance > radius:
            continue
        
        match_score = None
        if trip:
            score = 70
            if church.get("open_to_visits"):
                score += 10
            if language and language in church.get("languages", []):
                score += 15
            if trip.get("ministry_focus"):
                focus_lower = trip["ministry_focus"].lower()
                church_desc = (church.get("description") or "").lower()
                if any(word in church_desc for word in focus_lower.split()):
                    score += 5
            match_score = min(score, 100)
        
        result_churches.append(ChurchInPicker(
            id=str(church["_id"]),
            name=church["name"],
            city=church.get("city", ""),
            postcode=church.get("postcode"),
            denomination=church.get("denomination"),
            congregation_size=church.get("congregation_size"),
            photo_url=church.get("photo_url"),
            open_to_visits=church.get("open_to_visits", False),
            languages=church.get("languages", []),
            service_days=church.get("service_days", []),
            match_score=match_score,
            distance_miles=round(distance, 1) if distance else None
        ))
    
    return {
        "churches": result_churches,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@router.post("/trips/{trip_id}/add-church")
async def add_church_to_trip(
    trip_id: str,
    request: AddChurchToTripRequest,
    user: dict = Depends(get_current_user)
):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if str(trip["created_by"]) != str(user["_id"]) and str(user["_id"]) not in [str(c) for c in trip.get("collaborators", [])]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    church = await db.churches.find_one({"_id": ObjectId(request.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visit = {
        "church_id": request.church_id,
        "church_name": church["name"],
        "day_number": request.day_number,
        "time_slot": request.time_slot,
        "visit_type": request.visit_type,
        "notes": request.notes,
        "status": "pending",
        "added_at": datetime.utcnow()
    }
    
    itinerary = trip.get("itinerary", [])
    itinerary.append(visit)
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"itinerary": itinerary, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "visit": visit}

@router.get("/languages")
async def get_languages():
    pipeline = [
        {"$unwind": "$languages"},
        {"$group": {"_id": "$languages", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    result = await db.churches.aggregate(pipeline).to_list(length=100)
    
    languages = []
    for item in result:
        lang = item["_id"]
        languages.append({
            "name": lang,
            "count": item["count"],
            "region": LANGUAGE_CONTEXT.get(lang, {}).get("region", "Other"),
            "has_context": lang in LANGUAGE_CONTEXT
        })
    
    return {"languages": languages}

@router.get("/languages/{language}/context")
async def get_language_context(language: str):
    if language not in LANGUAGE_CONTEXT:
        return {"context": None}
    return {"context": LANGUAGE_CONTEXT[language]}

@router.post("/templates")
async def create_template(
    request: SaveTemplateRequest,
    trip_id: str = Query(...),
    user: dict = Depends(get_current_user)
):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if str(trip["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only trip owner can create template")
    
    churches = []
    cities = set()
    for visit in trip.get("itinerary", []):
        church = await db.churches.find_one({"_id": ObjectId(visit["church_id"])})
        if church:
            cities.add(church.get("city", ""))
            churches.append({
                "church_id": visit["church_id"],
                "church_name": visit["church_name"],
                "day_number": visit["day_number"],
                "time_slot": visit["time_slot"],
                "visit_type": visit["visit_type"],
                "notes": visit.get("notes") if request.include_notes else None
            })
    
    total_days = max([v["day_number"] for v in trip.get("itinerary", [])], default=1)
    
    template = {
        "created_by": user["_id"],
        "org_id": user.get("org_id"),
        "name": request.name,
        "description": request.description,
        "tags": request.tags,
        "visibility": request.visibility,
        "trip_structure": {
            "total_days": total_days,
            "cities": list(cities),
            "churches": churches,
            "daily_structure": trip.get("daily_structure", [])
        },
        "use_count": 0,
        "avg_trip_score": 0,
        "last_used": None,
        "reviews": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.planner_templates.insert_one(template)
    template["_id"] = str(result.inserted_id)
    
    return {"success": True, "template_id": str(result.inserted_id)}

@router.get("/templates")
async def get_templates(
    visibility: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    query = {}
    
    if visibility == "my":
        query["created_by"] = user["_id"]
    elif visibility == "org":
        query["$or"] = [
            {"visibility": "org", "org_id": user.get("org_id")},
            {"created_by": user["_id"]}
        ]
    elif visibility == "public":
        query["visibility"] = "public"
    elif visibility == "curated":
        query["visibility"] = "curated"
    else:
        query["$or"] = [
            {"created_by": user["_id"]},
            {"visibility": "org", "org_id": user.get("org_id")},
            {"visibility": "public"},
            {"visibility": "curated"}
        ]
    
    if tag:
        query["tags"] = tag
    
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    templates_cursor = db.planner_templates.find(query).sort("use_count", -1).skip(skip).limit(limit)
    templates = await templates_cursor.to_list(length=limit)
    total = await db.planner_templates.count_documents(query)
    
    for template in templates:
        template["_id"] = str(template["_id"])
        template["created_by"] = str(template["created_by"])
        creator = await db.users.find_one({"_id": ObjectId(template["created_by"])})
        template["creator_name"] = creator.get("name") if creator else "Unknown"
    
    return {
        "templates": templates,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@router.get("/templates/{template_id}")
async def get_template(template_id: str, user: dict = Depends(get_current_user)):
    template = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template["visibility"] == "private" and str(template["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Template is private")
    
    if template["visibility"] == "org":
        if str(template["created_by"]) != str(user["_id"]) and template.get("org_id") != user.get("org_id"):
            raise HTTPException(status_code=403, detail="Template is organization-only")
    
    template["_id"] = str(template["_id"])
    template["created_by"] = str(template["created_by"])
    
    creator = await db.users.find_one({"_id": ObjectId(template["created_by"])})
    template["creator_name"] = creator.get("name") if creator else "Unknown"
    
    return {"template": template}

@router.post("/trips/from-template")
async def create_trip_from_template(
    request: CreateTripFromTemplateRequest,
    user: dict = Depends(get_current_user)
):
    template = await db.planner_templates.find_one({"_id": ObjectId(request.template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template["visibility"] == "private" and str(template["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Template is private")
    
    if template["visibility"] == "org":
        if str(template["created_by"]) != str(user["_id"]) and template.get("org_id") != user.get("org_id"):
            raise HTTPException(status_code=403, detail="Template is organization-only")
    
    start_date = datetime.fromisoformat(request.start_date)
    
    itinerary = []
    for church_item in template["trip_structure"]["churches"]:
        itinerary.append({
            "church_id": church_item["church_id"],
            "church_name": church_item["church_name"],
            "day_number": church_item["day_number"],
            "time_slot": church_item["time_slot"],
            "visit_type": church_item["visit_type"],
            "notes": church_item.get("notes"),
            "status": "pending"
        })
    
    trip = {
        "created_by": user["_id"],
        "template_id": request.template_id,
        "missionary_name": request.missionary_name,
        "missionary_denomination": request.missionary_denomination,
        "ministry_focus": request.missionary_focus,
        "languages": request.missionary_languages,
        "start_date": start_date,
        "total_days": template["trip_structure"]["total_days"],
        "itinerary": itinerary,
        "collaborators": [],
        "status": "draft",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.ministry_trips.insert_one(trip)
    
    await db.planner_templates.update_one(
        {"_id": ObjectId(request.template_id)},
        {
            "$inc": {"use_count": 1},
            "$set": {"last_used": datetime.utcnow()}
        }
    )
    
    return {"success": True, "trip_id": str(result.inserted_id)}

@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    request: SaveTemplateRequest,
    user: dict = Depends(get_current_user)
):
    template = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if str(template["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only template creator can update")
    
    await db.planner_templates.update_one(
        {"_id": ObjectId(template_id)},
        {
            "$set": {
                "name": request.name,
                "description": request.description,
                "tags": request.tags,
                "visibility": request.visibility,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"success": True}

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    template = await db.planner_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if str(template["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only template creator can delete")
    
    await db.planner_templates.delete_one({"_id": ObjectId(template_id)})
    
    return {"success": True}