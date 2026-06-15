from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from database import init_db, close_db
from routers import churches, auth, worship_leaders, media_teams, events, small_groups

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(title="ChurchNavigator API", version="1.0.0", lifespan=lifespan)

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
    "https://dev.churchnavigator.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, prefix="/api", tags=["churches"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(worship_leaders.router, prefix="/api", tags=["worship_leaders"])
app.include_router(media_teams.router, prefix="/api", tags=["media_teams"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(small_groups.router, prefix="/api", tags=["small_groups"])

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred", "error": str(exc)},
    )

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
