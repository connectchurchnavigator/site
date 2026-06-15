from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import churches, search, social
import os

app = FastAPI(title="ChurchNavigator API")

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

app.include_router(churches.router)
app.include_router(search.router)
app.include_router(social.router)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}