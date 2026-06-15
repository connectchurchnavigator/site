from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import churches, events, pastors, homepage
from app.database import connect_to_mongo, close_mongo_connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    logger.info("Disconnected from MongoDB")

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(pastors.router)
app.include_router(homepage.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}