from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

from .routers import churches, auth, analytics, visitors, events, reviews, followers, communications, premium_tools
from .database import db

app = FastAPI(title="ChurchNavigator API", version="2.0.0")

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

app.include_router(auth.router)
app.include_router(churches.router)
app.include_router(analytics.router)
app.include_router(visitors.router)
app.include_router(events.router)
app.include_router(reviews.router)
app.include_router(followers.router)
app.include_router(communications.router)
app.include_router(premium_tools.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API v2.0", "status": "operational"}

@app.get("/health")
async def health():
    try:
        db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)