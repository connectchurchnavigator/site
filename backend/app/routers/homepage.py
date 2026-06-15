from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from ..database import get_database
from ..models.homepage import HomepageStats, HomepageActivity, HomepageCounts
import logging

router = APIRouter(prefix="/homepage", tags=["homepage"])
logger = logging.getLogger(__name__)

@router.get("/stats", response_model=HomepageStats)
async def get_homepage_stats(db=Depends(get_database)):
    cache_key = "homepage_stats"
    cached = await db.cache.find_one({"key": cache_key})
    
    if cached and cached.get("expires_at") > datetime.utcnow():
        return cached["data"]
    
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        last_monday = today - timedelta(days=today.weekday())
        
        churches_count = await db.churches.count_documents({"status": "published"})
        events_count = await db.events.count_documents({"date": {"$gte": today}, "status": "published"})
        pastors_count = await db.pastors.count_documents({"status": "published"})
        
        cities_pipeline = [
            {"$match": {"status": "published"}},
            {"$group": {"_id": "$city"}}
        ]
        cities = await db.churches.aggregate(cities_pipeline).to_list(None)
        cities_count = len(cities)
        
        users_count = await db.users.count_documents({})
        visits_count = await db.visitor_checkins.count_documents({"created_at": {"$gte": last_monday}})
        
        believers_count = max(users_count, churches_count * 150)
        
        stats = {
            "churches": churches_count,
            "events": events_count,
            "pastors": pastors_count,
            "cities": cities_count,
            "registered_users": users_count,
            "visits_this_week": visits_count,
            "believers_connected": believers_count
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
    except Exception as e:
        logger.error(f"Error fetching homepage stats: {e}")
        return {
            "churches": 29000,
            "events": 0,
            "pastors": 0,
            "cities": 0,
            "registered_users": 0,
            "visits_this_week": 0,
            "believers_connected": 0
        }

@router.get("/activity")
async def get_homepage_activity(limit: int = 20, db=Depends(get_database)):
    try:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        activities = await db.homepage_activity.find(
            {"created_at": {"$gte": seven_days_ago}}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        for activity in activities:
            activity["_id"] = str(activity["_id"])
            if "church_id" in activity and activity["church_id"]:
                activity["church_id"] = str(activity["church_id"])
        
        return activities
    except Exception as e:
        logger.error(f"Error fetching activity feed: {e}")
        return []

@router.get("/counts", response_model=HomepageCounts)
async def get_homepage_counts(db=Depends(get_database)):
    cache_key = "homepage_counts"
    cached = await db.cache.find_one({"key": cache_key})
    
    if cached and cached.get("expires_at") > datetime.utcnow():
        return cached["data"]
    
    try:
        churches = await db.churches.count_documents({"status": "published"})
        pastors = await db.pastors.count_documents({"status": "published"})
        worship_leaders = await db.worship_leaders.count_documents({"status": "published"})
        media_teams = await db.media_teams.count_documents({"status": "published"})
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        events = await db.events.count_documents({"date": {"$gte": today}, "status": "published"})
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
            {"$set": {
                "key": cache_key,
                "data": counts,
                "expires_at": datetime.utcnow() + timedelta(hours=1)
            }},
            upsert=True
        )
        
        return counts
    except Exception as e:
        logger.error(f"Error fetching homepage counts: {e}")
        return {
            "churches": 0,
            "pastors": 0,
            "worship_leaders": 0,
            "media_teams": 0,
            "events": 0,
            "bible_colleges": 0
        }

@router.get("/mode")
async def get_homepage_mode(db=Depends(get_database)):
    try:
        church_count = await db.churches.count_documents({"status": "published"})
        mode = "live" if church_count >= 50 else "curated"
        return {"mode": mode, "church_count": church_count}
    except Exception as e:
        logger.error(f"Error determining homepage mode: {e}")
        return {"mode": "curated", "church_count": 0}

async def track_activity(
    db,
    activity_type: str,
    title: str,
    subtitle: str,
    icon: str,
    color: str,
    link: str = "",
    church_id: Optional[str] = None
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
        logger.info(f"Activity tracked: {activity_type} - {title}")
    except Exception as e:
        logger.error(f"Error tracking activity: {e}")