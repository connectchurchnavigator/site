from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os

from database import connect_to_mongo, close_mongo_connection
from routes import churches, events, reviews, analytics, admin, search
from routes.sites import router as sites_router
from middleware.sites_middleware import sites_middleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(title="ChurchNavigator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def custom_sites_middleware(request: Request, call_next):
    return await sites_middleware(request, call_next)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(reviews.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(search.router)
app.include_router(sites_router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "active"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
