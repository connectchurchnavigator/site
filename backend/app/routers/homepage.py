from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..database import get_database
from ..models.homepage import HomepageStats, ActivityItem, ListingCounts
import pytz

router = APIRouter(prefix="/homepage", tags=["homepage"])

@router.get("/stats", response_model=HomepageStats)
async def get_homepage_stats(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Live platform statistics with 1hr cache."""
    cache_key = "homepage_stats"
    cache = await db.cache.find_one({"key": cache_key})
    
    if cache and cache.get("expires_at") > datetime.utcnow():
        return cache["data"]
    
    uk_tz = pytz.timezone("Europe/London")
    today = datetime.now(uk_tz).replace(hour=0, minute=0, second=0, microsecond=0)
    last_monday = today - timedelta(days=today.weekday())
    
    churches_count = await db.churches.count_documents({"status": "published"})
    events_count = await db.events.count_documents({
        "status": "published",
        "date": {"$gte": today.replace(tzinfo=None)}
    })
    pastors_count = await db.pastors.count_documents({"status": "published"})
    
    cities_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$city"}},
        {"$count": "total"}
    ]
    cities_result = await db.churches.aggregate(cities_pipeline).to_list(1)
    cities_count = cities_result[0]["total"] if cities_result else 0
    
    users_count = await db.users.count_documents({})
    visits_count = await db.visitor_checkins.count_documents({
        "created_at": {"$gte": last_monday.replace(tzinfo=None)}
    })
    
    stats = {
        "churches": churches_count,
        "events": events_count,
        "pastors": pastors_count,
        "cities": cities_count,
        "registered_users": users_count,
        "visits_this_week": visits_count
    }
    
    await db.cache.update_one(
        {"key": cache_key},
        {"$set": {
            "key": cache_key,
            "data": stats,
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        }},
        upsert=True
    )
    
    return stats

@router.get("/activity", response_model=List[ActivityItem])
async def get_activity_feed(
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Live activity feed from homepage_activity collection."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    activities = await db.homepage_activity.find(
        {"created_at": {"$gte": seven_days_ago}}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for activity in activities:
        time_diff = datetime.utcnow() - activity["created_at"]
        
        if time_diff < timedelta(minutes=1):
            time_ago = "Just now"
        elif time_diff < timedelta(hours=1):
            mins = int(time_diff.total_seconds() / 60)
            time_ago = f"{mins} min{'s' if mins > 1 else ''} ago"
        elif time_diff < timedelta(days=1):
            hours = int(time_diff.total_seconds() / 3600)
            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff < timedelta(days=2):
            time_ago = "Yesterday"
        else:
            days = time_diff.days
            time_ago = f"{days} day{'s' if days > 1 else ''} ago"
        
        result.append({
            "_id": str(activity["_id"]),
            "type": activity["type"],
            "title": activity["title"],
            "subtitle": activity["subtitle"],
            "icon": activity["icon"],
            "color": activity["color"],
            "link": activity.get("link"),
            "time_ago": time_ago,
            "created_at": activity["created_at"]
        })
    
    return result

@router.get("/counts", response_model=ListingCounts)
async def get_listing_counts(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Listing type counts with 1hr cache."""
    cache_key = "listing_counts"
    cache = await db.cache.find_one({"key": cache_key})
    
    if cache and cache.get("expires_at") > datetime.utcnow():
        return cache["data"]
    
    uk_tz = pytz.timezone("Europe/London")
    today = datetime.now(uk_tz).replace(hour=0, minute=0, second=0, microsecond=0)
    
    counts = {
        "churches": await db.churches.count_documents({"status": "published"}),
        "pastors": await db.pastors.count_documents({"status": "published"}),
        "worship_leaders": await db.worship_leaders.count_documents({"status": "published"}),
        "media_teams": await db.media_teams.count_documents({"status": "published"}),
        "events": await db.events.count_documents({
            "status": "published",
            "date": {"$gte": today.replace(tzinfo=None)}
        }),
        "bible_colleges": await db.bible_colleges.count_documents({"status": "published"})
    }
    
    await db.cache.update_one(
        {"key": cache_key},
        {"$set": {
            "key": cache_key,
            "data": counts,
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        }},
        upsert=True
    )
    
    return counts

@router.get("/mode")
async def get_homepage_mode(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Determine if homepage should show curated or live mode."""
    church_count = await db.churches.count_documents({"status": "published"})
    mode = "live" if church_count >= 50 else "curated"
    
    return {
        "mode": mode,
        "church_count": church_count,
        "threshold": 50
    }