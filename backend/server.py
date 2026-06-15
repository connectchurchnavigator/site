from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import asyncio

from .routers import (
    churches,
    search,
    auth,
    reviews,
    events,
    analytics,
    admin,
    media,
    worship_leaders,
    media_teams,
    planner,
    planner_ai
)
from .database import db
from bson import ObjectId

scheduler = AsyncIOScheduler()

async def send_pre_visit_briefings():
    from .routers.planner_ai import generate_pre_visit_briefing
    try:
        cutoff_start = datetime.utcnow() + timedelta(hours=46)
        cutoff_end = datetime.utcnow() + timedelta(hours=50)
        
        visits = db.planner_visits.find({
            "status": "confirmed",
            "scheduled_datetime": {"$gte": cutoff_start, "$lte": cutoff_end},
            "briefing_sent": {"$ne": True}
        })
        
        for visit in visits:
            try:
                briefing = await generate_pre_visit_briefing(str(visit["_id"]))
                
                minister = db.users.find_one({"_id": ObjectId(visit["minister_id"])})
                church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
                
                if minister and minister.get("email"):
                    pass
                
                db.planner_visits.update_one(
                    {"_id": visit["_id"]},
                    {"$set": {"briefing_sent": True, "briefing_sent_at": datetime.utcnow()}}
                )
            except Exception as e:
                print(f"Failed to send briefing for visit {visit['_id']}: {e}")
                
    except Exception as e:
        print(f"Pre-visit briefing job failed: {e}")

async def send_post_visit_debriefs():
    from .routers.planner_ai import generate_post_visit_debrief
    try:
        cutoff = datetime.utcnow() - timedelta(hours=4)
        
        visits = db.planner_visits.find({
            "status": "confirmed",
            "scheduled_datetime": {"$lte": cutoff},
            "debrief_sent": {"$ne": True}
        })
        
        for visit in visits:
            try:
                scheduled = visit.get("scheduled_datetime")
                duration = visit.get("duration_hours", 2)
                visit_end = scheduled + timedelta(hours=duration)
                
                if datetime.utcnow() >= visit_end + timedelta(hours=4):
                    debrief = await generate_post_visit_debrief(str(visit["_id"]))
                    
                    db.planner_visits.update_one(
                        {"_id": visit["_id"]},
                        {"$set": {"debrief_sent": True, "debrief_sent_at": datetime.utcnow()}}
                    )
            except Exception as e:
                print(f"Failed to send debrief for visit {visit['_id']}: {e}")
                
    except Exception as e:
        print(f"Post-visit debrief job failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(send_pre_visit_briefings, CronTrigger(hour=8, minute=0), id="pre_visit_briefings")
    scheduler.add_job(send_post_visit_debriefs, CronTrigger(hour="*/4"), id="post_visit_debriefs")
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="ChurchNavigator API", version="2.0", lifespan=lifespan)

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)
    app.add_middleware(SentryAsgiMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "https://www.churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(search.router)
app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(events.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(media.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(planner.router)
app.include_router(planner_ai.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API v2.0", "status": "operational"}

@app.get("/health")
async def health():
    try:
        db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )
