from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import churches, search, admin, planner
import os

app = FastAPI(title="ChurchNavigator API")

origins = [
    "http://localhost:3000",
    "https://churchnavigator.com",
    "https://www.churchnavigator.com",
    "https://dev.churchnavigator.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(search.router)
app.include_router(admin.router)
app.include_router(planner.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}