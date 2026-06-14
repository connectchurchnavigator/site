from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from database import connect_to_mongo, close_mongo_connection
from routers import churches, worship_leaders, media_team, events, small_groups
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="ChurchNavigator API",
    description="API for UK's leading church directory",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

app.include_router(churches.router, prefix="/api", tags=["churches"])
app.include_router(worship_leaders.router, prefix="/api", tags=["worship-leaders"])
app.include_router(media_team.router, prefix="/api", tags=["media-team"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(small_groups.router, prefix="/api", tags=["small-groups"])

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}