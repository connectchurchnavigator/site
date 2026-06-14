from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
import os
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field
import re

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://username:password@cluster.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

class Address(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    town: Optional[str] = None
    county: Optional[str] = None
    postcode: Optional[str] = None
    country: str = "United Kingdom"

class ServiceTime(BaseModel):
    day: str
    time: str
    service_type: Optional[str] = None

class Church(BaseModel):
    name: str
    denomination: Optional[str] = None
    address: Address
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    pastor_name: Optional[str] = None
    service_times: Optional[List[ServiceTime]] = []
    image_url: Optional[str] = None
    is_featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Event(BaseModel):
    title: str
    description: Optional[str] = None
    church_id: Optional[str] = None
    church_name: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    registration_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc and isinstance(doc["updated_at"], datetime):
        doc["updated_at"] = doc["updated_at"].isoformat()
    if "start_date" in doc and isinstance(doc["start_date"], datetime):
        doc["start_date"] = doc["start_date"].isoformat()
    if "end_date" in doc and isinstance(doc["end_date"], datetime):
        doc["end_date"] = doc["end_date"].isoformat()
    return doc

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "2.0", "status": "active"}

@app.get("/api/churches")
async def get_churches(
    search: Optional[str] = None,
    denomination: Optional[str] = None,
    city: Optional[str] = None,
    county: Optional[str] = None,
    postcode: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = Query(20, le=100),
    skip: int = 0
):
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"address.city": {"$regex": search, "$options": "i"}},
            {"address.town": {"$regex": search, "$options": "i"}}
        ]
    
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    if city:
        query["address.city"] = {"$regex": city, "$options": "i"}
    
    if county:
        query["address.county"] = {"$regex": county, "$options": "i"}
    
    if postcode:
        query["address.postcode"] = {"$regex": postcode.replace(" ", ""), "$options": "i"}
    
    if featured is not None:
        query["is_featured"] = featured
    
    total = db.churches.count_documents(query)
    churches = list(db.churches.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit))
    
    return {
        "churches": [serialize_doc(c) for c in churches],
        "total": total,
        "limit": limit,
        "skip": skip
    }

@app.get("/api/churches/{identifier}")
async def get_church(identifier: str):
    if ObjectId.is_valid(identifier):
        church = db.churches.find_one({"_id": ObjectId(identifier)})
    else:
        church = db.churches.find_one({"slug": identifier})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    return serialize_doc(church)

@app.post("/api/churches")
async def create_church(church: Church):
    church_dict = church.dict()
    church_dict["slug"] = re.sub(r'[^a-z0-9]+', '-', church.name.lower()).strip('-')
    
    existing = db.churches.find_one({"slug": church_dict["slug"]})
    if existing:
        counter = 1
        while db.churches.find_one({"slug": f"{church_dict['slug']}-{counter}"}):
            counter += 1
        church_dict["slug"] = f"{church_dict['slug']}-{counter}"
    
    result = db.churches.insert_one(church_dict)
    church_dict["_id"] = str(result.inserted_id)
    return serialize_doc(church_dict)

@app.get("/api/events")
async def get_events(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    church_id: Optional[str] = None,
    limit: int = Query(20, le=100),
    skip: int = 0
):
    query = {}
    
    if date_from or date_to:
        query["start_date"] = {}
        if date_from:
            query["start_date"]["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        if date_to:
            query["start_date"]["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
    
    if church_id:
        query["church_id"] = church_id
    
    total = db.events.count_documents(query)
    events = list(db.events.find(query).sort("start_date", ASCENDING).skip(skip).limit(limit))
    
    return {
        "events": [serialize_doc(e) for e in events],
        "total": total,
        "limit": limit,
        "skip": skip
    }

@app.get("/api/events/weekend")
async def get_weekend_events(limit: int = Query(4, le=20)):
    now = datetime.utcnow()
    days_until_saturday = (5 - now.weekday()) % 7
    if days_until_saturday == 0 and now.weekday() == 5:
        this_saturday = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        this_saturday = (now + timedelta(days=days_until_saturday)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    next_sunday = this_saturday + timedelta(days=1, hours=23, minutes=59, seconds=59)
    
    query = {
        "start_date": {
            "$gte": this_saturday,
            "$lte": next_sunday
        }
    }
    
    events = list(db.events.find(query).sort("start_date", ASCENDING).limit(limit))
    
    return {
        "events": [serialize_doc(e) for e in events],
        "weekend_start": this_saturday.isoformat(),
        "weekend_end": next_sunday.isoformat()
    }

@app.post("/api/events")
async def create_event(event: Event):
    event_dict = event.dict()
    result = db.events.insert_one(event_dict)
    event_dict["_id"] = str(result.inserted_id)
    return serialize_doc(event_dict)

@app.get("/api/stats/counts")
async def get_stats_counts():
    return {
        "churches": db.churches.count_documents({}),
        "pastors": db.pastors.count_documents({}) if "pastors" in db.list_collection_names() else 0,
        "worshipLeaders": db.worship_leaders.count_documents({}) if "worship_leaders" in db.list_collection_names() else 0,
        "mediaTeams": db.media_teams.count_documents({}) if "media_teams" in db.list_collection_names() else 0,
        "events": db.events.count_documents({}),
        "colleges": db.colleges.count_documents({}) if "colleges" in db.list_collection_names() else 0
    }

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)