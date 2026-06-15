from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from database import get_database
from bson import ObjectId
from datetime import datetime
import os
from services.imagekit_service import ImageKitService
from services.ai_automation_service import AIAutomationService
from auth import get_current_user, admin_required

router = APIRouter(prefix="/api/churches", tags=["churches"])
imagekit = ImageKitService()

class ChurchCreate(BaseModel):
    name: str
    denomination: str
    address: str
    city: str
    postcode: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    description: Optional[str] = None
    ministries: Optional[List[str]] = []
    service_times: Optional[str] = None
    owner_email: EmailStr
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    denomination: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    description: Optional[str] = None
    ministries: Optional[List[str]] = None
    service_times: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("", status_code=201)
async def create_church(
    church: ChurchCreate,
    db=Depends(get_database)
):
    church_dict = church.dict()
    church_dict["created_at"] = datetime.utcnow()
    church_dict["updated_at"] = datetime.utcnow()
    church_dict["status"] = "pending_review"
    church_dict["subscription_tier"] = "free"
    church_dict["views"] = 0
    church_dict["followers"] = 0
    
    result = await db.churches.insert_one(church_dict)
    church_id = str(result.inserted_id)
    
    ai_service = AIAutomationService(db)
    enrichment = await ai_service.enrich_new_listing(church_id)
    
    return {
        "id": church_id,
        "message": "Church listing created and queued for review",
        "ai_enrichment": enrichment
    }

@router.get("")
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    db=Depends(get_database)
):
    query = {"status": "approved"}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(None)
    total = await db.churches.count_documents(query)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return {"churches": churches, "total": total}

@router.get("/{church_id}")
async def get_church(
    church_id: str,
    db=Depends(get_database)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one(
        {"_id": ObjectId(church_id)},
        {"$inc": {"views": 1}}
    )
    
    await db.analytics.update_one(
        {"church_id": church_id, "date": datetime.utcnow().date()},
        {"$inc": {"views": 1}},
        upsert=True
    )
    
    church["_id"] = str(church["_id"])
    return church

@router.put("/{church_id}")
async def update_church(
    church_id: str,
    church_update: ChurchUpdate,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    existing = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if existing["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_dict = {k: v for k, v in church_update.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.churches.update_one(
        {"_id": ObjectId(church_id)},
        {"$set": update_dict}
    )
    
    return {"message": "Church updated successfully"}

@router.post("/{church_id}/upload-image")
async def upload_church_image(
    church_id: str,
    file: UploadFile = File(...),
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church["owner_email"] != current_user["email"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_bytes = await file.read()
    result = imagekit.upload_image(
        file_bytes,
        f"churches/{church_id}/{file.filename}",
        {"church_id": church_id}
    )
    
    if result["success"]:
        await db.churches.update_one(
            {"_id": ObjectId(church_id)},
            {"$push": {"images": result["url"]}}
        )
        return {"message": "Image uploaded", "url": result["url"]}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))

@router.delete("/{church_id}")
async def delete_church(
    church_id: str,
    db=Depends(get_database),
    current_user=Depends(admin_required)
):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    result = await db.churches.delete_one({"_id": ObjectId(church_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Church not found")
    
    return {"message": "Church deleted successfully"}
