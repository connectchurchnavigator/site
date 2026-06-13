from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from ..database import db
from ..models import Church
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/churches")
async def get_churches(
    featured: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[str] = None
):
    try:
        query = {"status": "active"}
        
        if featured is not None:
            query["is_featured"] = featured
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        if denomination:
            query["denomination"] = {"$regex": denomination, "$options": "i"}
        
        churches = await db.churches.find(query).skip(skip).limit(limit).to_list(length=limit)
        total = await db.churches.count_documents(query)
        
        for church in churches:
            church["_id"] = str(church["_id"])
        
        return {
            "churches": churches,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    except Exception as e:
        logger.error(f"Error fetching churches: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch churches")

@router.get("/api/churches/{church_id}")
async def get_church(church_id: str):
    try:
        church = await db.churches.find_one({"_id": church_id})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        church["_id"] = str(church["_id"])
        return church
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching church {church_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch church")