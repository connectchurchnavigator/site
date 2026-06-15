from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import churches, events, pastors, search
from .database import db

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(pastors.router)
app.include_router(search.router)

@app.on_event("startup")
async def startup_event():
    try:
        db.churches.create_index([("name", "text"), ("description", "text"), ("city", "text"), ("denomination", "text")])
        db.events.create_index([("name", "text"), ("description", "text"), ("city", "text")])
        db.pastors.create_index([("name", "text"), ("bio", "text"), ("city", "text"), ("denomination", "text")])
        db.worship_leaders.create_index([("name", "text"), ("bio", "text"), ("city", "text")])
        db.media_teams.create_index([("name", "text"), ("description", "text"), ("city", "text")])
        db.bible_colleges.create_index([("name", "text"), ("description", "text"), ("city", "text"), ("denomination", "text")])
        print("MongoDB text indexes created successfully")
    except Exception as e:
        print(f"Index creation error (may already exist): {e}")

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "online"}
