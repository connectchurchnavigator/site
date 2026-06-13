from fastapi import APIRouter, HTTPException
from ..database import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/stats")
async def get_stats():
    try:
        churches_count = await db.churches.count_documents({"status": "active"})
        pastors_count = await db.pastors.count_documents({"status": "active"}) if "pastors" in await db.list_collection_names() else 0
        worship_leaders_count = await db.worship_leaders.count_documents({"status": "active"}) if "worship_leaders" in await db.list_collection_names() else 0
        media_teams_count = await db.media_teams.count_documents({"status": "active"}) if "media_teams" in await db.list_collection_names() else 0
        events_count = await db.events.count_documents({"status": "active"}) if "events" in await db.list_collection_names() else 0
        bible_colleges_count = await db.bible_colleges.count_documents({"status": "active"}) if "bible_colleges" in await db.list_collection_names() else 0
        
        return {
            "churches": churches_count,
            "pastors": pastors_count,
            "worship_leaders": worship_leaders_count,
            "media_teams": media_teams_count,
            "events": events_count,
            "bible_colleges": bible_colleges_count
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")