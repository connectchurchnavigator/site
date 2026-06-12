from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, GEOSPHERE
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
import os
from dotenv import load_dotenv
from search_service import SearchService

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB', 'DEV-ChurchNavigator')]

db.churches.create_index([('location', GEOSPHERE)])
db.events.create_index([('location', GEOSPHERE)])
db.worship_leaders.create_index([('location', GEOSPHERE)])
db.media_teams.create_index([('location', GEOSPHERE)])

search_service = SearchService(db)

class AISearchRequest(BaseModel):
    query: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class ChatbotRequest(BaseModel):
    message: str
    conversation_history: List[Dict] = []
    lat: Optional[float] = None
    lng: Optional[float] = None

@app.get("/")
def read_root():
    return {"status": "ChurchNavigator API", "version": "2.0"}

@app.get("/api/search")
async def universal_search(
    q: str = Query(..., description="Search query"),
    type: Optional[str] = Query(None, description="churches/events/worship_leaders/media_teams/bible_colleges"),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = Query(30, description="Search radius in miles"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {'type': type, 'lat': lat, 'lng': lng, 'radius': radius}
    return await search_service.universal_search(q, filters, page, limit)

@app.get("/api/search/churches")
async def search_churches(
    denomination: Optional[str] = None,
    worship_style: Optional[str] = None,
    language: Optional[str] = None,
    day: Optional[str] = None,
    time_of_day: Optional[str] = Query(None, description="morning/afternoon/evening"),
    ministry: Optional[str] = None,
    facility: Optional[str] = None,
    verified: Optional[bool] = None,
    online: Optional[bool] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = Query(30, description="Search radius in miles"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {
        'denomination': denomination,
        'worship_style': worship_style,
        'language': language,
        'day': day,
        'time_of_day': time_of_day,
        'ministry': ministry,
        'facility': facility,
        'verified': verified,
        'online': online,
        'lat': lat,
        'lng': lng,
        'radius': radius
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    return await search_service.search_churches(filters, page, limit)

@app.get("/api/search/events")
async def search_events(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    event_type: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    price: Optional[str] = Query(None, description="free/paid"),
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    online: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {
        'date_from': date_from,
        'date_to': date_to,
        'event_type': event_type,
        'city': city,
        'lat': lat,
        'lng': lng,
        'price': price,
        'language': language,
        'age_group': age_group,
        'online': online
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    return await search_service.search_events(filters, page, limit)

@app.get("/api/search/worship-leaders")
async def search_worship_leaders(
    instrument: Optional[str] = None,
    worship_style: Optional[str] = None,
    language: Optional[str] = None,
    denomination: Optional[str] = None,
    availability: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {
        'instrument': instrument,
        'worship_style': worship_style,
        'language': language,
        'denomination': denomination,
        'availability': availability,
        'city': city,
        'lat': lat,
        'lng': lng
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    return await search_service.search_worship_leaders(filters, page, limit)

@app.get("/api/search/media-teams")
async def search_media_teams(
    service: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    team_size: Optional[str] = Query(None, description="small/medium/large"),
    verified: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {
        'service': service,
        'city': city,
        'lat': lat,
        'lng': lng,
        'team_size': team_size,
        'verified': verified
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    return await search_service.search_media_teams(filters, page, limit)

@app.get("/api/search/bible-colleges")
async def search_bible_colleges(
    country: Optional[str] = None,
    level: Optional[str] = None,
    mode: Optional[str] = None,
    denomination: Optional[str] = None,
    language: Optional[str] = None,
    accredited: Optional[bool] = None,
    scholarship: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    filters = {
        'country': country,
        'level': level,
        'mode': mode,
        'denomination': denomination,
        'language': language,
        'accredited': accredited,
        'scholarship': scholarship
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    return await search_service.search_bible_colleges(filters, page, limit)

@app.post("/api/search/ai")
async def ai_search(request: AISearchRequest):
    return await search_service.ai_search(request.query, request.lat, request.lng)

@app.post("/api/search/chatbot")
async def chatbot_search(request: ChatbotRequest):
    return await search_service.chatbot_search(
        request.message,
        request.conversation_history,
        request.lat,
        request.lng
    )

@app.get("/api/churches/{church_id}")
def get_church(church_id: str):
    from bson import ObjectId
    church = db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["_id"] = str(church["_id"])
    return church

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)