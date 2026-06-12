from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from .routers import churches, auth, worship_leaders, media_teams, events, planner

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://churchnavigator.com",
        "https://dev.churchnavigator.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(auth.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(events.router)
app.include_router(planner.router)

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}