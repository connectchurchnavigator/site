from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
import logging

from app.routers import churches, social
from app.database import connect_to_mongo, close_mongo_connection
from app.background_jobs import run_background_jobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Church Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(social.router)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    if os.getenv("ENABLE_BACKGROUND_JOBS", "true").lower() == "true":
        asyncio.create_task(run_background_jobs())
        logger.info("Background jobs started")

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Church Navigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}