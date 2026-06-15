from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import churches, events, pastors, homepage
from .database import connect_to_mongo, close_mongo_connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ChurchNavigator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "https://dev.churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(pastors.router, prefix="/api")
app.include_router(homepage.router, prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()
    logger.info("Closed MongoDB connection")

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API v2.0", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}