from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
import re
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import hashlib
import json

router = APIRouter()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "DEV-ChurchNavigator")
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

UK_CITIES = [
    "london", "birmingham", "manchester", "leeds", "liverpool", "sheffield",
    "bristol", "glasgow", "edinburgh", "cardiff", "belfast", "nottingham",
    "leicester", "coventry", "hull", "bradford", "newcastle", "stoke",
    "wolverhampton", "plymouth", "southampton", "reading", "derby",
    "portsmouth", "brighton", "luton", "milton keynes", "sunderland",
    "norwich", "ipswich", "exeter", "cambridge", "oxford", "york"
]

DENOMINATIONS = [
    "pentecostal", "baptist", "anglican", "methodist", "presbyterian",
    "catholic", "orthodox", "evangelical", "charismatic", "reformed",
    "lutheran", "congregational", "salvation army", "quaker",
    "seventh-day adventist", "non-denominational", "independent"
]

DAY_KEYWORDS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
TIME_KEYWORDS = {"morning": "morning", "afternoon": "afternoon", "evening": "evening"}

class SearchResult(BaseModel):
    id: str
    type: str
    name: str
    slug: str
    city: Optional[str]
    denomination: Optional[str]
    image: Optional[str]
    rating: Optional[float]
    total_reviews: Optional[int]
    is_verified: Optional[bool]
    score: Optional[float]
    distance_km: Optional[float]

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    filters_applied: dict

def parse_query(q: str) -> dict:
    q_lower = q.lower()
    filters = {}
    
    for city in UK_CITIES:
        if city in q_lower:
            filters["city"] = city.title()
            break
    
    for denom in DENOMINATIONS:
        if denom in q_lower:
            filters["denomination"] = denom.title()
            break
    
    for day in DAY_KEYWORDS:
        if day in q_lower:
            filters["service_day"] = day.title()
            break
    
    for keyword, time_period in TIME_KEYWORDS.items():
        if keyword in q_lower:
            filters["service_time"] = time_period
            break
    
    if "free" in q_lower:
        filters["is_free"] = True
    
    if "this weekend" in q_lower or "weekend" in q_lower:
        filters["date_range"] = "weekend"
    
    return filters

async def atlas_search(collection_name: str, query: str, filters: dict, page: int, page_size: int, lat: Optional[float] = None, lng: Optional[float] = None):
    collection = db[collection_name]
    
    pipeline = []
    
    if lat is not None and lng is not None:
        pipeline.append({
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "distance_km",
                "maxDistance": 50000,
                "spherical": True,
                "distanceMultiplier": 0.001
            }
        })
    
    try:
        pipeline.append({
            "$search": {
                "index": "default",
                "text": {
                    "query": query,
                    "path": ["name", "description", "city", "denomination", "tags"],
                    "fuzzy": {"maxEdits": 2}
                }
            }
        })
        pipeline.append({"$addFields": {"score": {"$meta": "searchScore"}}})
    except:
        if query:
            pipeline.append({"$match": {"$text": {"$search": query}}})
            pipeline.append({"$addFields": {"score": {"$meta": "textScore"}}})
    
    match_filters = {"moderation_status": "approved"}
    if "city" in filters:
        match_filters["city"] = {"$regex": filters["city"], "$options": "i"}
    if "denomination" in filters:
        match_filters["denomination"] = {"$regex": filters["denomination"], "$options": "i"}
    if "is_free" in filters:
        match_filters["is_free"] = filters["is_free"]
    if "service_day" in filters:
        match_filters["service_times.day"] = filters["service_day"]
    if "service_time" in filters:
        match_filters["service_times.period"] = filters["service_time"]
    
    if match_filters:
        pipeline.append({"$match": match_filters})
    
    if "score" not in [stage.get("$addFields", {}).get("score") for stage in pipeline if "$addFields" in stage]:
        pipeline.append({"$sort": {"created_at": -1}})
    else:
        pipeline.append({"$sort": {"score": -1, "created_at": -1}})
    
    count_pipeline = pipeline.copy()
    count_pipeline.append({"$count": "total"})
    
    pipeline.append({"$skip": (page - 1) * page_size})
    pipeline.append({"$limit": page_size})
    
    pipeline.append({
        "$project": {
            "_id": 1,
            "name": 1,
            "slug": 1,
            "city": 1,
            "denomination": 1,
            "image": 1,
            "rating": 1,
            "total_reviews": 1,
            "is_verified": 1,
            "score": 1,
            "distance_km": 1
        }
    })
    
    results = await collection.aggregate(pipeline).to_list(length=page_size)
    count_result = await collection.aggregate(count_pipeline).to_list(length=1)
    total = count_result[0]["total"] if count_result else 0
    
    return results, total

@router.get("/search", response_model=SearchResponse)
async def universal_search(
    q: str = Query("", description="Search query"),
    type: Optional[str] = Query(None, description="Filter by type: church, event, pastor, worship-leader, media-team, bible-college"),
    city: Optional[str] = Query(None, description="Filter by city"),
    denomination: Optional[str] = Query(None, description="Filter by denomination"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    lat: Optional[float] = Query(None, description="Latitude for near me search"),
    lng: Optional[float] = Query(None, description="Longitude for near me search")
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if denomination:
        parsed["denomination"] = denomination
    
    all_results = []
    total_count = 0
    
    collections = []
    if type:
        type_map = {
            "church": "churches",
            "event": "events",
            "pastor": "pastors",
            "worship-leader": "worship_leaders",
            "media-team": "media_teams",
            "bible-college": "bible_colleges"
        }
        collections = [type_map.get(type, "churches")]
    else:
        collections = ["churches", "events", "pastors", "worship_leaders", "media_teams", "bible_colleges"]
    
    for collection_name in collections:
        try:
            results, count = await atlas_search(collection_name, q, parsed, page, page_size, lat, lng)
            for r in results:
                all_results.append(SearchResult(
                    id=str(r["_id"]),
                    type=collection_name.rstrip("s"),
                    name=r.get("name", ""),
                    slug=r.get("slug", ""),
                    city=r.get("city"),
                    denomination=r.get("denomination"),
                    image=r.get("image"),
                    rating=r.get("rating"),
                    total_reviews=r.get("total_reviews"),
                    is_verified=r.get("is_verified"),
                    score=r.get("score"),
                    distance_km=r.get("distance_km")
                ))
            total_count += count
        except Exception as e:
            print(f"Error searching {collection_name}: {e}")
    
    all_results.sort(key=lambda x: (x.score or 0, x.distance_km or 999999), reverse=True)
    
    return SearchResponse(
        results=all_results[:page_size],
        total=total_count,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/churches", response_model=SearchResponse)
async def search_churches(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    lat: Optional[float] = None,
    lng: Optional[float] = None
):
    return await universal_search(q=q, type="church", city=city, denomination=denomination, page=page, page_size=page_size, lat=lat, lng=lng)

@router.get("/search/events", response_model=SearchResponse)
async def search_events(
    q: str = Query(""),
    city: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_free: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if is_free is not None:
        parsed["is_free"] = is_free
    
    if date_from:
        parsed["date_from"] = date_from
    if date_to:
        parsed["date_to"] = date_to
    
    results, total = await atlas_search("events", q, parsed, page, page_size)
    
    return SearchResponse(
        results=[SearchResult(
            id=str(r["_id"]),
            type="event",
            name=r.get("name", ""),
            slug=r.get("slug", ""),
            city=r.get("city"),
            denomination=r.get("denomination"),
            image=r.get("image"),
            rating=r.get("rating"),
            total_reviews=r.get("total_reviews"),
            is_verified=r.get("is_verified"),
            score=r.get("score")
        ) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/pastors", response_model=SearchResponse)
async def search_pastors(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if denomination:
        parsed["denomination"] = denomination
    if open_to_visits is not None:
        parsed["open_to_visits"] = open_to_visits
    
    results, total = await atlas_search("pastors", q, parsed, page, page_size)
    
    return SearchResponse(
        results=[SearchResult(
            id=str(r["_id"]),
            type="pastor",
            name=r.get("name", ""),
            slug=r.get("slug", ""),
            city=r.get("city"),
            denomination=r.get("denomination"),
            image=r.get("image"),
            rating=r.get("rating"),
            total_reviews=r.get("total_reviews"),
            is_verified=r.get("is_verified"),
            score=r.get("score")
        ) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/worship-leaders", response_model=SearchResponse)
async def search_worship_leaders(
    q: str = Query(""),
    city: Optional[str] = None,
    genre: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if genre:
        parsed["genre"] = genre
    
    results, total = await atlas_search("worship_leaders", q, parsed, page, page_size)
    
    return SearchResponse(
        results=[SearchResult(
            id=str(r["_id"]),
            type="worship-leader",
            name=r.get("name", ""),
            slug=r.get("slug", ""),
            city=r.get("city"),
            denomination=r.get("denomination"),
            image=r.get("image"),
            rating=r.get("rating"),
            total_reviews=r.get("total_reviews"),
            is_verified=r.get("is_verified"),
            score=r.get("score")
        ) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/media-teams", response_model=SearchResponse)
async def search_media_teams(
    q: str = Query(""),
    city: Optional[str] = None,
    service_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if service_type:
        parsed["service_type"] = service_type
    
    results, total = await atlas_search("media_teams", q, parsed, page, page_size)
    
    return SearchResponse(
        results=[SearchResult(
            id=str(r["_id"]),
            type="media-team",
            name=r.get("name", ""),
            slug=r.get("slug", ""),
            city=r.get("city"),
            denomination=r.get("denomination"),
            image=r.get("image"),
            rating=r.get("rating"),
            total_reviews=r.get("total_reviews"),
            is_verified=r.get("is_verified"),
            score=r.get("score")
        ) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/bible-colleges", response_model=SearchResponse)
async def search_bible_colleges(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    parsed = parse_query(q)
    if city:
        parsed["city"] = city
    if denomination:
        parsed["denomination"] = denomination
    
    results, total = await atlas_search("bible_colleges", q, parsed, page, page_size)
    
    return SearchResponse(
        results=[SearchResult(
            id=str(r["_id"]),
            type="bible-college",
            name=r.get("name", ""),
            slug=r.get("slug", ""),
            city=r.get("city"),
            denomination=r.get("denomination"),
            image=r.get("image"),
            rating=r.get("rating"),
            total_reviews=r.get("total_reviews"),
            is_verified=r.get("is_verified"),
            score=r.get("score")
        ) for r in results],
        total=total,
        page=page,
        page_size=page_size,
        filters_applied=parsed
    )

@router.get("/search/conversational")
async def conversational_search(q: str = Query(..., description="Complex conversational query")):
    query_hash = hashlib.md5(q.lower().encode()).hexdigest()
    cache_key = f"conversational_cache:{query_hash}"
    
    cached = await db.search_cache.find_one({"_id": cache_key})
    if cached and (datetime.utcnow() - cached["created_at"]).total_seconds() < 86400:
        return {"answer": cached["answer"], "cached": True}
    
    daily_count = await db.search_stats.find_one({"_id": datetime.utcnow().strftime("%Y-%m-%d")})
    if daily_count and daily_count.get("conversational_count", 0) >= 20:
        raise HTTPException(status_code=429, detail="Daily conversational search limit reached. Try again tomorrow.")
    
    try:
        from anthropic import Anthropic
        anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        message = anthropic_client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"You are a helpful church directory assistant. Answer this question based on UK churches: {q}\n\nProvide a helpful, concise answer."
            }]
        )
        
        answer = message.content[0].text
        
        await db.search_cache.insert_one({
            "_id": cache_key,
            "query": q,
            "answer": answer,
            "created_at": datetime.utcnow()
        })
        
        await db.search_stats.update_one(
            {"_id": datetime.utcnow().strftime("%Y-%m-%d")},
            {"$inc": {"conversational_count": 1}},
            upsert=True
        )
        
        return {"answer": answer, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")
