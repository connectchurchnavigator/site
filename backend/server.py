from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os
from dotenv import load_dotenv

load_dotenv()

from routers import (
    churches,
    pastors,
    worship_leaders,
    media_teams,
    events,
    bible_colleges,
    planner,
    tools,
    search_service,
    ai_chat,
    visitor_tracking,
    onboarding,
)
from services.email_service import send_event_reminders
from services.visitor_service import detect_churned_visitors

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client[os.getenv("DATABASE_NAME", "ChurchNavigator")]
    
    scheduler.add_job(send_event_reminders, 'cron', hour=9, minute=0, args=[app.mongodb])
    scheduler.add_job(detect_churned_visitors, 'cron', day_of_week='sun', hour=0, minute=0, args=[app.mongodb])
    scheduler.start()
    
    yield
    
    scheduler.shutdown()
    app.mongodb_client.close()

app = FastAPI(
    title="ChurchNavigator API",
    description="UK's leading church directory platform",
    version="2.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
]

if os.getenv("ENVIRONMENT") == "development":
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, prefix="/api/churches", tags=["Churches"])
app.include_router(pastors.router, prefix="/api/pastors", tags=["Pastors"])
app.include_router(worship_leaders.router, prefix="/api/worship-leaders", tags=["Worship Leaders"])
app.include_router(media_teams.router, prefix="/api/media-teams", tags=["Media Teams"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(bible_colleges.router, prefix="/api/bible-colleges", tags=["Bible Colleges"])
app.include_router(planner.router, prefix="/api/planner", tags=["Planner"])
app.include_router(tools.router, prefix="/api/tools", tags=["Tools"])
app.include_router(search_service.router, prefix="/api/search", tags=["Search"])
app.include_router(ai_chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(visitor_tracking.router, prefix="/api/visitors", tags=["Visitor Tracking"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": os.getenv("ENVIRONMENT", "production")}

@app.get("/")
async def root():
    return {
        "message": "ChurchNavigator API v2.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )