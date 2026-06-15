from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from bson import ObjectId

from .database import get_database
from .routes import (
    auth,
    churches,
    users,
    reviews,
    analytics,
    media,
    events,
    planner,
    planner_ai,
    admin
)

scheduler = AsyncIOScheduler()

async def send_pre_visit_briefings():
    from .routes.planner_ai import get_pre_visit_briefing
    from .email_service import send_email
    
    db = get_database()
    now = datetime.utcnow()
    target_time = now + timedelta(hours=48)
    
    visits = db.planner_visits.find({
        "scheduled_datetime": {
            "$gte": target_time,
            "$lte": target_time + timedelta(hours=1)
        },
        "status": "confirmed",
        "briefing_sent": {"$ne": True}
    })
    
    for visit in visits:
        try:
            trip = db.planner_trips.find_one({"_id": ObjectId(visit["trip_id"])})
            if not trip:
                continue
            
            user = db.users.find_one({"_id": ObjectId(trip["user_id"])})
            if not user:
                continue
            
            briefing = await get_pre_visit_briefing(str(visit["_id"]), user)
            church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
            
            email_body = f"""Dear {user.get('first_name', 'Minister')},

Your visit to {church['name']} is in 48 hours. Here's your AI-generated briefing:

CONGREGATION SNAPSHOT:
{briefing.congregation_snapshot}

WHAT RESONATES:
{briefing.what_resonates}

WHAT TO AVOID:
{briefing.what_to_avoid}

KEY PEOPLE:
{briefing.key_people}

PRACTICAL NOTES:
{briefing.practical_notes}

RELATIONSHIP OPPORTUNITY:
{briefing.relationship_opportunity}

Blessings,
ChurchNavigator Planner AI
"""
            
            await send_email(
                to=user["email"],
                subject=f"Pre-Visit Briefing: {church['name']}",
                body=email_body
            )
            
            db.planner_visits.update_one(
                {"_id": visit["_id"]},
                {"$set": {"briefing_sent": True}}
            )
        except Exception as e:
            print(f"Briefing send error for visit {visit['_id']}: {e}")

async def send_post_visit_debriefs():
    from .routes.planner_ai import get_post_visit_debrief
    from .email_service import send_email
    
    db = get_database()
    now = datetime.utcnow()
    target_time = now - timedelta(hours=4)
    
    visits = db.planner_visits.find({
        "scheduled_datetime": {
            "$lte": target_time,
            "$gte": target_time - timedelta(hours=1)
        },
        "status": "confirmed",
        "debrief_sent": {"$ne": True}
    })
    
    for visit in visits:
        try:
            trip = db.planner_trips.find_one({"_id": ObjectId(visit["trip_id"])})
            if not trip:
                continue
            
            user = db.users.find_one({"_id": ObjectId(trip["user_id"])})
            if not user:
                continue
            
            debrief = await get_post_visit_debrief(str(visit["_id"]), user)
            church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
            
            email_body = f"""Dear {user.get('first_name', 'Minister')},

Your visit to {church['name']} is complete. Here's your AI-generated debrief:

SUMMARY:
{debrief.visit_summary}

KEY MOMENTS:
{chr(10).join('- ' + m for m in debrief.key_moments)}

FOLLOW-UP ACTIONS:
{chr(10).join(f"- {a['action']} (by {a['deadline']})" for a in debrief.follow_up_actions)}

PARTNERSHIP POTENTIAL:
{debrief.partnership_potential}

NOTES FOR NEXT TIME:
{debrief.notes_for_next_visit}

Blessings,
ChurchNavigator Planner AI
"""
            
            await send_email(
                to=user["email"],
                subject=f"Post-Visit Debrief: {church['name']}",
                body=email_body
            )
            
            db.planner_visits.update_one(
                {"_id": visit["_id"]},
                {"$set": {"debrief_sent": True}}
            )
        except Exception as e:
            print(f"Debrief send error for visit {visit['_id']}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        send_pre_visit_briefings,
        CronTrigger(hour="*/1"),
        id="pre_visit_briefings",
        replace_existing=True
    )
    
    scheduler.add_job(
        send_post_visit_debriefs,
        CronTrigger(hour="*/1"),
        id="post_visit_debriefs",
        replace_existing=True
    )
    
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(
    title="ChurchNavigator API",
    description="Backend for ChurchNavigator.com",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://churchnavigator.com",
        "https://www.churchnavigator.com",
        "https://dev.churchnavigator.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(users.router)
app.include_router(reviews.router)
app.include_router(analytics.router)
app.include_router(media.router)
app.include_router(events.router)
app.include_router(planner.router)
app.include_router(planner_ai.router)
app.include_router(admin.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "2.0.0", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}