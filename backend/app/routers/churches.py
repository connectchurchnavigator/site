from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from ..database import get_database
from ..models.church import Church, ChurchCreate, ChurchUpdate
from ..routers.homepage import track_activity
import logging

router = APIRouter(prefix="/churches", tags=["churches"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=Church, status_code=status.HTTP_201_CREATED)
async def create_church(church: ChurchCreate, db=Depends(get_database)):
    try:
        church_dict = church.dict()
        church_dict["status"] = "pending"
        church_dict["created_at"] = datetime.utcnow()
        church_dict["updated_at"] = datetime.utcnow()
        
        result = await db.churches.insert_one(church_dict)
        church_dict["_id"] = str(result.inserted_id)
        
        return church_dict
    except Exception as e:
        logger.error(f"Error creating church: {e}")
        raise HTTPException(status_code=500, detail="Failed to create church")

@router.get("/", response_model=dict)
async def list_churches(
    skip: int = 0,
    limit: int = 20,
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    is_featured: Optional[bool] = None,
    status: str = "published",
    db=Depends(get_database)
):
    try:
        query = {"status": status}
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        if denomination:
            query["denomination"] = denomination
        if is_featured is not None:
            query["is_featured"] = is_featured
        
        total = await db.churches.count_documents(query)
        churches = await db.churches.find(query).skip(skip).limit(limit).to_list(limit)
        
        for church in churches:
            church["_id"] = str(church["_id"])
        
        return {
            "churches": churches,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error listing churches: {e}")
        raise HTTPException(status_code=500, detail="Failed to list churches")

@router.get("/{church_id}", response_model=Church)
async def get_church(church_id: str, db=Depends(get_database)):
    try:
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        church["_id"] = str(church["_id"])
        return church
    except Exception as e:
        logger.error(f"Error getting church: {e}")
        raise HTTPException(status_code=500, detail="Failed to get church")

@router.patch("/{church_id}", response_model=Church)
async def update_church(church_id: str, church_update: ChurchUpdate, db=Depends(get_database)):
    try:
        update_data = {k: v for k, v in church_update.dict(exclude_unset=True).items()}
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db.churches.update_one(
            {"_id": ObjectId(church_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Church not found")
        
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        church["_id"] = str(church["_id"])
        
        return church
    except Exception as e:
        logger.error(f"Error updating church: {e}")
        raise HTTPException(status_code=500, detail="Failed to update church")

@router.post("/{church_id}/approve")
async def approve_church(church_id: str, db=Depends(get_database)):
    try:
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        await db.churches.update_one(
            {"_id": ObjectId(church_id)},
            {"$set": {"status": "published", "updated_at": datetime.utcnow()}}
        )
        
        await track_activity(
            db=db,
            activity_type="new_church",
            title=f"{church.get('name', 'A church')} joined ChurchNavigator",
            subtitle=f"{church.get('denomination', 'Christian')} - {church.get('city', 'UK')}",
            icon="church",
            color="lavender",
            link=f"/churches/{church_id}",
            church_id=church_id
        )
        
        return {"message": "Church approved and published", "church_id": church_id}
    except Exception as e:
        logger.error(f"Error approving church: {e}")
        raise HTTPException(status_code=500, detail="Failed to approve church")

@router.delete("/{church_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_church(church_id: str, db=Depends(get_database)):
    try:
        result = await db.churches.delete_one({"_id": ObjectId(church_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Church not found")
        return None
    except Exception as e:
        logger.error(f"Error deleting church: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete church")