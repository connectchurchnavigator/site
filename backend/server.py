from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
from typing import Optional, List
import os
from datetime import datetime
import math
from pydantic import BaseModel

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
db_name = "DEV-ChurchNavigator" if os.getenv("ENVIRONMENT") == "dev" else "ChurchNavigator"
db = client[db_name]

churches_collection = db["churches"]
pastors_collection = db["pastors"]

def calculate_distance(lat1, lng1, lat2, lng2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def calculate_match_score(pastor, query_params):
    score = 0
    q = query_params.get('q', '').lower()
    if q:
        if q in pastor.get('name', '').lower():
            score += 50
        if q in pastor.get('title', '').lower():
            score += 30
        if q in pastor.get('bio', '').lower():
            score += 20
        topics = pastor.get('preaching_topics', [])
        if any(q in topic.lower() for topic in topics):
            score += 40
    
    if pastor.get('verified'):
        score += 30
    if pastor.get('featured'):
        score += 20
    
    score += min(pastor.get('followers_count', 0), 100)
    
    return score

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "environment": db_name}

@app.get("/api/churches")
def get_churches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None
):
    query = {"status": "active"}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"denomination": {"$regex": search, "$options": "i"}}
        ]
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if denomination:
        query["denomination"] = denomination
    
    skip = (page - 1) * limit
    total = churches_collection.count_documents(query)
    churches = list(churches_collection.find(query).skip(skip).limit(limit))
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return {
        "churches": churches,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@app.get("/api/churches/{slug}")
def get_church_by_slug(slug: str):
    church = churches_collection.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["_id"] = str(church["_id"])
    return church

@app.get("/api/pastors/search")
def search_pastors(
    q: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    topic: Optional[str] = None,
    language: Optional[str] = None,
    availability: Optional[str] = None,
    travel: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[int] = Query(50, ge=1, le=500),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: Optional[str] = "relevance"
):
    query = {"status": "active"}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if denomination:
        query["denomination"] = denomination
    
    if topic:
        query["preaching_topics"] = {"$regex": topic, "$options": "i"}
    
    if language:
        query["languages"] = language
    
    if availability:
        query["availability"] = {"$regex": availability, "$options": "i"}
    
    if travel:
        query["travel_range"] = {"$regex": travel, "$options": "i"}
    
    pastors = list(pastors_collection.find(query))
    
    if lat is not None and lng is not None:
        for pastor in pastors:
            if pastor.get('latitude') and pastor.get('longitude'):
                distance = calculate_distance(lat, lng, pastor['latitude'], pastor['longitude'])
                pastor['distance'] = round(distance, 1)
            else:
                pastor['distance'] = 999999
        pastors = [p for p in pastors if p.get('distance', 999999) <= radius]
    
    query_params = {'q': q}
    for pastor in pastors:
        pastor['match_score'] = calculate_match_score(pastor, query_params)
    
    if sort == "relevance":
        pastors.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    elif sort == "followers":
        pastors.sort(key=lambda x: x.get('followers_count', 0), reverse=True)
    elif sort == "recent":
        pastors.sort(key=lambda x: x.get('last_active', datetime.min), reverse=True)
    elif sort == "nearest":
        pastors.sort(key=lambda x: x.get('distance', 999999))
    
    total = len(pastors)
    skip = (page - 1) * limit
    paginated_pastors = pastors[skip:skip + limit]
    
    for pastor in paginated_pastors:
        pastor["_id"] = str(pastor["_id"])
    
    return {
        "pastors": paginated_pastors,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 0
    }

@app.get("/api/pastors/featured")
def get_featured_pastors():
    query = {
        "status": "active",
        "$or": [
            {"featured": True},
            {"verified": True}
        ]
    }
    
    pastors = list(pastors_collection.find(query).sort("followers_count", -1).limit(6))
    
    for pastor in pastors:
        pastor["_id"] = str(pastor["_id"])
    
    return {"pastors": pastors}

@app.get("/api/pastors/{slug}")
def get_pastor_by_slug(slug: str):
    pastor = pastors_collection.find_one({"slug": slug})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    pastor["_id"] = str(pastor["_id"])
    return pastor

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)