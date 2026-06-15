from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

from app.routers import churches, events, worship_leaders, media_teams, flyer_generator

app = FastAPI(title="ChurchNavigator API")

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

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(worship_leaders.router)
app.include_router(media_teams.router)
app.include_router(flyer_generator.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)