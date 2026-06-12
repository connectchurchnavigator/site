from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import listings, auth, analytics, events, media, tools
from database import connect_db, close_db
import os

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://churchnavigator.com",
        "https://www.churchnavigator.com"
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

app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(analytics.router)
app.include_router(events.router)
app.include_router(media.router)
app.include_router(tools.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
