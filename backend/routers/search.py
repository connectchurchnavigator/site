from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import re
from motor.motor_asyncio import AsyncIOMotorClient
from ..database import get_database
from pydantic import BaseModel
import hashlib
import json

router = APIRouter(prefix="/api/search", tags=["search"])

UK_CITIES = [
    "London", "Birmingham", "Manchester", "Leeds", "Glasgow", "Sheffield",
    "Liverpool", "Edinburgh", "Bristol", "Cardiff", "Belfast", "Newcastle",
    "Nottingham", "Leicester", "Coventry", "Bradford", "Southampton",
    "Brighton", "Hull", "Plymouth", "Stoke", "Wolverhampton", "Derby",
    "Swansea", "Reading", "Luton", "Oxford", "Cambridge", "York", "Bath"
]

DENOMINATIONS = [
    "Pentecostal", "Baptist", "Anglican", "Methodist", "Catholic",
    "Presbyterian", "Evangelical", "Charismatic", "Reformed",
    "Independent", "Assemblies of God", "Church of England",
    "Church of Scotland", "Elim", "New Frontiers", "Vineyard"
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
TIMES = ["morning", "afternoon", "evening", "night"]

class SearchResult(BaseModel):
    results: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int
    has_more: bool
    query_info: Dict[str, Any]

def parse_smart_query(q: str) -> Dict[str, Any]:
    filters = {}
    q_lower = q.lower()
    
    for city in UK_CITIES:
        if city.lower() in q_lower:
            filters["city"] = city
            break
    
    for denom in DENOMINATIONS:
        if denom.lower() in q_lower:
            filters["denomination"] = denom
            break
    
    for day in DAYS:
        if day.lower() in q_lower:
            filters["service_day"] = day
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
        filters["near_me"] = True
    
    if "this weekend" in q_lower or "weekend" in q_lower:
        filters["weekend"] = True
    elif "today" in q_lower:
        filters["today"] = True
    elif "tomorrow" in q_lower:
        filters["tomorrow"] = True
    
    clean_q = q
    for val in list(filters.values()):
        if isinstance(val, str):
            clean_q = re.sub(re.escape(val), "", clean_q, flags=re.IGNORECASE)
    clean_q = " ".join(clean_q.split())
    
    return {"filters": filters, "clean_query": clean_q}

async def build_search_pipeline(
    collection_name: str,
    query: str,
    filters: Dict[str, Any],
    page: int,
    per_page: int,
    db
) -> List[Dict]:
    pipeline = []
    match_stage = {"moderation_status": "approved"}
    
    if collection_name:
        match_stage["listing_type"] = collection_name
    
    for key, value in filters.items():
        if key in ["near_me", "weekend", "today", "tomorrow"]:
            continue
        if key == "city":
            match_stage["city"] = {"$regex": value, "$options": "i"}
        elif key == "denomination":
            match_stage["denomination"] = {"$regex": value, "$options": "i"}
        elif key == "service_day" and collection_name == "churches":
            match_stage["service_times.day"] = value
        elif key == "service_time" and collection_name == "churches":
            match_stage["service_times.time"] = {"$regex": value, "$options": "i"}
        elif key == "is_free" and collection_name == "events":
            match_stage["is_free"] = value
    
    if filters.get("today"):
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        match_stage["event_date"] = {"$gte": today, "$lt": today + timedelta(days=1)}
    elif filters.get("tomorrow"):
        tomorrow = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        match_stage["event_date"] = {"$gte": tomorrow, "$lt": tomorrow + timedelta(days=1)}
    elif filters.get("weekend"):
        now = datetime.utcnow()
        days_until_saturday = (5 - now.weekday()) % 7
        saturday = (now + timedelta(days=days_until_saturday)).replace(hour=0, minute=0, second=0, microsecond=0)
        monday = saturday + timedelta(days=2)
        match_stage["event_date"] = {"$gte": saturday, "$lt": monday}
    
    if query:
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
            pipeline.append({"$addFields": {"score": {"$meta": "searchScore"}}})
        except:
            match_stage["$text"] = {"$search": query}
            pipeline.append({"$match": match_stage})
            pipeline.append({"$addFields": {"score": {"$meta": "textScore"}}})
            match_stage = {}
    
    if match_stage:
        pipeline.append({"$match": match_stage})
    
    pipeline.extend([
        {"$sort": {"score": -1, "created_at": -1} if query else {"created_at": -1}},
        {
            "$project": {
                "name": 1,
                "slug": 1,
                "city": 1,
                "listing_type": 1,
                "denomination": 1,
                "image": 1,
                "rating": 1,
                "total_reviews": 1,
                "is_verified": 1,
                "description": 1,
                "event_date": 1,
                "is_free": 1,
                "score": 1
            }
        }
    ])
    
    return pipeline

@router.get("", response_model=SearchResult)
async def universal_search(
    q: str = Query("", description="Search query"),
    type: Optional[str] = Query(None, description="Filter by type: church, event, pastor, worship_leader, media_team, bible_college"),
    city: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    distance_km: Optional[float] = Query(None, ge=0, le=100),
    db = Depends(get_database)
):
    parsed = parse_smart_query(q)
    filters = parsed["filters"]
    clean_query = parsed["clean_query"]
    
    if city:
        filters["city"] = city
    if denomination:
        filters["denomination"] = denomination
    
    collection_map = {
        "church": "churches",
        "event": "events",
        "pastor": "pastors",
        "worship_leader": "worship_leaders",
        "media_team": "media_teams",
        "bible_college": "bible_colleges"
    }
    
    collection_name = collection_map.get(type) if type else None
    
    if lat is not None and lng is not None and distance_km:
        collection = db[collection_name] if collection_name else db.churches
        
        match_stage = {"moderation_status": "approved"}
        for key, value in filters.items():
            if key not in ["near_me", "weekend", "today", "tomorrow"]:
                match_stage[key] = value
        
        pipeline = [
            {
                "$geoNear": {
                    "near": {"type": "Point", "coordinates": [lng, lat]},
                    "distanceField": "distance_km",
                    "maxDistance": distance_km * 1000,
                    "spherical": True,
                    "query": match_stage
                }
            },
            {"$skip": (page - 1) * per_page},
            {"$limit": per_page},
            {
                "$project": {
                    "name": 1, "slug": 1, "city": 1, "listing_type": 1,
                    "denomination": 1, "image": 1, "rating": 1,
                    "total_reviews": 1, "is_verified": 1, "distance_km": 1
                }
            }
        ]
        
        results = await collection.aggregate(pipeline).to_list(length=per_page)
        total = len(results)
    else:
        if collection_name:
            collection = db[collection_name]
        else:
            collections = ["churches", "events", "pastors", "worship_leaders", "media_teams", "bible_colleges"]
            all_results = []
            
            for coll_name in collections:
                pipeline = await build_search_pipeline(coll_name, clean_query, filters, 1, per_page, db)
                coll_results = await db[coll_name].aggregate(pipeline).to_list(length=per_page)
                for r in coll_results:
                    r["listing_type"] = coll_name
                all_results.extend(coll_results)
            
            all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
            
            start = (page - 1) * per_page
            end = start + per_page
            results = all_results[start:end]
            total = len(all_results)
            
            return SearchResult(
                results=results,
                total=total,
                page=page,
                per_page=per_page,
                has_more=end < total,
                query_info={"query": q, "filters": filters, "clean_query": clean_query}
            )
        
        pipeline = await build_search_pipeline(collection_name, clean_query, filters, page, per_page, db)
        
        count_pipeline = pipeline[:-2] if len(pipeline) > 2 else pipeline
        count_pipeline.append({"$count": "total"})
        
        total_result = await collection.aggregate(count_pipeline).to_list(length=1)
        total = total_result[0]["total"] if total_result else 0
        
        pipeline.extend([
            {"$skip": (page - 1) * per_page},
            {"$limit": per_page}
        ])
        
        results = await collection.aggregate(pipeline).to_list(length=per_page)
    
    return SearchResult(
        results=results,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(page * per_page) < total,
        query_info={"query": q, "filters": filters, "clean_query": clean_query}
    )

@router.get("/churches", response_model=SearchResult)
async def search_churches(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    distance_km: Optional[float] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    return await universal_search(q=q, type="church", city=city, denomination=denomination,
                                   lat=lat, lng=lng, distance_km=distance_km,
                                   page=page, per_page=per_page, db=db)

@router.get("/events", response_model=SearchResult)
async def search_events(
    q: str = Query(""),
    city: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    is_free: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    parsed = parse_smart_query(q)
    filters = parsed["filters"]
    if city:
        filters["city"] = city
    if is_free is not None:
        filters["is_free"] = is_free
    
    match_stage = {"moderation_status": "approved"}
    if date_from or date_to:
        match_stage["event_date"] = {}
        if date_from:
            match_stage["event_date"]["$gte"] = date_from
        if date_to:
            match_stage["event_date"]["$lte"] = date_to
    
    for key, value in filters.items():
        if key not in ["near_me", "weekend", "today", "tomorrow"]:
            match_stage[key] = value
    
    pipeline = await build_search_pipeline("events", parsed["clean_query"], filters, page, per_page, db)
    
    collection = db.events
    total_result = await collection.count_documents(match_stage)
    results = await collection.aggregate(pipeline + [{"$skip": (page-1)*per_page}, {"$limit": per_page}]).to_list(per_page)
    
    return SearchResult(
        results=results,
        total=total_result,
        page=page,
        per_page=per_page,
        has_more=(page * per_page) < total_result,
        query_info={"query": q, "filters": filters}
    )

@router.get("/pastors", response_model=SearchResult)
async def search_pastors(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    filters = {}
    if city:
        filters["city"] = city
    if denomination:
        filters["denomination"] = denomination
    if open_to_visits is not None:
        filters["open_to_visits"] = open_to_visits
    
    return await universal_search(q=q, type="pastor", city=city, denomination=denomination,
                                   page=page, per_page=per_page, db=db)

@router.get("/worship-leaders", response_model=SearchResult)
async def search_worship_leaders(
    q: str = Query(""),
    city: Optional[str] = None,
    genre: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    return await universal_search(q=q, type="worship_leader", city=city,
                                   page=page, per_page=per_page, db=db)

@router.get("/media-teams", response_model=SearchResult)
async def search_media_teams(
    q: str = Query(""),
    city: Optional[str] = None,
    service_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    return await universal_search(q=q, type="media_team", city=city,
                                   page=page, per_page=per_page, db=db)

@router.get("/bible-colleges", response_model=SearchResult)
async def search_bible_colleges(
    q: str = Query(""),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db = Depends(get_database)
):
    return await universal_search(q=q, type="bible_college", city=city, denomination=denomination,
                                   page=page, per_page=per_page, db=db)

CONVERSATIONAL_LIMIT_PER_DAY = 20
CONVERSATIONAL_CACHE_HOURS = 24

@router.get("/conversational")
async def conversational_search(
    q: str = Query(..., min_length=10),
    db = Depends(get_database)
):
    query_hash = hashlib.md5(q.lower().encode()).hexdigest()
    
    cached = await db.search_cache.find_one({"query_hash": query_hash})
    if cached and cached.get("created_at") > datetime.utcnow() - timedelta(hours=CONVERSATIONAL_CACHE_HOURS):
        return {"answer": cached["answer"], "cached": True}
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    count_doc = await db.conversational_usage.find_one({"date": today})
    
    if count_doc and count_doc.get("count", 0) >= CONVERSATIONAL_LIMIT_PER_DAY:
        raise HTTPException(status_code=429, detail="Daily conversational search limit reached. Please try standard search.")
    
    try:
        import anthropic
        import os
        
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        churches_sample = await db.churches.find({"moderation_status": "approved"}).limit(50).to_list(50)
        context = "\n".join([f"{c['name']} - {c.get('city', 'N/A')} - {c.get('denomination', 'N/A')}" for c in churches_sample])
        
        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"You are a church directory assistant. Based on this UK church data:\n{context}\n\nUser question: {q}\n\nProvide a helpful, concise answer."
            }]
        )
        
        answer = message.content[0].text
        
        await db.search_cache.insert_one({
            "query_hash": query_hash,
            "query": q,
            "answer": answer,
            "created_at": datetime.utcnow()
        })
        
        await db.conversational_usage.update_one(
            {"date": today},
            {"$inc": {"count": 1}, "$set": {"date": today}},
            upsert=True
        )
        
        return {"answer": answer, "cached": False}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversational search failed: {str(e)}")
