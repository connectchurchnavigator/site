from fastapi import FastAPI, HTTPException, Query, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import os
from bson import ObjectId
import math
from dotenv import load_dotenv
import secrets
import hashlib
from scripts.deduplicate_churches import find_duplicates, merge_churches, calculate_duplicate_score

load_dotenv()

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com", "https://www.churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "dev-admin-key")

def verify_admin(x_api_key: str = Header(None)):
    if x_api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin credentials")
    return True

class Church(BaseModel):
    name: str
    denomination: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    description: Optional[str] = None
    services: Optional[str] = None
    facilities: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_link: Optional[str] = None

class Visit(BaseModel):
    church_id: str
    user_id: Optional[str] = None
    qr_code_id: Optional[str] = None
    source: str = "web"

class Message(BaseModel):
    church_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

class DuplicateAction(BaseModel):
    primary_id: str
    duplicate_id: str

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0", "database": DB_NAME}

@app.get("/api/churches")
async def get_churches(
    search: Optional[str] = None,
    denomination: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {"status": {"$ne": "merged"}}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"postcode": {"$regex": search, "$options": "i"}}
        ]
    
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    if lat is not None and lng is not None and radius is not None:
        filtered = []
        for church in churches:
            if church.get("latitude") and church.get("longitude"):
                dist = math.sqrt(
                    (church["latitude"] - lat) ** 2 + (church["longitude"] - lng) ** 2
                ) * 111.32
                if dist <= radius:
                    church["distance"] = round(dist, 2)
                    filtered.append(church)
        churches = sorted(filtered, key=lambda x: x.get("distance", float('inf')))
    
    total = await db.churches.count_documents(query)
    
    return {"churches": churches, "total": total, "skip": skip, "limit": limit}

@app.get("/api/churches/{church_id}")
async def get_church(church_id: str):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id), "status": {"$ne": "merged"}})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    
    return church

@app.post("/api/churches")
async def create_church(church: Church, _: bool = Depends(verify_admin)):
    church_dict = church.dict()
    church_dict["created_at"] = datetime.utcnow()
    church_dict["updated_at"] = datetime.utcnow()
    church_dict["status"] = "active"
    
    result = await db.churches.insert_one(church_dict)
    
    return {"id": str(result.inserted_id), "message": "Church created successfully"}

@app.put("/api/churches/{church_id}")
async def update_church(church_id: str, church: Church, _: bool = Depends(verify_admin)):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church_dict = church.dict(exclude_unset=True)
    church_dict["updated_at"] = datetime.utcnow()
    
    result = await db.churches.update_one(
        {"_id": ObjectId(church_id)},
        {"$set": church_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Church not found")
    
    return {"message": "Church updated successfully"}

@app.post("/api/visits")
async def record_visit(visit: Visit):
    if not ObjectId.is_valid(visit.church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(visit.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visit_dict = visit.dict()
    visit_dict["timestamp"] = datetime.utcnow()
    
    await db.visits.insert_one(visit_dict)
    
    return {"message": "Visit recorded successfully"}

@app.post("/api/messages")
async def send_message(message: Message):
    if not ObjectId.is_valid(message.church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(message.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    message_dict = message.dict()
    message_dict["timestamp"] = datetime.utcnow()
    message_dict["status"] = "unread"
    
    await db.messages.insert_one(message_dict)
    
    return {"message": "Message sent successfully"}

@app.get("/api/admin/duplicates")
async def get_duplicates(_: bool = Depends(verify_admin), status: str = "pending"):
    query = {}
    if status:
        query["status"] = status
    
    flags = await db.duplicate_flags.find(query).sort("score", -1).to_list(None)
    
    result = []
    for flag in flags:
        church1 = await db.churches.find_one({"_id": flag["church1_id"]})
        church2 = await db.churches.find_one({"_id": flag["church2_id"]})
        
        if church1 and church2:
            church1["_id"] = str(church1["_id"])
            church2["_id"] = str(church2["_id"])
            
            result.append({
                "_id": str(flag["_id"]),
                "church1": church1,
                "church2": church2,
                "score": flag["score"],
                "reasons": flag["reasons"],
                "status": flag["status"],
                "detected_at": flag["detected_at"].isoformat()
            })
    
    return {"duplicates": result, "total": len(result)}

@app.post("/api/admin/duplicates/{flag_id}/merge")
async def merge_duplicate(flag_id: str, action: DuplicateAction, _: bool = Depends(verify_admin)):
    if not ObjectId.is_valid(flag_id):
        raise HTTPException(status_code=400, detail="Invalid flag ID")
    
    flag = await db.duplicate_flags.find_one({"_id": ObjectId(flag_id)})
    if not flag:
        raise HTTPException(status_code=404, detail="Duplicate flag not found")
    
    if not ObjectId.is_valid(action.primary_id) or not ObjectId.is_valid(action.duplicate_id):
        raise HTTPException(status_code=400, detail="Invalid church IDs")
    
    success = await merge_churches(ObjectId(action.primary_id), ObjectId(action.duplicate_id), auto=False)
    
    if success:
        await db.duplicate_flags.update_one(
            {"_id": ObjectId(flag_id)},
            {"$set": {"status": "merged", "resolved_at": datetime.utcnow()}}
        )
        return {"message": "Churches merged successfully"}
    else:
        raise HTTPException(status_code=500, detail="Merge failed")

@app.post("/api/admin/duplicates/{flag_id}/dismiss")
async def dismiss_duplicate(flag_id: str, _: bool = Depends(verify_admin)):
    if not ObjectId.is_valid(flag_id):
        raise HTTPException(status_code=400, detail="Invalid flag ID")
    
    result = await db.duplicate_flags.update_one(
        {"_id": ObjectId(flag_id)},
        {"$set": {"status": "dismissed", "resolved_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Duplicate flag not found")
    
    return {"message": "Duplicate dismissed"}

@app.post("/api/admin/dedup/run")
async def run_dedup_scan(_: bool = Depends(verify_admin)):
    from scripts.deduplicate_churches import run_deduplication
    
    try:
        await run_deduplication()
        return {"message": "Deduplication scan completed", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deduplication failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)