from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import churches, auth, gallery, videos
from app.database import connect_to_mongo, close_mongo_connection
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(gallery.router)
app.include_router(videos.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}