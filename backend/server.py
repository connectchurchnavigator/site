from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from database import connect_to_mongo, close_mongo_connection
from routers import churches, worship_leaders, media_teams, events, small_groups

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title="ChurchNavigator API", version="1.0.0", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
    "https://dev.churchnavigator.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(events.router)
app.include_router(small_groups.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
