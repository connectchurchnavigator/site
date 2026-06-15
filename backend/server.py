from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from database import connect_db, close_db
from routers import churches, events, users, auth, analytics, reviews, followers, recommendations, followups, visitors
from services.scheduler_service import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    start_scheduler()
    yield
    stop_scheduler()
    await close_db()

app = FastAPI(title="ChurchNavigator API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(churches.router)
app.include_router(events.router)
app.include_router(analytics.router)
app.include_router(reviews.router)
app.include_router(followers.router)
app.include_router(recommendations.router)
app.include_router(followups.router)
app.include_router(visitors.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "2.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}