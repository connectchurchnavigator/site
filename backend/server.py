from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}