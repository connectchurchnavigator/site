from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date, time
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
import os
from dotenv import load_dotenv
import uuid
import re

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["DEV-ChurchNavigator"]
churches_collection = db["churches"]
events_collection = db["events"]

events_collection.create_index([("slug", ASCENDING)], unique=True)
events_collection.create_index([("start_date", ASCENDING)])
events_collection.create_index([("city", ASCENDING)])
events_collection.create_index([("event_type", ASCENDING)])
events_collection.create_index([("is_featured", DESCENDING)])
events_collection.create_index([("status", ASCENDING)])

class EventBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    cover_image: Optional[str] = None
    gallery_images: List[str] = []
    event_type: str = Field(..., regex="^(Conference|Concert|Prayer Night|Youth Event|Revival|Workshop|Sunday Service|Special Service|Outreach|Community Event)$")
    start_date: str
    end_date: Optional[str] = None
    start_time: str
    end_time: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = Field(None, regex="^(Weekly|Monthly|Annual)?$")
    venue_name: str = Field(..., min_length=2)
    address_line1: str
    city: str
    postcode: str
    country: str = "United Kingdom"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None
    organiser_name: str
    organiser_phone: Optional[str] = None
    organiser_email: Optional[str] = None
    church_id: Optional[str] = None
    tickets_required: bool = False
    ticket_url: Optional[str] = None
    ticket_price: str = "Free"
    is_online: bool = False
    online_link: Optional[str] = None
    is_featured: bool = False
    is_verified: bool = False
    tags: List[str] = []
    status: str = "draft"

    @validator('start_time', 'end_time')
    def validate_time_format(cls, v):
        if v and not re.match(r'^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$', v, re.IGNORECASE):
            raise ValueError('Time must be in format: HH:MM AM/PM')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v not in ['draft', 'published', 'cancelled']:
            raise ValueError('Status must be draft, published, or cancelled')
        return v

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    event_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    venue_name: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None
    organiser_name: Optional[str] = None
    organiser_phone: Optional[str] = None
    organiser_email: Optional[str] = None
    church_id: Optional[str] = None
    tickets_required: Optional[bool] = None
    ticket_url: Optional[str] = None
    ticket_price: Optional[str] = None
    is_online: Optional[bool] = None
    online_link: Optional[str] = None
    is_featured: Optional[bool] = None
    is_verified: Optional[bool] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class EventResponse(EventBase):
    id: str
    slug: str
    created_at: datetime
    updated_at: datetime
    owner_id: Optional[str] = None
    trashed_at: Optional[datetime] = None

def create_slug(title: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    base_slug = slug
    counter = 1
    while events_collection.find_one({"slug": slug, "trashed_at": None}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

def event_to_response(event: dict) -> dict:
    event["id"] = event["_id"]
    del event["_id"]
    return event

@app.get("/")
def root():
    return {"message": "ChurchNavigator API", "status": "active"}

@app.get("/api/events")
def get_events(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    city: Optional[str] = None,
    event_type: Optional[str] = None,
    status: str = "published"
):
    query = {"trashed_at": None, "status": status}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if event_type:
        query["event_type"] = event_type
    
    total = events_collection.count_documents(query)
    
    events = list(events_collection.find(query).sort("start_date", ASCENDING).skip(offset).limit(limit))
    
    return {
        "events": [event_to_response(e) for e in events],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/events/featured")
def get_featured_events(limit: int = Query(6, ge=1, le=20)):
    query = {
        "trashed_at": None,
        "status": "published",
        "is_featured": True
    }
    
    events = list(events_collection.find(query).sort("start_date", ASCENDING).limit(limit))
    
    return {
        "events": [event_to_response(e) for e in events]
    }

@app.get("/api/events/search")
def search_events(
    q: Optional[str] = None,
    city: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    event_type: Optional[str] = None,
    is_online: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query = {"trashed_at": None, "status": "published"}
    
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if date_from:
        query["start_date"] = {"$gte": date_from}
    
    if date_to:
        if "start_date" in query:
            query["start_date"]["$lte"] = date_to
        else:
            query["start_date"] = {"$lte": date_to}
    
    if event_type:
        query["event_type"] = event_type
    
    if is_online is not None:
        query["is_online"] = is_online
    
    total = events_collection.count_documents(query)
    events = list(events_collection.find(query).sort("start_date", ASCENDING).skip(offset).limit(limit))
    
    return {
        "events": [event_to_response(e) for e in events],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/events/{slug}")
def get_event(slug: str):
    event = events_collection.find_one({"slug": slug, "trashed_at": None})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_to_response(event)

@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate):
    event_dict = event.dict()
    event_dict["_id"] = str(uuid.uuid4())
    event_dict["slug"] = create_slug(event.title)
    event_dict["created_at"] = datetime.utcnow()
    event_dict["updated_at"] = datetime.utcnow()
    event_dict["owner_id"] = "system"
    event_dict["trashed_at"] = None
    
    if event.church_id:
        church = churches_collection.find_one({"_id": event.church_id, "trashed_at": None})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
    
    try:
        events_collection.insert_one(event_dict)
        return event_to_response(event_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/events/{slug}")
def update_event(slug: str, event_update: EventUpdate):
    existing_event = events_collection.find_one({"slug": slug, "trashed_at": None})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in event_update.dict(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    if "title" in update_data and update_data["title"] != existing_event["title"]:
        update_data["slug"] = create_slug(update_data["title"])
    
    if "church_id" in update_data and update_data["church_id"]:
        church = churches_collection.find_one({"_id": update_data["church_id"], "trashed_at": None})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
    
    update_data["updated_at"] = datetime.utcnow()
    
    try:
        events_collection.update_one(
            {"slug": slug},
            {"$set": update_data}
        )
        updated_event = events_collection.find_one({"slug": update_data.get("slug", slug)})
        return event_to_response(updated_event)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/churches")
def get_churches(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    city: Optional[str] = None,
    status: str = "published"
):
    query = {"trashed_at": None, "status": status}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    total = churches_collection.count_documents(query)
    churches = list(churches_collection.find(query).skip(offset).limit(limit))
    
    for church in churches:
        church["id"] = church["_id"]
        del church["_id"]
    
    return {
        "churches": churches,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/churches/{slug}")
def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug, "trashed_at": None})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["id"] = church["_id"]
    del church["_id"]
    return church