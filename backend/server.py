from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ChurchNavigator API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("DEV-ChurchNavigator" if os.getenv("ENV") == "dev" else "ChurchNavigator")

from routers import search

app.include_router(search.router)

@app.on_event("startup")
async def startup_event():
    await db.listings.create_index([("name", "text"), ("description", "text"), ("city", "text"), ("denomination", "text")])
    await db.listings.create_index([("moderation_status", 1), ("listing_type", 1)])
    await db.listings.create_index([("location", "2dsphere")])
    print("✅ MongoDB indexes created")

@app.get("/")
def root():
    return {"message": "ChurchNavigator API v2.0 - MongoDB Atlas Search", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "healthy", "database": "connected"}
