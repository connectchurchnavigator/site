from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import churches, events, pastors, worship_leaders, media_teams, reviews, homepage
from app.database import connect_to_mongo, close_mongo_connection
import os

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

app.include_router(churches.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(pastors.router, prefix="/api")
app.include_router(worship_leaders.router, prefix="/api")
app.include_router(media_teams.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(homepage.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))