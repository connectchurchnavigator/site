from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import connect_db, close_db
from app.routers import churches, auth, dashboard, search, events, worship_leaders, media_teams, planner, planner_ai
from app.jobs.planner_jobs import start_planner_jobs
import os

app = FastAPI(title="ChurchNavigator API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com", "https://*.railway.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()
    if os.getenv("ENABLE_SCHEDULER", "true").lower() == "true":
        start_planner_jobs()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(events.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(planner.router)
app.include_router(planner_ai.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API v2.0", "status": "active"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc)}
    )