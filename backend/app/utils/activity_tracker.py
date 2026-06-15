from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional

async def track_activity(
    db: AsyncIOMotorDatabase,
    activity_type: str,
    title: str,
    subtitle: str,
    icon: str,
    color: str,
    link: Optional[str] = None
):
    """Track activity for homepage feed."""
    await db.homepage_activity.insert_one({
        "type": activity_type,
        "title": title,
        "subtitle": subtitle,
        "icon": icon,
        "color": color,
        "link": link,
        "created_at": datetime.utcnow()
    })

async def track_new_church(db: AsyncIOMotorDatabase, church_name: str, denomination: str, city: str, church_id: str):
    await track_activity(
        db,
        "new_church",
        f"{church_name} joined ChurchNavigator",
        f"{denomination} - {city}",
        "church",
        "#8B5CF6",
        f"/churches/{church_id}"
    )

async def track_new_event(db: AsyncIOMotorDatabase, event_name: str, venue: str, spots: int, event_id: str):
    await track_activity(
        db,
        "new_event",
        f"{event_name} is now open",
        f"Free - {venue} - {spots} spots",
        "calendar",
        "#06B6D4",
        f"/events/{event_id}"
    )

async def track_new_pastor(db: AsyncIOMotorDatabase, pastor_name: str, title: str, denomination: str, location: str, pastor_id: str):
    await track_activity(
        db,
        "new_pastor",
        f"{title} {pastor_name} joined ChurchNavigator",
        f"{title} - {denomination} - {location}",
        "person",
        "#3B82F6",
        f"/pastors/{pastor_id}"
    )

async def track_new_review(db: AsyncIOMotorDatabase, church_name: str, rating: int, reviewer_name: str, quote: str, church_id: str):
    stars = "★" * rating
    await track_activity(
        db,
        "new_review",
        f"{stars} review for {church_name}",
        f"{reviewer_name}: \"{quote[:50]}...\"",
        "star",
        "#F59E0B",
        f"/churches/{church_id}#reviews"
    )

async def track_registration_milestone(db: AsyncIOMotorDatabase, count: int, event_count: int, cities: str):
    await track_activity(
        db,
        "new_registration",
        f"{count} people registered for events this weekend",
        f"Across {event_count} events in {cities}",
        "users",
        "#10B981",
        "/events"
    )

async def track_checkin_aggregate(db: AsyncIOMotorDatabase, count: int, church_count: int):
    await track_activity(
        db,
        "new_visitor_checkin",
        f"{count} people checked in to services today",
        f"Across {church_count} churches using QR check-in",
        "qrcode",
        "#14B8A6",
        None
    )

async def track_church_milestone(db: AsyncIOMotorDatabase, church_name: str, milestone: int, church_id: str):
    await track_activity(
        db,
        "church_milestone",
        f"{church_name} reached {milestone:,} followers",
        f"Congratulations to the {church_name} family!",
        "trophy",
        "#EAB308",
        f"/churches/{church_id}"
    )

async def track_planner_trip(db: AsyncIOMotorDatabase, days: int, church_count: int, cities: str):
    await track_activity(
        db,
        "new_planner_trip",
        f"A minister planned a {days}-day UK trip",
        f"Visiting {church_count} churches across {cities}",
        "map",
        "#A855F7",
        "/planner"
    )