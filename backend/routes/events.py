from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timedelta
import time
import logging
from services.cache_service import cache_get, cache_set, cache_delete, cache_delete_pattern
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/events", tags=["events"])

class EventCreate(BaseModel):
    title: str
    description: str
    church_id: str
    date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    city: Optional[str] = None
    event_type: str
    cost: Optional[float] = None
    registration_url: Optional[str] = None

@router.get("")
async def get_events(
    city: Optional[str] = None,
    event_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    start = time.time()
    cache_key = f"events:list:{city}:{event_type}:{date_from}:{date_to}:{page}:{limit}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    query = {"status": "active"}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if event_type:
        query["event_type"] = event_type
    
    date_filter = {}
    if date_from:
        date_filter["$gte"] = datetime.fromisoformat(date_from)
    if date_to:
        date_filter["$lte"] = datetime.fromisoformat(date_to)
    else:
        date_filter["$gte"] = datetime.utcnow()
    
    if date_filter:
        query["date"] = date_filter
    
    skip = (page - 1) * limit
    
    cursor = db.events.find(query).sort("date", 1).skip(skip).limit(limit)
    events = await cursor.to_list(length=limit)
    
    for event in events:
        event["_id"] = str(event["_id"])
        if "church_id" in event:
            church = await db.churches.find_one({"_id": event["church_id"]})
            if church:
                event["church"] = {
                    "name": church.get("name"),
                    "slug": church.get("slug"),
                    "city": church.get("city")
                }
    
    total = await db.events.count_documents(query)
    
    result = {
        "events": events,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
    
    await cache_set(cache_key, result, ttl=300)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_events took {elapsed:.0f}ms")
    else:
        logger.info(f"get_events took {elapsed:.0f}ms")
    
    return result

@router.get("/{slug}")
async def get_event(slug: str):
    start = time.time()
    cache_key = f"events:detail:{slug}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    event = await db.events.find_one({"slug": slug, "status": "active"})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event["_id"] = str(event["_id"])
    
    if "church_id" in event:
        church = await db.churches.find_one({"_id": event["church_id"]})
        if church:
            event["church"] = {
                "_id": str(church["_id"]),
                "name": church.get("name"),
                "slug": church.get("slug"),
                "city": church.get("city"),
                "denomination": church.get("denomination")
            }
    
    await cache_set(cache_key, event, ttl=300)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_event took {elapsed:.0f}ms")
    else:
        logger.info(f"get_event took {elapsed:.0f}ms")
    
    return event

@router.post("")
async def create_event(event: EventCreate):
    start = time.time()
    db = await get_database()
    
    from slugify import slugify
    slug = slugify(event.title)
    
    base_slug = slug
    counter = 1
    while await db.events.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    event_doc = event.dict()
    event_doc["slug"] = slug
    event_doc["status"] = "active"
    event_doc["created_at"] = datetime.utcnow()
    event_doc["updated_at"] = datetime.utcnow()
    
    result = await db.events.insert_one(event_doc)
    event_doc["_id"] = str(result.inserted_id)
    
    await cache_delete_pattern("events:list:*")
    
    elapsed = (time.time() - start) * 1000
    logger.info(f"create_event took {elapsed:.0f}ms")
    
    return event_doc