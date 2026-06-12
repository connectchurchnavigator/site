from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional, List
import os
from dotenv import load_dotenv
import time

load_dotenv()

app = FastAPI(title="ChurchNavigator API", version="1.0.0")

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
ENV = os.getenv("ENV", "dev")
DB_NAME = "ChurchNavigator" if ENV == "production" else "DEV-ChurchNavigator"

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
churches_collection = db.churches
pastors_collection = db.pastors
visits_collection = db.visits
slow_query_log = db.slow_query_log

churches_collection.create_index([("slug", ASCENDING)], unique=True)
churches_collection.create_index([("city", ASCENDING)])
churches_collection.create_index([("denomination", ASCENDING)])
churches_collection.create_index([("status", ASCENDING)])
pastors_collection.create_index([("slug", ASCENDING)], unique=True)
pastors_collection.create_index([("city", ASCENDING)])
pastors_collection.create_index([("denomination", ASCENDING)])
visits_collection.create_index([("church_id", ASCENDING)])
visits_collection.create_index([("created_at", DESCENDING)])

class Church(BaseModel):
    name: str
    slug: str
    city: str
    postcode: str
    address: Optional[str] = None
    denomination: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    service_times: Optional[str] = None
    pastor_name: Optional[str] = None
    pastor_slug: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Pastor(BaseModel):
    name: str
    slug: str
    city: str
    denomination: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    church_name: Optional[str] = None
    church_slug: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Visit(BaseModel):
    church_id: str
    church_slug: str
    visitor_name: Optional[str] = None
    visitor_phone: Optional[str] = None
    visitor_email: Optional[str] = None
    visit_date: datetime
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

@app.middleware("http")
async def log_slow_queries(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    if process_time > 0.5:
        slow_query_log.insert_one({
            "path": request.url.path,
            "method": request.method,
            "process_time": process_time,
            "timestamp": datetime.utcnow()
        })
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.get("/api/health")
async def health_check():
    start_time = time.time()
    try:
        db.command('ping')
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    response_time = time.time() - start_time
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "response_time_ms": round(response_time * 1000, 2),
        "environment": ENV,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/churches")
async def get_churches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = denomination
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    projection = {
        "name": 1, "slug": 1, "city": 1, "postcode": 1,
        "denomination": 1, "image_url": 1, "pastor_name": 1
    }
    
    churches = list(churches_collection.find(query, projection).skip(skip).limit(limit))
    total = churches_collection.count_documents(query)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return JSONResponse(
        content={
            "churches": churches,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        },
        headers={
            "Cache-Control": "public, max-age=3600",
            "Vary": "Accept-Encoding"
        }
    )

@app.get("/api/churches/{slug}")
async def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug, "status": "active"})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    
    return JSONResponse(
        content=church,
        headers={
            "Cache-Control": "public, max-age=3600",
            "Vary": "Accept-Encoding"
        }
    )

@app.post("/api/churches")
async def create_church(church: Church):
    if churches_collection.find_one({"slug": church.slug}):
        raise HTTPException(status_code=400, detail="Church with this slug already exists")
    
    church_dict = church.dict()
    result = churches_collection.insert_one(church_dict)
    church_dict["_id"] = str(result.inserted_id)
    
    return church_dict

@app.get("/api/pastors")
async def get_pastors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    denomination: Optional[str] = None
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = denomination
    
    skip = (page - 1) * limit
    projection = {
        "name": 1, "slug": 1, "city": 1, "denomination": 1,
        "image_url": 1, "church_name": 1
    }
    
    pastors = list(pastors_collection.find(query, projection).skip(skip).limit(limit))
    total = pastors_collection.count_documents(query)
    
    for pastor in pastors:
        pastor["_id"] = str(pastor["_id"])
    
    return JSONResponse(
        content={
            "pastors": pastors,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        },
        headers={
            "Cache-Control": "public, max-age=3600",
            "Vary": "Accept-Encoding"
        }
    )

@app.get("/api/pastors/{slug}")
async def get_pastor(slug: str):
    pastor = pastors_collection.find_one({"slug": slug, "status": "active"})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    pastor["_id"] = str(pastor["_id"])
    
    return JSONResponse(
        content=pastor,
        headers={
            "Cache-Control": "public, max-age=3600",
            "Vary": "Accept-Encoding"
        }
    )

@app.post("/api/pastors")
async def create_pastor(pastor: Pastor):
    if pastors_collection.find_one({"slug": pastor.slug}):
        raise HTTPException(status_code=400, detail="Pastor with this slug already exists")
    
    pastor_dict = pastor.dict()
    result = pastors_collection.insert_one(pastor_dict)
    pastor_dict["_id"] = str(result.inserted_id)
    
    return pastor_dict

@app.post("/api/visits")
async def create_visit(visit: Visit):
    visit_dict = visit.dict()
    result = visits_collection.insert_one(visit_dict)
    visit_dict["_id"] = str(result.inserted_id)
    
    return visit_dict

@app.get("/api/visits/{church_slug}")
async def get_church_visits(
    church_slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    query = {"church_slug": church_slug}
    skip = (page - 1) * limit
    
    visits = list(visits_collection.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit))
    total = visits_collection.count_documents(query)
    
    for visit in visits:
        visit["_id"] = str(visit["_id"])
    
    return {
        "visits": visits,
        "total": total,
        "page": page,
        "limit": limit
    }

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0", "environment": ENV}