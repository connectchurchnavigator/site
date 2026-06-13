from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/churches", tags=["churches"])

class Church(BaseModel):
    name: str
    denomination: Optional[str] = None
    description: Optional[str] = None
    address: str
    city: str
    postcode: str
    country: str = "United Kingdom"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[HttpUrl] = None
    service_times: Optional[str] = None
    logo_url: Optional[HttpUrl] = None
    image_urls: Optional[List[HttpUrl]] = []
    pastor_name: Optional[str] = None
    founded_year: Optional[int] = None
    congregation_size: Optional[str] = None
    facilities: Optional[List[str]] = []
    ministries: Optional[List[str]] = []

@router.get("")
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    query = {"moderation_status": "approved"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    churches = list(db.churches.find(query).skip(skip).limit(limit))
    total = db.churches.count_documents(query)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return {"churches": churches, "total": total, "skip": skip, "limit": limit}

@router.get("/{church_id}")
async def get_church(church_id: str):
    try:
        church_oid = ObjectId(church_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = db.churches.find_one({"_id": church_oid, "moderation_status": "approved"})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    return church

@router.post("")
async def create_church(church: Church, current_user: dict = Depends(get_current_user)):
    church_dict = church.dict()
    church_dict["user_id"] = str(current_user["_id"])
    church_dict["created_at"] = datetime.utcnow()
    church_dict["updated_at"] = datetime.utcnow()
    church_dict["moderation_status"] = "pending"
    
    result = db.churches.insert_one(church_dict)
    church_dict["_id"] = str(result.inserted_id)
    
    return church_dict

@router.put("/{church_id}")
async def update_church(church_id: str, church: Church, current_user: dict = Depends(get_current_user)):
    try:
        church_oid = ObjectId(church_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    existing = db.churches.find_one({"_id": church_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(existing["user_id"]) != str(current_user["_id"]) and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    church_dict = church.dict()
    church_dict["updated_at"] = datetime.utcnow()
    
    db.churches.update_one({"_id": church_oid}, {"$set": church_dict})
    
    updated = db.churches.find_one({"_id": church_oid})
    updated["_id"] = str(updated["_id"])
    return updated

@router.delete("/{church_id}")
async def delete_church(church_id: str, current_user: dict = Depends(get_current_user)):
    try:
        church_oid = ObjectId(church_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    existing = db.churches.find_one({"_id": church_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(existing["user_id"]) != str(current_user["_id"]) and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.churches.delete_one({"_id": church_oid})
    return {"message": "Church deleted successfully"}
