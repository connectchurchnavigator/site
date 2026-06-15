from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from routes import churches, events, homepage, church_sites
from database import close_mongo_connection

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(title="ChurchNavigator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(homepage.router)
app.include_router(church_sites.router)

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"status": "ok", "message": "ChurchNavigator API v2.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}