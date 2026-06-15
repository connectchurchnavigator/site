from fastapi import APIRouter
import time
import logging
from datetime import datetime, timedelta
from services.cache_service import cache_get, cache_set
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/homepage", tags=["homepage"])

@router.get("/stats")
async def get_homepage_stats():
    start = time.time()
    cache_key = "homepage:stats"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    
    total_churches = await db.churches.count_documents({"status": "active"})
    total_events = await db.events.count_documents({"status": "active", "date": {"$gte": datetime.utcnow()}})
    total_pastors = await db.pastors.count_documents({"status": "active"})
    total_reviews = await db.reviews.count_documents({"status": "approved"})
    
    cities_cursor = db.churches.distinct("city", {"status": "active"})
    total_cities = len(await cities_cursor)
    
    stats = {
        "total_churches": total_churches,
        "total_events": total_events,
        "total_pastors": total_pastors,
        "total_cities": total_cities,
        "total_reviews": total_reviews
    }
    
    await cache_set(cache_key, stats, ttl=3600)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_homepage_stats took {elapsed:.0f}ms")
    else:
        logger.info(f"get_homepage_stats took {elapsed:.0f}ms")
    
    return stats

@router.get("/activity")
async def get_homepage_activity():
    start = time.time()
    cache_key = "homepage:activity"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    
    activity = []
    
    recent_churches = await db.churches.find(
        {"status": "active"},
        {"name": 1, "slug": 1, "city": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for church in recent_churches:
        activity.append({
            "type": "church_added",
            "name": church.get("name"),
            "slug": church.get("slug"),
            "city": church.get("city"),
            "timestamp": church.get("created_at")
        })
    
    recent_events = await db.events.find(
        {"status": "active", "date": {"$gte": datetime.utcnow()}},
        {"title": 1, "slug": 1, "city": 1, "date": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for event in recent_events:
        activity.append({
            "type": "event_added",
            "title": event.get("title"),
            "slug": event.get("slug"),
            "city": event.get("city"),
            "timestamp": event.get("date")
        })
    
    activity.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
    activity = activity[:10]
    
    await cache_set(cache_key, activity, ttl=60)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_homepage_activity took {elapsed:.0f}ms")
    else:
        logger.info(f"get_homepage_activity took {elapsed:.0f}ms")
    
    return {"activity": activity}