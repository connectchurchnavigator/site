from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from routers import churches, search, follows, events, media_team, worship_leaders, visitors, whatsapp
from database import get_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client[os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")]
    yield
    app.mongodb_client.close()

app = FastAPI(title="ChurchNavigator API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(search.router)
app.include_router(follows.router)
app.include_router(events.router)
app.include_router(media_team.router)
app.include_router(worship_leaders.router)
app.include_router(visitors.router)
app.include_router(whatsapp.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API v2.0", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
