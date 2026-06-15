from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from contextlib import asynccontextmanager

from routers import churches, auth, social

MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(MONGODB_URL)
    app.mongodb = app.mongodb_client[DB_NAME]
    
    await app.mongodb.churches.create_index("slug", unique=True)
    await app.mongodb.churches.create_index("location")
    await app.mongodb.social_posts.create_index([("church_id", 1), ("platform", 1), ("posted_at", -1)])
    
    yield
    
    app.mongodb_client.close()

app = FastAPI(title="Church Navigator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(auth.router)
app.include_router(social.router)

@app.get("/")
async def root():
    return {"message": "Church Navigator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}