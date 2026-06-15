from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import time
import logging
from services.cache_service import cache_get, cache_set, cache_delete, cache_delete_pattern
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/churches", tags=["churches"])

class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    denomination: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pastor_name: Optional[str] = None
    service_times: Optional[List[dict]] = None
    languages: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    open_to_visits: Optional[bool] = None

@router.get("")
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    language: Optional[str] = None,
    open_to_visits: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    start = time.time()
    cache_key = f"churches:list:{city}:{denomination}:{language}:{open_to_visits}:{page}:{limit}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    query = {"status": "active"}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = denomination
    if language:
        query["languages"] = language
    if open_to_visits is not None:
        query["open_to_visits"] = open_to_visits
    
    skip = (page - 1) * limit
    
    cursor = db.churches.find(query).sort([("is_featured", -1), ("name", 1)]).skip(skip).limit(limit)
    churches = await cursor.to_list(length=limit)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    total = await db.churches.count_documents(query)
    
    result = {
        "churches": churches,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
    
    await cache_set(cache_key, result, ttl=900)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_churches took {elapsed:.0f}ms")
    else:
        logger.info(f"get_churches took {elapsed:.0f}ms")
    
    return result

@router.get("/{slug}")
async def get_church(slug: str):
    start = time.time()
    cache_key = f"churches:detail:{slug}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    church = await db.churches.find_one({"slug": slug, "status": "active"})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    
    reviews_cursor = db.reviews.find({"church_id": str(church["_id"]), "status": "approved"}).sort("created_at", -1).limit(10)
    reviews = await reviews_cursor.to_list(length=10)
    for review in reviews:
        review["_id"] = str(review["_id"])
    
    church["reviews"] = reviews
    church["review_count"] = await db.reviews.count_documents({"church_id": str(church["_id"]), "status": "approved"})
    
    if church.get("review_count", 0) > 0:
        pipeline = [
            {"$match": {"church_id": str(church["_id"]), "status": "approved"}},
            {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
        ]
        result = await db.reviews.aggregate(pipeline).to_list(1)
        church["avg_rating"] = round(result[0]["avg_rating"], 1) if result else 0
    else:
        church["avg_rating"] = 0
    
    await cache_set(cache_key, church, ttl=300)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: get_church took {elapsed:.0f}ms")
    else:
        logger.info(f"get_church took {elapsed:.0f}ms")
    
    return church

@router.put("/{slug}")
async def update_church(slug: str, data: ChurchUpdate):
    start = time.time()
    db = await get_database()
    
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.churches.update_one({"slug": slug}, {"$set": update_data})
    
    await cache_delete(f"churches:detail:{slug}")
    await cache_delete_pattern("churches:list:*")
    
    site = await db.church_sites.find_one({"church_id": str(church["_id"])})
    if site:
        await cache_delete_pattern(f"site:{site['domain']}:*")
    
    elapsed = (time.time() - start) * 1000
    logger.info(f"update_church took {elapsed:.0f}ms")
    
    return {"ok": True, "message": "Church updated successfully"}

@router.get("/search/text")
async def search_churches(q: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    start = time.time()
    cache_key = f"churches:search:{q}:{page}:{limit}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return cached
    
    db = await get_database()
    skip = (page - 1) * limit
    
    cursor = db.churches.find(
        {"$text": {"$search": q}, "status": "active"},
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).skip(skip).limit(limit)
    
    churches = await cursor.to_list(length=limit)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    total = await db.churches.count_documents({"$text": {"$search": q}, "status": "active"})
    
    result = {
        "churches": churches,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
    
    await cache_set(cache_key, result, ttl=120)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: search_churches took {elapsed:.0f}ms")
    else:
        logger.info(f"search_churches took {elapsed:.0f}ms")
    
    return result