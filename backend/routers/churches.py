from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr, HttpUrl
from datetime import datetime
from bson import ObjectId
from database import db
from services.image_service import upload_image
from services.ai_automation_service import ai_service
from dependencies import get_current_user, require_admin
import json

router = APIRouter(prefix="/api/churches", tags=["churches"])

class ChurchCreate(BaseModel):
    name: str
    denomination: str
    description: Optional[str] = ""
    address: str
    city: str
    postcode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: EmailStr
    phone: Optional[str] = None
    website: Optional[HttpUrl] = None
    service_times: Optional[str] = None
    ministries: Optional[List[str]] = []
    subscription_tier: str = "free"

@router.post("/", response_model=Dict)
async def create_church(
    church_data: ChurchCreate,
    current_user: Dict = Depends(get_current_user)
):
    church_dict = church_data.dict()
    church_dict["owner_id"] = str(current_user["_id"])
    church_dict["owner_email"] = current_user.get("email")
    church_dict["status"] = "pending"
    church_dict["created_at"] = datetime.utcnow()
    church_dict["updated_at"] = datetime.utcnow()
    
    result = await db.churches.insert_one(church_dict)
    church_id = str(result.inserted_id)
    
    await ai_service.enrich_new_listing(church_id)
    
    return {"id": church_id, "status": "pending", "message": "Church listing created and queued for AI enrichment"}

@router.get("/", response_model=List[Dict])
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    limit: int = 20,
    skip: int = 0
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = denomination
    
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    for church in churches:
        church["id"] = str(church.pop("_id"))
    
    return churches

@router.get("/{church_id}", response_model=Dict)
async def get_church(church_id: str):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["id"] = str(church.pop("_id"))
    return church

@router.put("/{church_id}", response_model=Dict)
async def update_church(
    church_id: str,
    church_data: ChurchCreate,
    current_user: Dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_id"] != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    update_data = church_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.churches.update_one(
        {"_id": ObjectId(church_id)},
        {"$set": update_data}
    )
    
    return {"id": church_id, "message": "Church updated successfully"}

@router.delete("/{church_id}")
async def delete_church(
    church_id: str,
    current_user: Dict = Depends(require_admin)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    result = await db.churches.delete_one({"_id": ObjectId(church_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Church not found")
    
    return {"message": "Church deleted successfully"}