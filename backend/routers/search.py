from fastapi import APIRouter, Query, HTTPException, Request
from typing import Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
from collections import defaultdict
import hashlib
import json

router = APIRouter(prefix="/api/search", tags=["search"])

UK_CITIES = [
    "london", "birmingham", "manchester", "leeds", "liverpool", "bristol",
    "sheffield", "edinburgh", "glasgow", "cardiff", "newcastle", "nottingham",
    "southampton", "leicester", "coventry", "bradford", "belfast", "brighton",
    "plymouth", "oxford", "cambridge", "portsmouth", "york", "exeter",
    "reading", "norwich", "luton", "wolverhampton", "aberdeen", "swansea"
]

DENOMINATIONS = [
    "pentecostal", "baptist", "anglican", "methodist", "presbyterian",
    "evangelical", "charismatic", "catholic", "reformed", "independent",
    "adventist", "apostolic", "brethren", "congregational", "orthodox"
]

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
TIMES = ["morning", "afternoon", "evening", "night"]

def get_db():
    mongo_uri = os.getenv("MONGODB_URI", "")
    if "DEV-ChurchNavigator" in mongo_uri or os.getenv("ENVIRONMENT") == "development":
        db_name = "DEV-ChurchNavigator"
    else:
        db_name = "ChurchNavigator"
    client = AsyncIOMotorClient(mongo_uri)
    return client[db_name]

def parse_smart_query(query: str) -> dict:
    q_lower = query.lower()
    filters = {}
    
    for city in UK_CITIES:
        if city in q_lower:
            filters["city"] = city.title()
            break
    
    for denom in DENOMINATIONS:
        if denom in q_lower:
            filters["denomination"] = denom.title()
            break
    
    for day in DAYS:
        if day in q_lower:
            filters["service_day"] = day.title()
            break
    
    for time in TIMES:
        if time in q_lower:
            filters["service_time"] = time
            break
    
    if "free" in q_lower:
        filters["is_free"] = True
    elif "paid" in q_lower:
        filters["is_free"] = False
    
    if "near me" in q_lower or "nearby" in q_lower:
        filters["needs_location"] = True
    
    return filters

async def search_collection(db, collection_name: str, query: str, filters: dict, page: int = 1, limit: int = 20):
    collection = db[collection_name]
    skip = (page - 1) * limit
    
    match_stage = {"moderation_status": "approved"}
    
    if filters.get("city"):
        match_stage["city"] = {"$regex": filters["city"], "$options": "i"}
    if filters.get("denomination"):
        match_stage["denomination"] = {"$regex": filters["denomination"], "$options": "i"}
    if "is_free" in filters:
        match_stage["is_free"] = filters["is_free"]
    if filters.get("service_day"):
        match_stage["service_times.day"] = filters["service_day"]
    
    pipeline = []
    
    if query:
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
                "_id": 0,
                "id": {"$toString": "$_id"},
                "name": 1,
                "slug": 1,
                "city": 1,
                "listing_type": 1,
                "denomination": 1,
                "main_image": 1,
                "rating": 1,
                "total_reviews": 1,
                "is_verified": 1,
                "description": {"$substr": ["$description", 0, 150]},
                "score": 1
            }
        }
    ])
    
    results = await collection.aggregate(pipeline).to_list(length=limit)
    total = await collection.count_documents(match_stage)
    
    return results, total

@router.get("")
async def universal_search(
    q: Optional[str] = Query(None, description="Search query"),
    type: Optional[str] = Query(None, description="Filter by type: church, event, pastor, worship_leader, media_team, bible_college"),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if denomination:
        smart_filters["denomination"] = denomination
    
    collections_to_search = []
    if type:
        type_map = {
            "church": "churches",
            "event": "events",
            "pastor": "pastors",
            "worship_leader": "worship_leaders",
            "media_team": "media_teams",
            "bible_college": "bible_colleges"
        }
        if type in type_map:
            collections_to_search = [type_map[type]]
    else:
        collections_to_search = ["churches", "events", "pastors", "worship_leaders", "media_teams", "bible_colleges"]
    
    all_results = []
    total_count = 0
    
    for coll_name in collections_to_search:
        try:
            results, count = await search_collection(db, coll_name, q, smart_filters, page, limit)
            for r in results:
                r["listing_type"] = coll_name.rstrip('s')
            all_results.extend(results)
            total_count += count
        except Exception:
            pass
    
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    all_results = all_results[:limit]
    
    return {
        "results": all_results,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/churches")
async def search_churches(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if denomination:
        smart_filters["denomination"] = denomination
    
    results, total = await search_collection(db, "churches", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/events")
async def search_events(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    is_free: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if is_free is not None:
        smart_filters["is_free"] = is_free
    
    results, total = await search_collection(db, "events", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/pastors")
async def search_pastors(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    open_to_visits: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if denomination:
        smart_filters["denomination"] = denomination
    if open_to_visits is not None:
        smart_filters["open_to_visits"] = open_to_visits
    
    results, total = await search_collection(db, "pastors", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/worship-leaders")
async def search_worship_leaders(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if genre:
        smart_filters["genre"] = genre
    
    results, total = await search_collection(db, "worship_leaders", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/media-teams")
async def search_media_teams(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if service_type:
        smart_filters["service_type"] = service_type
    
    results, total = await search_collection(db, "media_teams", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/bible-colleges")
async def search_bible_colleges(
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    db = get_db()
    smart_filters = parse_smart_query(q or "")
    if city:
        smart_filters["city"] = city
    if denomination:
        smart_filters["denomination"] = denomination
    
    results, total = await search_collection(db, "bible_colleges", q, smart_filters, page, limit)
    
    return {
        "results": results,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/conversational")
async def conversational_search(
    request: Request,
    q: str = Query(..., min_length=10, description="Complex conversational query")
):
    db = get_db()
    
    query_hash = hashlib.md5(q.lower().encode()).hexdigest()
    cache_key = f"conv_search:{query_hash}"
    
    cached = await db.search_cache.find_one({"key": cache_key})
    if cached and cached.get("expires_at") > datetime.utcnow():
        return cached["result"]
    
    daily_count = await db.conversational_search_counter.find_one({"date": datetime.utcnow().date().isoformat()})
    if daily_count and daily_count.get("count", 0) >= 20:
        raise HTTPException(status_code=429, detail="Daily conversational search limit reached. Please try again tomorrow.")
    
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        churches = await db.churches.find({"moderation_status": "approved"}).limit(100).to_list(100)
        context = "\n".join([f"{c.get('name')} - {c.get('city')} - {c.get('denomination')} - {c.get('description', '')[:100]}" for c in churches[:50]])
        
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"Based on these UK churches:\n{context}\n\nQuestion: {q}\n\nProvide a helpful answer with specific church recommendations."
            }]
        )
        
        answer = message.content[0].text
        
        result = {"answer": answer, "query": q, "cached": False}
        
        await db.search_cache.update_one(
            {"key": cache_key},
            {"$set": {
                "key": cache_key,
                "result": result,
                "expires_at": datetime.utcnow() + timedelta(hours=24)
            }},
            upsert=True
        )
        
        await db.conversational_search_counter.update_one(
            {"date": datetime.utcnow().date().isoformat()},
            {"$inc": {"count": 1}},
            upsert=True
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Conversational search temporarily unavailable. Please use standard search.")
