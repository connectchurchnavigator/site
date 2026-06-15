from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import churches, reviews, search
import os

app = FastAPI(title="ChurchNavigator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router, prefix="/api", tags=["churches"])
app.include_router(reviews.router, prefix="/api", tags=["reviews"])
app.include_router(search.router, prefix="/api", tags=["search"])

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API v2.0.0", "status": "active"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
