from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient, GEOSPHERE
from bson import ObjectId
import os
from dotenv import load_dotenv
import certifi
import jwt
from passlib.context import CryptContext
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import secrets
import re

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com", "https://www.churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
db = client["ChurchNavigator"]
churches_collection = db["churches"]
users_collection = db["users"]
analytics_collection = db["analytics"]
messages_collection = db["messages"]

churches_collection.create_index([("location", GEOSPHERE)])
churches_collection.create_index("slug", unique=True)
users_collection.create_index("email", unique=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Church(BaseModel):
    name: str
    slug: str
    denomination: Optional[str] = None
    address: str
    postcode: str
    city: str
    location: Dict[str, Any]
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    images: Optional[List[str]] = []
    service_times: Optional[List[Dict[str, Any]]] = []
    ministries: Optional[List[str]] = []
    facilities: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    social_media: Optional[Dict[str, str]] = {}
    status: str = "active"
    verified: bool = False
    parent_church_id: Optional[str] = None
    is_branch: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ListingRole(BaseModel):
    listing_id: str
    listing_type: str
    role: str
    slug: str
    name: str

class UserListingsResponse(BaseModel):
    listings: List[Dict[str, Any]]

class NetworkStatsResponse(BaseModel):
    parent: Dict[str, Any]
    branches: List[Dict[str, Any]]
    combined_stats: Dict[str, Any]
    branch_performance: List[Dict[str, Any]]
    insights: Dict[str, Any]

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_current_user(authorization: str = Depends(lambda: None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    user = users_collection.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "version": "1.0"}

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user_data.password)
    user_doc = {
        "email": user_data.email,
        "password": hashed_password,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "listings": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)
    
    token = create_access_token({"user_id": str(result.inserted_id), "email": user_data.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/users/me/listings", response_model=UserListingsResponse)
async def get_user_listings(authorization: str = Depends(lambda: None)):
    user = await get_current_user(authorization)
    
    listings = []
    for listing_ref in user.get("listings", []):
        listing_type = listing_ref.get("listing_type", "church")
        listing_id = listing_ref.get("listing_id")
        
        if listing_type == "church":
            church = churches_collection.find_one({"_id": ObjectId(listing_id)})
            if church:
                views_count = analytics_collection.count_documents({"church_id": listing_id, "event_type": "view"})
                checkins_count = analytics_collection.count_documents({"church_id": listing_id, "event_type": "checkin"})
                followers_count = analytics_collection.count_documents({"church_id": listing_id, "event_type": "follow"})
                messages_count = messages_collection.count_documents({"church_id": listing_id, "status": "unread"})
                
                listings.append({
                    "listing_id": listing_id,
                    "listing_type": "church",
                    "role": listing_ref.get("role", "admin"),
                    "slug": church.get("slug"),
                    "name": church.get("name"),
                    "logo_url": church.get("logo_url"),
                    "is_branch": church.get("is_branch", False),
                    "parent_church_id": church.get("parent_church_id"),
                    "stats": {
                        "views": views_count,
                        "checkins": checkins_count,
                        "followers": followers_count,
                        "messages": messages_count
                    }
                })
        elif listing_type == "pastor":
            listings.append({
                "listing_id": listing_id,
                "listing_type": "pastor",
                "role": "owner",
                "slug": listing_ref.get("slug"),
                "name": listing_ref.get("name"),
                "logo_url": listing_ref.get("logo_url"),
                "stats": {
                    "views": 0,
                    "checkins": 0,
                    "followers": 0,
                    "messages": 0
                }
            })
    
    return {"listings": listings}

@app.get("/api/churches/{slug}/network", response_model=NetworkStatsResponse)
async def get_church_network(slug: str, authorization: str = Depends(lambda: None)):
    user = await get_current_user(authorization)
    
    parent_church = churches_collection.find_one({"slug": slug})
    if not parent_church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    parent_id = str(parent_church["_id"])
    user_has_access = any(l.get("listing_id") == parent_id for l in user.get("listings", []))
    if not user_has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    branches = list(churches_collection.find({"parent_church_id": parent_id, "status": "active"}))
    
    all_church_ids = [parent_id] + [str(b["_id"]) for b in branches]
    
    total_views = analytics_collection.count_documents({"church_id": {"$in": all_church_ids}, "event_type": "view"})
    total_checkins = analytics_collection.count_documents({"church_id": {"$in": all_church_ids}, "event_type": "checkin"})
    total_followers = analytics_collection.count_documents({"church_id": {"$in": all_church_ids}, "event_type": "follow"})
    total_messages = messages_collection.count_documents({"church_id": {"$in": all_church_ids}})
    
    branch_performance = []
    for branch in branches:
        branch_id = str(branch["_id"])
        views = analytics_collection.count_documents({"church_id": branch_id, "event_type": "view"})
        checkins = analytics_collection.count_documents({"church_id": branch_id, "event_type": "checkin"})
        followers = analytics_collection.count_documents({"church_id": branch_id, "event_type": "follow"})
        messages = messages_collection.count_documents({"church_id": branch_id, "status": "unread"})
        
        health_score = min(100, (views / 10) + (checkins * 2) + (followers / 5))
        status = "good" if health_score > 50 else "needs_attention" if health_score > 20 else "critical"
        
        branch_performance.append({
            "branch_id": branch_id,
            "name": branch.get("name"),
            "slug": branch.get("slug"),
            "views": views,
            "checkins": checkins,
            "followers": followers,
            "messages": messages,
            "health_score": round(health_score, 1),
            "status": status
        })
    
    branch_performance.sort(key=lambda x: x["health_score"], reverse=True)
    
    best_branch = branch_performance[0] if branch_performance else None
    worst_branch = branch_performance[-1] if branch_performance else None
    
    insights = {
        "best_performing": best_branch.get("name") if best_branch else None,
        "needs_attention": worst_branch.get("name") if worst_branch and worst_branch["status"] != "good" else None,
        "recommendations": [
            f"Consider cross-promoting {best_branch.get('name')} content across network" if best_branch else "Add branches to build your network",
            f"Schedule visit to {worst_branch.get('name')} to boost engagement" if worst_branch and worst_branch["status"] != "good" else "Keep up the great work!"
        ]
    }
    
    parent_data = {
        "id": parent_id,
        "name": parent_church.get("name"),
        "slug": parent_church.get("slug"),
        "logo_url": parent_church.get("logo_url")
    }
    
    branches_data = [{
        "id": str(b["_id"]),
        "name": b.get("name"),
        "slug": b.get("slug"),
        "logo_url": b.get("logo_url"),
        "address": b.get("address"),
        "city": b.get("city")
    } for b in branches]
    
    return {
        "parent": parent_data,
        "branches": branches_data,
        "combined_stats": {
            "total_views": total_views,
            "total_checkins": total_checkins,
            "total_followers": total_followers,
            "total_messages": total_messages,
            "total_branches": len(branches)
        },
        "branch_performance": branch_performance,
        "insights": insights
    }

@app.get("/api/churches")
async def get_churches(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[int] = 5000,
    denomination: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    query = {"status": "active"}
    
    if denomination:
        query["denomination"] = denomination
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if lat is not None and lng is not None:
        query["location"] = {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius
            }
        }
    
    churches = list(churches_collection.find(query).limit(limit))
    
    for church in churches:
        church["_id"] = str(church["_id"])
        if "parent_church_id" in church:
            church["parent_church_id"] = str(church["parent_church_id"])
    
    return {"churches": churches, "count": len(churches)}

@app.get("/api/churches/{slug}")
async def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    if "parent_church_id" in church:
        church["parent_church_id"] = str(church["parent_church_id"])
    
    return church

@app.post("/api/churches")
async def create_church(church: Church, authorization: str = Depends(lambda: None)):
    user = await get_current_user(authorization)
    
    if churches_collection.find_one({"slug": church.slug}):
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    church_dict = church.dict()
    result = churches_collection.insert_one(church_dict)
    
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$push": {"listings": {"listing_id": str(result.inserted_id), "listing_type": "church", "role": "admin", "slug": church.slug, "name": church.name}}}
    )
    
    church_dict["_id"] = str(result.inserted_id)
    return church_dict

@app.post("/api/analytics/track")
async def track_event(
    church_id: str,
    event_type: str,
    metadata: Optional[Dict[str, Any]] = None
):
    event = {
        "church_id": church_id,
        "event_type": event_type,
        "metadata": metadata or {},
        "timestamp": datetime.utcnow()
    }
    analytics_collection.insert_one(event)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)