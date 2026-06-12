from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
import os
from dotenv import load_dotenv
import uuid
import re
from urllib.parse import quote_plus

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_USERNAME = quote_plus(os.getenv("MONGODB_USERNAME", ""))
MONGODB_PASSWORD = quote_plus(os.getenv("MONGODB_PASSWORD", ""))
MONGODB_CLUSTER = os.getenv("MONGODB_CLUSTER", "")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "DEV-ChurchNavigator")

MONGODB_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{MONGODB_CLUSTER}/?retryWrites=true&w=majority"

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DATABASE]
churches_collection = db["churches"]
worship_leaders_collection = db["worship_leaders"]

worship_leaders_collection.create_index([("slug", ASCENDING)], unique=True)
worship_leaders_collection.create_index([("status", ASCENDING)])
worship_leaders_collection.create_index([("city", ASCENDING)])
worship_leaders_collection.create_index([("denomination", ASCENDING)])
worship_leaders_collection.create_index([("instruments", ASCENDING)])
worship_leaders_collection.create_index([("is_featured", DESCENDING)])
worship_leaders_collection.create_index([("created_at", DESCENDING)])

class SocialLinks(BaseModel):
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    twitter: Optional[str] = None

class WorshipLeaderCreate(BaseModel):
    name: str
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = []
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "United Kingdom"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    denomination: Optional[str] = None
    instruments: Optional[List[str]] = []
    worship_styles: Optional[List[str]] = []
    languages_known: Optional[List[str]] = ["English"]
    years_of_experience: Optional[int] = 0
    availability: Optional[str] = "Available for hire"
    social: Optional[SocialLinks] = SocialLinks()
    church_associated_to: Optional[str] = None
    status: str = "draft"
    owner_id: Optional[str] = None

class WorshipLeaderUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    denomination: Optional[str] = None
    instruments: Optional[List[str]] = None
    worship_styles: Optional[List[str]] = None
    languages_known: Optional[List[str]] = None
    years_of_experience: Optional[int] = None
    availability: Optional[str] = None
    social: Optional[SocialLinks] = None
    church_associated_to: Optional[str] = None
    status: Optional[str] = None
    is_verified: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_recommended: Optional[bool] = None

def create_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    slug = slug.strip('-')
    base_slug = slug
    counter = 1
    while worship_leaders_collection.find_one({"slug": slug, "trashed_at": None}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug

def serialize_worship_leader(leader: dict) -> dict:
    leader["id"] = str(leader.pop("_id"))
    if "created_at" in leader:
        leader["created_at"] = leader["created_at"].isoformat()
    if "updated_at" in leader:
        leader["updated_at"] = leader["updated_at"].isoformat()
    if "trashed_at" in leader and leader["trashed_at"]:
        leader["trashed_at"] = leader["trashed_at"].isoformat()
    return leader

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

@app.get("/api/churches")
def get_churches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    state: Optional[str] = None,
    denomination: Optional[str] = None,
    status: str = "published"
):
    query = {"status": status, "trashed_at": None}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    skip = (page - 1) * limit
    total = churches_collection.count_documents(query)
    churches = list(churches_collection.find(query).skip(skip).limit(limit).sort("created_at", DESCENDING))
    
    for church in churches:
        church["id"] = str(church.pop("_id"))
        if "created_at" in church:
            church["created_at"] = church["created_at"].isoformat()
        if "updated_at" in church:
            church["updated_at"] = church["updated_at"].isoformat()
    
    return {
        "data": churches,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/churches/{slug}")
def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug, "trashed_at": None})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["id"] = str(church.pop("_id"))
    if "created_at" in church:
        church["created_at"] = church["created_at"].isoformat()
    if "updated_at" in church:
        church["updated_at"] = church["updated_at"].isoformat()
    
    return church

@app.get("/api/worship-leaders")
def get_worship_leaders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    instrument: Optional[str] = None,
    availability: Optional[str] = None,
    is_featured: Optional[bool] = None,
    status: str = "published"
):
    query = {"status": status, "trashed_at": None}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    if instrument:
        query["instruments"] = {"$regex": instrument, "$options": "i"}
    if availability:
        query["availability"] = {"$regex": availability, "$options": "i"}
    if is_featured is not None:
        query["is_featured"] = is_featured
    
    skip = (page - 1) * limit
    total = worship_leaders_collection.count_documents(query)
    
    sort_order = [("is_featured", DESCENDING), ("created_at", DESCENDING)]
    leaders = list(worship_leaders_collection.find(query).skip(skip).limit(limit).sort(sort_order))
    
    return {
        "data": [serialize_worship_leader(leader) for leader in leaders],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/worship-leaders/search")
def search_worship_leaders(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = {
        "status": "published",
        "trashed_at": None,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"instruments": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}}
        ]
    }
    
    skip = (page - 1) * limit
    total = worship_leaders_collection.count_documents(query)
    leaders = list(worship_leaders_collection.find(query).skip(skip).limit(limit).sort("created_at", DESCENDING))
    
    return {
        "data": [serialize_worship_leader(leader) for leader in leaders],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/worship-leaders/{slug}")
def get_worship_leader(slug: str):
    leader = worship_leaders_collection.find_one({"slug": slug, "trashed_at": None})
    if not leader:
        raise HTTPException(status_code=404, detail="Worship leader not found")
    return serialize_worship_leader(leader)

@app.post("/api/worship-leaders")
def create_worship_leader(leader: WorshipLeaderCreate):
    slug = create_slug(leader.name)
    
    leader_dict = leader.dict()
    leader_dict["id"] = str(uuid.uuid4())
    leader_dict["slug"] = slug
    leader_dict["created_at"] = datetime.utcnow()
    leader_dict["updated_at"] = datetime.utcnow()
    leader_dict["trashed_at"] = None
    leader_dict["is_verified"] = False
    leader_dict["is_featured"] = False
    leader_dict["is_recommended"] = False
    
    if leader_dict["social"]:
        leader_dict["social"] = leader_dict["social"].dict() if hasattr(leader_dict["social"], 'dict') else leader_dict["social"]
    
    result = worship_leaders_collection.insert_one(leader_dict)
    created_leader = worship_leaders_collection.find_one({"_id": result.inserted_id})
    
    return serialize_worship_leader(created_leader)

@app.put("/api/worship-leaders/{slug}")
def update_worship_leader(slug: str, leader_update: WorshipLeaderUpdate):
    existing = worship_leaders_collection.find_one({"slug": slug, "trashed_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Worship leader not found")
    
    update_data = {k: v for k, v in leader_update.dict(exclude_unset=True).items() if v is not None}
    
    if "name" in update_data and update_data["name"] != existing["name"]:
        update_data["slug"] = create_slug(update_data["name"])
    
    if "social" in update_data and update_data["social"]:
        update_data["social"] = update_data["social"].dict() if hasattr(update_data["social"], 'dict') else update_data["social"]
    
    update_data["updated_at"] = datetime.utcnow()
    
    worship_leaders_collection.update_one(
        {"slug": slug},
        {"$set": update_data}
    )
    
    updated_leader = worship_leaders_collection.find_one({"slug": update_data.get("slug", slug)})
    return serialize_worship_leader(updated_leader)

@app.get("/sitemap.xml")
def get_sitemap():
    from xml.etree.ElementTree import Element, SubElement, tostring
    
    urlset = Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    
    url = SubElement(urlset, 'url')
    SubElement(url, 'loc').text = 'https://churchnavigator.com'
    SubElement(url, 'changefreq').text = 'daily'
    SubElement(url, 'priority').text = '1.0'
    
    churches = churches_collection.find({"status": "published", "trashed_at": None})
    for church in churches:
        url = SubElement(urlset, 'url')
        SubElement(url, 'loc').text = f'https://churchnavigator.com/church/{church["slug"]}'
        SubElement(url, 'changefreq').text = 'weekly'
        SubElement(url, 'priority').text = '0.8'
    
    leaders = worship_leaders_collection.find({"status": "published", "trashed_at": None})
    for leader in leaders:
        url = SubElement(urlset, 'url')
        SubElement(url, 'loc').text = f'https://churchnavigator.com/worship-leader/{leader["slug"]}'
        SubElement(url, 'changefreq').text = 'weekly'
        SubElement(url, 'priority').text = '0.7'
    
    xml_string = tostring(urlset, encoding='unicode', method='xml')
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_string}'

@app.get("/robots.txt")
def get_robots():
    return "User-agent: *\nAllow: /\nSitemap: https://api.churchnavigator.com/sitemap.xml"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)