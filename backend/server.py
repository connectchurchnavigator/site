from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import churches, events, users, auth, reviews, followers, analytics, recommendations, visitors
from scheduler.weekly_digest_job import start_scheduler, stop_scheduler

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(events.router)
app.include_router(users.router)
app.include_router(reviews.router)
app.include_router(followers.router)
app.include_router(analytics.router)
app.include_router(recommendations.router)
app.include_router(visitors.router)

@app.on_event("startup")
async def startup_event():
    start_scheduler()
    print("ChurchNavigator API started with AI automation scheduler")

@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()
    print("ChurchNavigator API shutdown")

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API with AI Automation", "version": "2.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
