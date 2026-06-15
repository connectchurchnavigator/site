from fastapi import APIRouter, Query, HTTPException, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import re
from pymongo import TEXT, ASCENDING, DESCENDING
from bson import ObjectId
import hashlib

from ..database import db
from ..models.search import SearchResponse, SearchResult

router = APIRouter(prefix="/api/search", tags=["search"])

UK_CITIES = [
    "London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Newcastle",
    "Sheffield", "Bristol", "Glasgow", "Edinburgh", "Cardiff", "Belfast",
    "Nottingham", "Leicester", "Coventry", "Bradford", "Southampton",
    "Reading", "Derby", "Plymouth", "Wolverhampton", "Stoke", "Brighton",
    "Aberdeen", "Dundee", "Swansea", "York", "Cambridge", "Oxford"
]

DENOMINATIONS = [
    "Pentecostal", "Baptist", "Anglican", "Methodist", "Presbyterian",
    "Catholic", "Evangelical", "Charismatic", "Reformed", "Independent",
    "Apostolic", "Assemblies of God", "Church of God", "Elim"
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TIMES = {"morning": "morning", "afternoon": "afternoon", "evening": "evening"}

def parse_smart_query(query: str) -> Dict[str, Any]:
    filters = {}
    query_lower = query.lower()
    query_words = query.split()
    
    for city in UK_CITIES:
        if city.lower() in query_lower:
            filters["city"] = city
            break
    
    for denom in DENOMINATIONS:
        if denom.lower() in query_lower:
            filters["denomination"] = denom
            break
    
    for day in DAYS:
        if day.lower() in query_lower:
            filters["service_day"] = day
            break
    
    for time_key, time_val in TIMES.items():
        if time_key in query_lower:
            filters["service_time"] = time_val
            break
    
    if "free" in query_lower:
        filters["is_free"] = True
    
    if "verified" in query_lower:
        filters["is_verified"] = True
    
    area_patterns = ["north", "south", "east", "west", "central"]
    for area in area_patterns:
        if area in query_lower and "city" in filters:
            filters["area"] = area.capitalize()
            break
    
    return filters

def build_search_pipeline(query: str, filters: Dict, listing_type: Optional[str] = None, limit: int = 20, skip: int = 0) -> List[Dict]:
    pipeline = []
    
    match_stage = {"moderation_status": "approved"}
    
    if listing_type:
        match_stage["listing_type"] = listing_type
    
    if filters.get("city"):
        match_stage["city"] = {"$regex": filters["city"], "$options": "i"}
    
    if filters.get("denomination"):
        match_stage["denomination"] = {"$regex": filters["denomination"], "$options": "i"}
    
    if filters.get("is_free") is not None:
        match_stage["is_free"] = filters["is_free"]
    
    if filters.get("is_verified") is not None:
        match_stage["is_verified"] = filters["is_verified"]
    
    if query and query.strip():
        try:
            pipeline.append({
                "$search": {
                    "index": "default",
                    "text": {
                        "query": query,
                        "path": ["name", "description", "denomination", "city", "tags"],
                        "fuzzy": {"maxEdits": 1}
                    }
                }
            })
            pipeline.append({"$addFields": {"search_score": {"$meta": "searchScore"}}})
        except:
            match_stage["$text"] = {"$search": query}
            pipeline.append({"$match": match_stage})
            pipeline.append({"$addFields": {"search_score": {"$meta": "textScore"}}})
            match_stage = {}
    
    if match_stage:
        pipeline.append({"$match": match_stage})
    
    pipeline.extend([
        {"$sort": {"search_score": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$project": {
                "_id": 1,
                "name": 1,
                "slug": 1,
                "city": 1,
                "listing_type": 1,
                "denomination": 1,
                "image": 1,
                "images": 1,
                "rating": 1,
                "total_reviews": 1,
                "is_verified": 1,
                "description": 1,
                "search_score": 1,
                "created_at": 1
            }
        }
    ])
    
    return pipeline

@router.get("", response_model=SearchResponse)
async def universal_search(
    q: str = Query("", description="Search query"),
    type: Optional[str] = Query(None, description="church, event, pastor, worship-leader, media-team, bible-college"),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    try:
        filters = parse_smart_query(q)
        
        if city:
            filters["city"] = city
        if denomination:
            filters["denomination"] = denomination
        
        skip = (page - 1) * limit
        
        collections = ["churches", "events", "pastors", "worship_leaders", "media_teams", "bible_colleges"]
        if type:
            type_map = {
                "church": "churches",
                "event": "events",
                "pastor": "pastors",
                "worship-leader": "worship_leaders",
                "media-team": "media_teams",
                "bible-college": "bible_colleges"
            }
            collections = [type_map.get(type, type)]
        
        all_results = []
        total_count = 0
        
        for collection_name in collections:
            collection = db[collection_name]
            
            pipeline = build_search_pipeline(q, filters, None, limit, skip)
            results = list(collection.aggregate(pipeline))
            
            for result in results:
                result["_id"] = str(result["_id"])
                result["type"] = collection_name.rstrip('s')
                all_results.append(result)
            
            count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
            count_pipeline.append({"$count": "total"})
            count_result = list(collection.aggregate(count_pipeline))
            if count_result:
                total_count += count_result[0]["total"]
        
        all_results.sort(key=lambda x: x.get("search_score", 0), reverse=True)
        all_results = all_results[:limit]
        
        return SearchResponse(
            results=all_results,
            total=total_count,
            page=page,
            limit=limit,
            query=q
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/churches", response_model=SearchResponse)
async def search_churches(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    distance_from: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if denomination:
        filters["denomination"] = denomination
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    results = list(db.churches.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "church"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.churches.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/events", response_model=SearchResponse)
async def search_events(
    q: str = Query(""),
    city: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_free: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if is_free is not None:
        filters["is_free"] = is_free
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    if date_from or date_to:
        date_match = {}
        if date_from:
            date_match["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_match["$lte"] = datetime.fromisoformat(date_to)
        pipeline.insert(1, {"$match": {"event_date": date_match}})
    
    results = list(db.events.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "event"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.events.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/pastors", response_model=SearchResponse)
async def search_pastors(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if denomination:
        filters["denomination"] = denomination
    if open_to_visits is not None:
        filters["open_to_visits"] = open_to_visits
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    results = list(db.pastors.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "pastor"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.pastors.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/worship-leaders", response_model=SearchResponse)
async def search_worship_leaders(
    q: str = Query(""),
    city: Optional[str] = None,
    genre: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if genre:
        filters["genre"] = genre
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    results = list(db.worship_leaders.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "worship-leader"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.worship_leaders.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/media-teams", response_model=SearchResponse)
async def search_media_teams(
    q: str = Query(""),
    city: Optional[str] = None,
    service_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if service_type:
        filters["service_type"] = service_type
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    results = list(db.media_teams.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "media-team"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.media_teams.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/bible-colleges", response_model=SearchResponse)
async def search_bible_colleges(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = parse_smart_query(q)
    if city:
        filters["city"] = city
    if denomination:
        filters["denomination"] = denomination
    
    skip = (page - 1) * limit
    pipeline = build_search_pipeline(q, filters, None, limit, skip)
    
    results = list(db.bible_colleges.aggregate(pipeline))
    for result in results:
        result["_id"] = str(result["_id"])
        result["type"] = "bible-college"
    
    count_pipeline = pipeline[:pipeline.index(next(s for s in pipeline if "$skip" in s))]
    count_pipeline.append({"$count": "total"})
    count_result = list(db.bible_colleges.aggregate(count_pipeline))
    total = count_result[0]["total"] if count_result else 0
    
    return SearchResponse(results=results, total=total, page=page, limit=limit, query=q)

@router.get("/conversational")
async def conversational_search(request: Request, q: str = Query(...)):
    daily_limit = 20
    cache_hours = 24
    
    query_hash = hashlib.md5(q.lower().encode()).hexdigest()
    
    cached = db.search_cache.find_one({"query_hash": query_hash})
    if cached and cached.get("expires_at") > datetime.utcnow():
        return {"results": cached["results"], "cached": True}
    
    today = datetime.utcnow().date()
    usage_count = db.search_usage.count_documents({
        "date": today,
        "type": "conversational"
    })
    
    if usage_count >= daily_limit:
        raise HTTPException(status_code=429, detail="Daily conversational search limit reached. Try standard search.")
    
    try:
        import anthropic
        client = anthropic.Anthropic()
        
        context = f"Search UK churches database. Query: {q}"
        
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": context}]
        )
        
        result_text = message.content[0].text
        
        db.search_cache.insert_one({
            "query_hash": query_hash,
            "query": q,
            "results": result_text,
            "expires_at": datetime.utcnow() + timedelta(hours=cache_hours),
            "created_at": datetime.utcnow()
        })
        
        db.search_usage.insert_one({
            "date": today,
            "type": "conversational",
            "query": q,
            "created_at": datetime.utcnow()
        })
        
        return {"results": result_text, "cached": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI search failed: {str(e)}")
