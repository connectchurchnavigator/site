from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import churches, worship_leaders, media_teams, events, small_groups
import os

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

app.include_router(churches.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(events.router)
app.include_router(small_groups.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
