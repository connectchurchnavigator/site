from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import churches, pastors, worship_leaders, media_teams, events, bible_colleges, auth, users, admin

app = FastAPI(title="ChurchNavigator API")

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(churches.router)
app.include_router(pastors.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(events.router)
app.include_router(bible_colleges.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
