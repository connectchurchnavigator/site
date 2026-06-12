from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGODB_URI)
db = client["DEV-ChurchNavigator"]
churches_collection = db["churches"]
colleges_collection = db["bible_colleges"]

class Course(BaseModel):
    name: str
    duration: str
    level: str
    description: str
    fees: str

class BibleCollege(BaseModel):
    slug: str
    name: str
    tagline: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    address_line1: Optional[str] = None
    city: str
    country: str = "United Kingdom"
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    denomination: Optional[str] = None
    accreditation: Optional[str] = None
    courses: List[Course] = []
    entry_requirements: Optional[str] = None
    scholarships_available: bool = False
    scholarship_details: Optional[str] = None
    application_deadline: Optional[str] = None
    campus_facilities: List[str] = []
    languages_of_instruction: List[str] = ["English"]
    online_available: bool = False
    gallery_images: List[str] = []
    alumni_count: Optional[int] = None
    founded_year: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None
    status: str = "active"
    is_verified: bool = False
    is_featured: bool = False
    owner_id: Optional[str] = None

@app.get("/")
def root():
    return {"message": "ChurchNavigator API", "status": "running"}

@app.get("/api/churches")
def get_churches(limit: int = Query(50, le=100)):
    churches = list(churches_collection.find({"status": "active"}).limit(limit))
    for church in churches:
        church["_id"] = str(church["_id"])
    return {"churches": churches, "count": len(churches)}

@app.get("/api/churches/{slug}")
def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["_id"] = str(church["_id"])
    return church

@app.get("/api/colleges")
def get_colleges(
    limit: int = Query(50, le=100),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    online: Optional[bool] = None,
    featured: Optional[bool] = None
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    if online is not None:
        query["online_available"] = online
    if featured is not None:
        query["is_featured"] = featured
    
    colleges = list(colleges_collection.find(query).limit(limit))
    for college in colleges:
        college["_id"] = str(college["_id"])
    return {"colleges": colleges, "count": len(colleges)}

@app.get("/api/colleges/search")
def search_colleges(q: str = Query(..., min_length=2)):
    query = {
        "status": "active",
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"denomination": {"$regex": q, "$options": "i"}}
        ]
    }
    colleges = list(colleges_collection.find(query).limit(20))
    for college in colleges:
        college["_id"] = str(college["_id"])
    return {"colleges": colleges, "count": len(colleges)}

@app.get("/api/colleges/{slug}")
def get_college(slug: str):
    college = colleges_collection.find_one({"slug": slug})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    college["_id"] = str(college["_id"])
    return college

@app.post("/api/colleges")
def create_college(college: BibleCollege):
    existing = colleges_collection.find_one({"slug": college.slug})
    if existing:
        raise HTTPException(status_code=400, detail="College with this slug already exists")
    
    college_dict = college.dict()
    college_dict["created_at"] = datetime.utcnow()
    result = colleges_collection.insert_one(college_dict)
    college_dict["_id"] = str(result.inserted_id)
    return college_dict

@app.put("/api/colleges/{slug}")
def update_college(slug: str, college: BibleCollege):
    existing = colleges_collection.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="College not found")
    
    college_dict = college.dict()
    college_dict["updated_at"] = datetime.utcnow()
    colleges_collection.update_one({"slug": slug}, {"$set": college_dict})
    updated = colleges_collection.find_one({"slug": slug})
    updated["_id"] = str(updated["_id"])
    return updated

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)