from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import churches, events, worship_leaders, media_teams, flyer_generator

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(flyer_generator.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
