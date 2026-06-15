from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

from routers import churches, events, reviews, worship_leaders, media_team, visitors, ai_tools

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "https://dev.churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    app.mongodb = app.mongodb_client[os.getenv("DB_NAME", "DEV-ChurchNavigator")]

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(reviews.router)
app.include_router(worship_leaders.router)
app.include_router(media_team.router)
app.include_router(visitors.router)
app.include_router(ai_tools.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "online"}

@app.get("/health")
async def health():
    return {"status": "healthy"}