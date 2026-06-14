from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import churches, events, pastors, media_teams, worship_leaders, chat
import os

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://churchnavigator.com",
        "https://www.churchnavigator.com",
        "https://dev.churchnavigator.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, tags=["churches"])
app.include_router(events.router, tags=["events"])
app.include_router(pastors.router, tags=["pastors"])
app.include_router(media_teams.router, tags=["media_teams"])
app.include_router(worship_leaders.router, tags=["worship_leaders"])
app.include_router(chat.router, tags=["chat"])

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}