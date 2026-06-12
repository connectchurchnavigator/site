from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from .routers import listings, search, auth, worship_leaders, media_team, events, tools
from .database import connect_db, close_db

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://churchnavigator.com",
        "https://dev.churchnavigator.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.include_router(listings.router)
app.include_router(search.router)
app.include_router(auth.router)
app.include_router(worship_leaders.router)
app.include_router(media_team.router)
app.include_router(events.router)
app.include_router(tools.router)

@app.get("/")
async def root():
    return {"status": "ChurchNavigator API running"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )
