from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from ..database import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/events")
async def get_events(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    church_id: Optional[str] = None
):
    try:
        query = {"status": "active"}
        
        if date_from == "this_saturday":
            today = datetime.now()
            days_until_saturday = (5 - today.weekday()) % 7
            if days_until_saturday == 0 and today.weekday() != 5:
                days_until_saturday = 7
            saturday = today + timedelta(days=days_until_saturday)
            saturday = saturday.replace(hour=0, minute=0, second=0, microsecond=0)
            query["event_date"] = {"$gte": saturday}
        elif date_from:
            try:
                from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query["event_date"] = {"$gte": from_date}
            except ValueError:
                pass
        
        if date_to == "next_sunday":
            today = datetime.now()
            days_until_saturday = (5 - today.weekday()) % 7
            if days_until_saturday == 0 and today.weekday() != 5:
                days_until_saturday = 7
            saturday = today + timedelta(days=days_until_saturday)
            sunday = saturday + timedelta(days=1)
            sunday = sunday.replace(hour=23, minute=59, second=59, microsecond=999999)
            if "event_date" in query:
                query["event_date"]["$lte"] = sunday
            else:
                query["event_date"] = {"$lte": sunday}
        elif date_to:
            try:
                to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                if "event_date" in query:
                    query["event_date"]["$lte"] = to_date
                else:
                    query["event_date"] = {"$lte": to_date}
            except ValueError:
                pass
        
        if church_id:
            query["church_id"] = church_id
        
        events = await db.events.find(query).sort("event_date", 1).skip(skip).limit(limit).to_list(length=limit)
        total = await db.events.count_documents(query)
        
        for event in events:
            event["_id"] = str(event["_id"])
            if "event_date" in event and isinstance(event["event_date"], datetime):
                event["event_date"] = event["event_date"].isoformat()
        
        return {
            "events": events,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        logger.error(f"Error fetching events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")