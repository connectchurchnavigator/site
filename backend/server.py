from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth
import os

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "online"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
