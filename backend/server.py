from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from auth import router as auth_router
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "dev-secret"))

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

@app.on_event("startup")
def startup_db_client():
    app.mongodb_client = MongoClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client[os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")]
    print(f"Connected to MongoDB: {os.getenv('MONGODB_DB_NAME')}")

@app.on_event("shutdown")
def shutdown_db_client():
    app.mongodb_client.close()

app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}