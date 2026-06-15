from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.database import get_database
from app.models.homepage import HomepageStats, HomepageActivity, ListingCounts
import logging

router = APIRouter(prefix="/api/homepage", tags=["homepage"])
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_homepage_stats(db=Depends(get_database)) -> Dict[str, Any]:
    try:
        cache_key = "homepage_stats"
        cache = await db.cache.find_one({"key": cache_key})
        
        if cache and cache.get("expires_at") > datetime.utcnow():
            return cache["data"]
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        last_monday = today - timedelta(days=today.weekday())
        
        churches_count = await db.churches.count_documents({"status": "published"})
        events_count = await db.events.count_documents({
            "status": "published",
            "date": {"$gte": today}
        })
        pastors_count = await db.pastors.count_documents({"status": "published"})
        
        cities = await db.churches.distinct("city", {"status": "published"})
        cities_count = len(cities)
        
        registered_users = await db.users.count_documents({})
        
        visits_this_week = await db.visitor_checkins.count_documents({
            "created_at": {"$gte": last_monday}
        }) if "visitor_checkins" in await db.list_collection_names() else 0
        
        stats = {
            "churches": churches_count,
            "events": events_count,
            "pastors": pastors_count,
            "cities": cities_count,
            "registered_users": registered_users,
            "visits_this_week": visits_this_week
        }
        
        await db.cache.update_one(
            {"key": cache_key},
            {
                "$set": {
                    "data": stats,
                    "expires_at": datetime.utcnow() + timedelta(hours=1)
                }
            },
            upsert=True
        )
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching homepage stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")

@router.get("/activity")
async def get_homepage_activity(limit: int = 20, db=Depends(get_database)) -> List[Dict[str, Any]]:
    try:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        activities = await db.homepage_activity.find(
            {"created_at": {"$gte": seven_days_ago}}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        for activity in activities:
            activity["_id"] = str(activity["_id"])
            if "church_id" in activity and activity["church_id"]:
                activity["church_id"] = str(activity["church_id"])
            
            time_diff = datetime.utcnow() - activity["created_at"]
            if time_diff.total_seconds() < 3600:
                mins = int(time_diff.total_seconds() / 60)
                activity["time_ago"] = f"{mins} min{'s' if mins != 1 else ''} ago"
            elif time_diff.total_seconds() < 86400:
                hours = int(time_diff.total_seconds() / 3600)
                activity["time_ago"] = f"{hours} hour{'s' if hours != 1 else ''} ago"
            else:
                days = int(time_diff.total_seconds() / 86400)
                activity["time_ago"] = f"{days} day{'s' if days != 1 else ''} ago"
        
        return activities
    except Exception as e:
        logger.error(f"Error fetching homepage activity: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity")

@router.get("/counts")
async def get_listing_counts(db=Depends(get_database)) -> Dict[str, int]:
    try:
        cache_key = "listing_counts"
        cache = await db.cache.find_one({"key": cache_key})
        
        if cache and cache.get("expires_at") > datetime.utcnow():
            return cache["data"]
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        churches = await db.churches.count_documents({"status": "published"})
        pastors = await db.pastors.count_documents({"status": "published"})
        
        worship_leaders = 0
        if "worship_leaders" in await db.list_collection_names():
            worship_leaders = await db.worship_leaders.count_documents({"status": "published"})
        
        media_teams = 0
        if "media_teams" in await db.list_collection_names():
            media_teams = await db.media_teams.count_documents({"status": "published"})
        
        events = await db.events.count_documents({
            "status": "published",
            "date": {"$gte": today}
        })
        
        bible_colleges = 0
        if "bible_colleges" in await db.list_collection_names():
            bible_colleges = await db.bible_colleges.count_documents({"status": "published"})
        
        counts = {
            "churches": churches,
            "pastors": pastors,
            "worship_leaders": worship_leaders,
            "media_teams": media_teams,
            "events": events,
            "bible_colleges": bible_colleges
        }
        
        await db.cache.update_one(
            {"key": cache_key},
            {
                "$set": {
                    "data": counts,
                    "expires_at": datetime.utcnow() + timedelta(hours=1)
                }
            },
            upsert=True
        )
        
        return counts
    except Exception as e:
        logger.error(f"Error fetching listing counts: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch counts")

@router.get("/mode")
async def get_homepage_mode(db=Depends(get_database)) -> Dict[str, str]:
    try:
        church_count = await db.churches.count_documents({"status": "published"})
        mode = "live" if church_count >= 50 else "curated"
        return {"mode": mode, "church_count": church_count}
    except Exception as e:
        logger.error(f"Error determining homepage mode: {e}")
        raise HTTPException(status_code=500, detail="Failed to determine mode")

async def track_activity(
    db,
    activity_type: str,
    title: str,
    subtitle: str,
    icon: str,
    color: str,
    link: str = None,
    church_id: str = None
):
    try:
        activity = {
            "type": activity_type,
            "title": title,
            "subtitle": subtitle,
            "icon": icon,
            "color": color,
            "link": link,
            "church_id": church_id,
            "created_at": datetime.utcnow()
        }
        await db.homepage_activity.insert_one(activity)
    except Exception as e:
        logger.error(f"Error tracking activity: {e}")