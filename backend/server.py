from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

from routes import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client[os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")]
    yield
    app.mongodb_client.close()

app = FastAPI(title="ChurchNavigator API", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("JWT_SECRET_KEY", "dev-secret-key-min-32-characters")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}