from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import re
from ..database import get_database
from ..models import ListingType

router = APIRouter(prefix="/api/search", tags=["search"])

UK_CITIES = [
    "london", "birmingham", "manchester", "leeds", "glasgow", "liverpool",
    "edinburgh", "bristol", "sheffield", "newcastle", "cardiff", "leicester",
    "nottingham", "southampton", "coventry", "brighton", "hull", "stoke",
    "wolverhampton", "plymouth", "derby", "swansea", "reading", "norwich",
    "belfast", "aberdeen", "york", "oxford", "cambridge", "exeter",
    "portsmouth", "sunderland", "dundee", "peterborough", "luton"
]

DENOMINATIONS = [
    "pentecostal", "baptist", "anglican", "methodist", "catholic",
    "presbyterian", "evangelical", "charismatic", "reformed", "independent",
    "assemblies of god", "elim", "apostolic", "new testament", "rccg",
    "redeemed", "christ embassy", "winners chapel", "kicc", "cac"
]

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
TIMES = {"morning": "09:00", "afternoon": "14:00", "evening": "18:00", "night": "19:00"}

def parse_smart_query(query: str) -> Dict[str, Any]:
    filters = {}
    query_lower = query.lower()
    words = query_lower.split()
    
    for city in UK_CITIES:
        if city in query_lower:
            filters["city"] = city.capitalize()
            break
    
    for denom in DENOMINATIONS:
        if denom in query_lower:
            filters["denomination"] = denom.title()
            break
    
    for day in DAYS:
        if day in query_lower:
            filters["service_day"] = day.capitalize()
            break
    
    for time_word, time_val in TIMES.items():
        if time_word in query_lower:
            filters["service_time"] = time_word
            break
    
    if "free" in query_lower:
        filters["is_free"] = True
    
    if "verified" in query_lower or "official" in query_lower:
        filters["is_verified"] = True
    
    return filters

def build_search_pipeline(query: str, filters: Dict[str, Any], listing_type: Optional[str], skip: int, limit: int) -> List[Dict]:
    pipeline = []
    
    match_stage = {"moderation_status": "approved"}
    
    if listing_type:
        match_stage["listing_type"] = listing_type
    
    if filters.get("city"):
        match_stage["city"] = {"$regex": filters["city"], "$options": "i"}
    if filters.get("denomination"):
        match_stage["denomination"] = {"$regex": filters["denomination"], "$options": "i"}
    if filters.get("is_verified") is not None:
        match_stage["is_verified"] = filters["is_verified"]
    if filters.get("is_free") is not None:
        match_stage["is_free"] = filters["is_free"]
    
    if query.strip():
        pipeline.append({
            "$match": {
                "$text": {"$search": query},
                **match_stage
            }
        })
        pipeline.append({"$addFields": {"score": {"$meta": "textScore"}}})
        pipeline.append({"$sort": {"score": -1, "created_at": -1}})
    else:
        pipeline.append({"$match": match_stage})
        pipeline.append({"$sort": {"created_at": -1}})
    
    pipeline.extend([
        {"$skip": skip},
        {"$limit": limit},
        {
            "$project": {
                "_id": {"$toString": "$_id"},
                "name": 1,
                "slug": 1,
                "city": 1,
                "listing_type": 1,
                "denomination": 1,
                "image": 1,
                "rating": 1,
                "total_reviews": 1,
                "is_verified": 1,
                "address": 1,
                "description": {"$substr": ["$description", 0, 150]},
                "score": {"$ifNull": ["$score", 0]}
            }
        }
    ])
    
    return pipeline

@router.get("")
async def universal_search(
    q: str = Query("", description="Search query"),
    type: Optional[str] = Query(None, description="Filter by listing type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    denomination: Optional[str] = Query(None, description="Filter by denomination"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    smart_filters = parse_smart_query(q)
    
    if city:
        smart_filters["city"] = city
    if denomination:
        smart_filters["denomination"] = denomination
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, smart_filters, type, skip, limit)
    
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    
    total_pipeline = [{"$match": pipeline[0]["$match"]}, {"$count": "total"}]
    total_result = await db.listings.aggregate(total_pipeline).to_list(length=1)
    total = total_result[0]["total"] if total_result else 0
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "filters_applied": smart_filters
    }

@router.get("/churches")
async def search_churches(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    distance_km: Optional[float] = Query(None, ge=1, le=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    filters["denomination"] = denomination or filters.get("denomination")
    
    skip = (page - 1) * limit
    
    if lat is not None and lng is not None and distance_km:
        pipeline = [
            {
                "$geoNear": {
                    "near": {"type": "Point", "coordinates": [lng, lat]},
                    "distanceField": "distance_km",
                    "maxDistance": distance_km * 1000,
                    "spherical": True,
                    "query": {"moderation_status": "approved", "listing_type": "church"}
                }
            },
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "name": 1,
                    "slug": 1,
                    "city": 1,
                    "denomination": 1,
                    "image": 1,
                    "rating": 1,
                    "total_reviews": 1,
                    "is_verified": 1,
                    "address": 1,
                    "distance_km": {"$divide": ["$distance_km", 1000]}
                }
            }
        ]
        results = await db.listings.aggregate(pipeline).to_list(length=limit)
    else:
        pipeline = build_search_pipeline(q, filters, "church", skip, limit)
        results = await db.listings.aggregate(pipeline).to_list(length=limit)
    
    return {"results": results, "page": page}

@router.get("/events")
async def search_events(
    q: str = Query(""),
    city: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_free: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    if is_free is not None:
        filters["is_free"] = is_free
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, "event", skip, limit)
    
    if date_from or date_to:
        date_match = {}
        if date_from:
            date_match["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_match["$lte"] = datetime.fromisoformat(date_to)
        pipeline[0]["$match"]["event_date"] = date_match
    
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    return {"results": results, "page": page}

@router.get("/pastors")
async def search_pastors(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    filters["denomination"] = denomination or filters.get("denomination")
    if open_to_visits is not None:
        filters["open_to_visits"] = open_to_visits
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, "pastor", skip, limit)
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    return {"results": results, "page": page}

@router.get("/worship-leaders")
async def search_worship_leaders(
    q: str = Query(""),
    city: Optional[str] = None,
    genre: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    if genre:
        filters["genre"] = genre
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, "worship_leader", skip, limit)
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    return {"results": results, "page": page}

@router.get("/media-teams")
async def search_media_teams(
    q: str = Query(""),
    city: Optional[str] = None,
    service_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    if service_type:
        filters["service_type"] = service_type
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, "media_team", skip, limit)
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    return {"results": results, "page": page}

@router.get("/bible-colleges")
async def search_bible_colleges(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filters = parse_smart_query(q)
    filters["city"] = city or filters.get("city")
    filters["denomination"] = denomination or filters.get("denomination")
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, "bible_college", skip, limit)
    results = await db.listings.aggregate(pipeline).to_list(length=limit)
    return {"results": results, "page": page}

@router.get("/conversational")
async def conversational_search(
    q: str = Query(..., min_length=10),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    rate_limit_key = f"conversational_search_{datetime.now().date()}"
    counter = await db.counters.find_one({"_id": rate_limit_key})
    
    if counter and counter.get("count", 0) >= 20:
        raise HTTPException(status_code=429, detail="Daily conversational search limit reached. Please use standard search.")
    
    query_hash = str(hash(q.lower()))
    cached = await db.search_cache.find_one({"query_hash": query_hash, "expires_at": {"$gt": datetime.utcnow()}})
    
    if cached:
        return {"results": cached["results"], "answer": cached["answer"], "cached": True}
    
    try:
        import anthropic
        import os
        
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        search_results = await db.listings.find(
            {"moderation_status": "approved"},
            {"name": 1, "city": 1, "denomination": 1, "description": 1, "slug": 1}
        ).limit(50).to_list(length=50)
        
        context = "\n".join([f"{r['name']} - {r.get('city', 'UK')} - {r.get('denomination', 'Christian')}" for r in search_results[:20]])
        
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": f"Based on these UK churches:\n{context}\n\nQuestion: {q}\n\nProvide a brief recommendation."
            }]
        )
        
        answer = message.content[0].text
        
        await db.counters.update_one(
            {"_id": rate_limit_key},
            {"$inc": {"count": 1}, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )
        
        await db.search_cache.insert_one({
            "query_hash": query_hash,
            "query": q,
            "results": [r["slug"] for r in search_results[:5]],
            "answer": answer,
            "expires_at": datetime.utcnow() + timedelta(hours=24),
            "created_at": datetime.utcnow()
        })
        
        return {"results": search_results[:5], "answer": answer, "cached": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")
