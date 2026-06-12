from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import List, Optional
from pymongo import DESCENDING
from bson import ObjectId
import os
from ..database import get_database
from ..models.church_dashboard import (
    VisitorCheckIn, ContactMessage, Follower, ChurchPost,
    SpaceRentalEnquiry, PageView, ChurchSettings
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/church/{slug}/overview")
async def get_overview(slug: str):
    db = get_database()
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    completion_score = calculate_profile_completion(church)
    
    views_count = await db.page_views.count_documents({
        "church_slug": slug,
        "viewed_at": {"$gte": week_ago}
    })
    
    messages_count = await db.contact_messages.count_documents({
        "church_slug": slug,
        "received_at": {"$gte": week_ago}
    })
    
    followers_count = await db.followers.count_documents({
        "church_slug": slug,
        "followed_at": {"$gte": week_ago}
    })
    
    visits_count = await db.visitor_checkins.count_documents({
        "church_slug": slug,
        "check_in_date": {"$gte": week_ago}
    })
    
    recent_activity = []
    async for msg in db.contact_messages.find({"church_slug": slug}).sort("received_at", DESCENDING).limit(5):
        recent_activity.append({
            "type": "message",
            "text": f"New message from {msg['sender_name']}",
            "timestamp": msg["received_at"]
        })
    
    async for visit in db.visitor_checkins.find({"church_slug": slug}).sort("check_in_date", DESCENDING).limit(5):
        recent_activity.append({
            "type": "visit",
            "text": f"{visit['visitor_name']} checked in",
            "timestamp": visit["check_in_date"]
        })
    
    recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activity = recent_activity[:10]
    
    return {
        "completion_score": completion_score,
        "this_week": {
            "views": views_count,
            "messages": messages_count,
            "followers": followers_count,
            "visits": visits_count
        },
        "recent_activity": recent_activity
    }

def calculate_profile_completion(church: dict) -> dict:
    fields = [
        "name", "description", "address", "city", "postcode",
        "phone", "email", "website", "denomination", "service_times",
        "pastor_name", "image_url"
    ]
    completed = sum(1 for f in fields if church.get(f))
    percentage = int((completed / len(fields)) * 100)
    
    tips = []
    if not church.get("image_url"):
        tips.append("Add a profile image")
    if not church.get("description"):
        tips.append("Write a description")
    if not church.get("service_times"):
        tips.append("Add service times")
    
    return {"percentage": percentage, "tips": tips}

@router.get("/church/{slug}/visitors")
async def get_visitors(slug: str, month: Optional[int] = None, year: Optional[int] = None):
    db = get_database()
    now = datetime.utcnow()
    
    if not month:
        month = now.month
    if not year:
        year = now.year
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    total_checkins = await db.visitor_checkins.count_documents({
        "church_slug": slug,
        "check_in_date": {"$gte": start_date, "$lt": end_date}
    })
    
    first_time_count = await db.visitor_checkins.count_documents({
        "church_slug": slug,
        "check_in_date": {"$gte": start_date, "$lt": end_date},
        "is_first_time": True
    })
    
    returning_count = total_checkins - first_time_count
    
    visitors = []
    async for visit in db.visitor_checkins.find({
        "church_slug": slug,
        "check_in_date": {"$gte": start_date, "$lt": end_date}
    }).sort("check_in_date", DESCENDING):
        visitors.append({
            "id": str(visit["_id"]),
            "name": visit["visitor_name"],
            "email": visit.get("visitor_email"),
            "phone": visit.get("visitor_phone"),
            "date": visit["check_in_date"].isoformat(),
            "is_first_time": visit["is_first_time"],
            "notes": visit.get("notes")
        })
    
    return {
        "total_checkins": total_checkins,
        "first_time_count": first_time_count,
        "returning_count": returning_count,
        "visitors": visitors
    }

@router.post("/church/{slug}/visitor-checkin")
async def create_visitor_checkin(slug: str, data: dict):
    db = get_database()
    checkin = {
        "church_slug": slug,
        "visitor_name": data["name"],
        "visitor_email": data.get("email"),
        "visitor_phone": data.get("phone"),
        "check_in_date": datetime.utcnow(),
        "is_first_time": data.get("is_first_time", False),
        "visit_purpose": data.get("purpose"),
        "notes": data.get("notes")
    }
    result = await db.visitor_checkins.insert_one(checkin)
    return {"id": str(result.inserted_id)}

@router.get("/church/{slug}/messages")
async def get_messages(slug: str, filter: str = "all"):
    db = get_database()
    query = {"church_slug": slug}
    
    if filter == "unread":
        query["is_read"] = False
    elif filter != "all":
        query["is_archived"] = False
    
    messages = []
    async for msg in db.contact_messages.find(query).sort("received_at", DESCENDING):
        messages.append({
            "id": str(msg["_id"]),
            "sender_name": msg["sender_name"],
            "sender_email": msg["sender_email"],
            "sender_phone": msg.get("sender_phone"),
            "message": msg["message"],
            "received_at": msg["received_at"].isoformat(),
            "is_read": msg["is_read"],
            "is_archived": msg.get("is_archived", False)
        })
    
    return {"messages": messages}

@router.patch("/church/{slug}/messages/{message_id}")
async def update_message(slug: str, message_id: str, data: dict):
    db = get_database()
    update_data = {}
    
    if "is_read" in data:
        update_data["is_read"] = data["is_read"]
    if "is_archived" in data:
        update_data["is_archived"] = data["is_archived"]
    
    await db.contact_messages.update_one(
        {"_id": ObjectId(message_id), "church_slug": slug},
        {"$set": update_data}
    )
    return {"success": True}

@router.get("/church/{slug}/followers")
async def get_followers(slug: str):
    db = get_database()
    total_count = await db.followers.count_documents({"church_slug": slug})
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_growth = []
    
    for i in range(30):
        day = thirty_days_ago + timedelta(days=i)
        day_end = day + timedelta(days=1)
        count = await db.followers.count_documents({
            "church_slug": slug,
            "followed_at": {"$gte": day, "$lt": day_end}
        })
        daily_growth.append({"date": day.strftime("%Y-%m-%d"), "count": count})
    
    followers = []
    async for follower in db.followers.find({"church_slug": slug}).sort("followed_at", DESCENDING):
        followers.append({
            "id": str(follower["_id"]),
            "name": follower.get("user_name", "Anonymous"),
            "email": follower["user_email"],
            "joined_date": follower["followed_at"].isoformat(),
            "location": follower.get("location")
        })
    
    return {
        "total_count": total_count,
        "growth_chart": daily_growth,
        "followers": followers
    }

@router.get("/church/{slug}/posts")
async def get_posts(slug: str):
    db = get_database()
    posts = []
    
    async for post in db.church_posts.find({"church_slug": slug}).sort("created_at", DESCENDING):
        posts.append({
            "id": str(post["_id"]),
            "title": post["title"],
            "content": post["content"],
            "image_url": post.get("image_url"),
            "created_at": post["created_at"].isoformat(),
            "scheduled_for": post["scheduled_for"].isoformat() if post.get("scheduled_for") else None,
            "is_published": post["is_published"],
            "views": post["views"],
            "likes": post["likes"],
            "shares": post["shares"]
        })
    
    return {"posts": posts}

@router.post("/church/{slug}/posts")
async def create_post(slug: str, data: dict):
    db = get_database()
    post = {
        "church_slug": slug,
        "title": data["title"],
        "content": data["content"],
        "image_url": data.get("image_url"),
        "created_at": datetime.utcnow(),
        "scheduled_for": datetime.fromisoformat(data["scheduled_for"]) if data.get("scheduled_for") else None,
        "is_published": data.get("is_published", False),
        "views": 0,
        "likes": 0,
        "shares": 0
    }
    result = await db.church_posts.insert_one(post)
    return {"id": str(result.inserted_id)}

@router.get("/church/{slug}/space-rental")
async def get_space_rental(slug: str):
    db = get_database()
    settings = await db.church_settings.find_one({"church_slug": slug})
    
    if not settings:
        settings = {"space_rental_enabled": False}
    
    enquiries = []
    async for enq in db.space_rental_enquiries.find({"church_slug": slug}).sort("enquiry_date", DESCENDING):
        enquiries.append({
            "id": str(enq["_id"]),
            "name": enq["enquirer_name"],
            "email": enq["enquirer_email"],
            "phone": enq.get("enquirer_phone"),
            "event_type": enq["event_type"],
            "event_date": enq["event_date"].isoformat() if enq.get("event_date") else None,
            "guest_count": enq.get("guest_count"),
            "message": enq["message"],
            "enquiry_date": enq["enquiry_date"].isoformat(),
            "status": enq["status"]
        })
    
    return {
        "enabled": settings.get("space_rental_enabled", False),
        "details": settings.get("space_rental_details", {}),
        "enquiries": enquiries
    }

@router.patch("/church/{slug}/space-rental")
async def update_space_rental(slug: str, data: dict):
    db = get_database()
    await db.church_settings.update_one(
        {"church_slug": slug},
        {"$set": {
            "space_rental_enabled": data.get("enabled"),
            "space_rental_details": data.get("details")
        }},
        upsert=True
    )
    return {"success": True}

@router.get("/church/{slug}/analytics")
async def get_analytics(slug: str, days: int = 30):
    db = get_database()
    start_date = datetime.utcnow() - timedelta(days=days)
    
    daily_views = []
    for i in range(days):
        day = start_date + timedelta(days=i)
        day_end = day + timedelta(days=1)
        count = await db.page_views.count_documents({
            "church_slug": slug,
            "viewed_at": {"$gte": day, "$lt": day_end}
        })
        daily_views.append({"date": day.strftime("%Y-%m-%d"), "views": count})
    
    referrer_pipeline = [
        {"$match": {"church_slug": slug, "viewed_at": {"$gte": start_date}}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_referrers = [doc async for doc in db.page_views.aggregate(referrer_pipeline)]
    
    search_pipeline = [
        {"$match": {"church_slug": slug, "viewed_at": {"$gte": start_date}, "search_term": {"$ne": None}}},
        {"$group": {"_id": "$search_term", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_search_terms = [doc async for doc in db.page_views.aggregate(search_pipeline)]
    
    device_pipeline = [
        {"$match": {"church_slug": slug, "viewed_at": {"$gte": start_date}}},
        {"$group": {"_id": "$device_type", "count": {"$sum": 1}}}
    ]
    device_breakdown = [doc async for doc in db.page_views.aggregate(device_pipeline)]
    
    geo_pipeline = [
        {"$match": {"church_slug": slug, "viewed_at": {"$gte": start_date}, "city": {"$ne": None}}},
        {"$group": {"_id": {"city": "$city", "country": "$country"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_locations = [doc async for doc in db.page_views.aggregate(geo_pipeline)]
    
    return {
        "daily_views": daily_views,
        "top_referrers": [{"source": doc["_id"] or "Direct", "count": doc["count"]} for doc in top_referrers],
        "top_search_terms": [{"term": doc["_id"], "count": doc["count"]} for doc in top_search_terms],
        "device_breakdown": [{"device": doc["_id"], "count": doc["count"]} for doc in device_breakdown],
        "top_locations": [{"city": doc["_id"]["city"], "country": doc["_id"]["country"], "count": doc["count"]} for doc in top_locations]
    }

@router.get("/church/{slug}/settings")
async def get_settings(slug: str):
    db = get_database()
    settings = await db.church_settings.find_one({"church_slug": slug})
    
    if not settings:
        settings = {
            "church_slug": slug,
            "notification_email": True,
            "notification_sms": False,
            "is_pro": False
        }
    
    return settings

@router.patch("/church/{slug}/settings")
async def update_settings(slug: str, data: dict):
    db = get_database()
    await db.church_settings.update_one(
        {"church_slug": slug},
        {"$set": data},
        upsert=True
    )
    return {"success": True}

@router.post("/church/{slug}/track-view")
async def track_page_view(slug: str, data: dict):
    db = get_database()
    view = {
        "church_slug": slug,
        "viewed_at": datetime.utcnow(),
        "referrer": data.get("referrer"),
        "search_term": data.get("search_term"),
        "device_type": data.get("device_type", "unknown"),
        "ip_address": data.get("ip_address", ""),
        "country": data.get("country"),
        "city": data.get("city")
    }
    await db.page_views.insert_one(view)
    return {"success": True}