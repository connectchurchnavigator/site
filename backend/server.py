from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
from services.cache_service import cache_get, cache_set, cache_delete, cache_delete_pattern

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "DEV-ChurchNavigator")

mongo_client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=50,
    minPoolSize=5,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=10000
)
db = mongo_client[DB_NAME]

@app.middleware("http")
async def log_response_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: {request.method} {request.url.path} took {elapsed:.0f}ms")
    response.headers["X-Response-Time"] = f"{elapsed:.0f}ms"
    return response

@app.get("/api/churches")
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    language: Optional[str] = None,
    featured: Optional[bool] = None,
    open_to_visits: Optional[bool] = None
):
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    cache_key = f"churches:list:{city}:{denomination}:{language}:{featured}:{open_to_visits}:{page}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    query = {"status": "active"}
    if city:
        query["city"] = city
    if denomination:
        query["denomination"] = denomination
    if language:
        query["languages"] = language
    if featured is not None:
        query["is_featured"] = featured
    if open_to_visits is not None:
        query["open_to_visits"] = open_to_visits
    
    total = await db.churches.count_documents(query)
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(limit)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    result = {
        "churches": churches,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
    
    await cache_set(cache_key, result, ttl=900)
    return result

@app.get("/api/churches/{slug}")
async def get_church(slug: str):
    cache_key = f"churches:detail:{slug}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    church = await db.churches.find_one({"slug": slug, "status": "active"})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    
    await cache_set(cache_key, church, ttl=300)
    return church

@app.put("/api/churches/{slug}")
async def update_church(slug: str, data: dict):
    data["updated_at"] = datetime.utcnow()
    result = await db.churches.update_one({"slug": slug}, {"$set": data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await cache_delete(f"churches:detail:{slug}")
    await cache_delete_pattern("churches:list:*")
    
    site = await db.church_sites.find_one({"church_slug": slug})
    if site:
        await cache_delete_pattern(f"site:{site['domain']}:*")
    
    return {"ok": True}

@app.get("/api/events")
async def get_events(
    city: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    cache_key = f"events:list:{city}:{date_from}:{date_to}:{page}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    query = {"status": "active"}
    if city:
        query["city"] = city
    if date_from:
        query["date"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        if "date" not in query:
            query["date"] = {}
        query["date"]["$lte"] = datetime.fromisoformat(date_to)
    
    total = await db.events.count_documents(query)
    events = await db.events.find(query).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    
    for event in events:
        event["_id"] = str(event["_id"])
    
    result = {
        "events": events,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }
    
    await cache_set(cache_key, result, ttl=300)
    return result

@app.get("/api/events/{slug}")
async def get_event(slug: str):
    cache_key = f"events:detail:{slug}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    event = await db.events.find_one({"slug": slug, "status": "active"})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event["_id"] = str(event["_id"])
    
    await cache_set(cache_key, event, ttl=300)
    return event

@app.get("/api/homepage/stats")
async def get_homepage_stats():
    cache_key = "homepage:stats"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    total_churches = await db.churches.count_documents({"status": "active"})
    total_pastors = await db.pastors.count_documents({"status": "active"})
    total_events = await db.events.count_documents({
        "status": "active",
        "date": {"$gte": datetime.utcnow()}
    })
    
    result = {
        "total_churches": total_churches,
        "total_pastors": total_pastors,
        "total_events": total_events
    }
    
    await cache_set(cache_key, result, ttl=3600)
    return result

@app.get("/api/homepage/activity")
async def get_homepage_activity(limit: int = 20):
    cache_key = f"homepage:activity:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    activity = await db.homepage_activity.find().sort("created_at", -1).limit(limit).to_list(limit)
    
    for item in activity:
        item["_id"] = str(item["_id"])
    
    await cache_set(cache_key, activity, ttl=60)
    return activity

@app.get("/api/search")
async def search(
    q: str,
    type: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    limit = min(limit, 100)
    skip = (page - 1) * limit
    
    cache_key = f"search:{q}:{type}:{city}:{page}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    query = {"$text": {"$search": q}, "status": "active"}
    if city:
        query["city"] = city
    
    results = []
    if not type or type == "churches":
        churches = await db.churches.find(query).limit(limit).to_list(limit)
        for church in churches:
            church["_id"] = str(church["_id"])
            church["type"] = "church"
        results.extend(churches)
    
    if not type or type == "events":
        events = await db.events.find(query).limit(limit).to_list(limit)
        for event in events:
            event["_id"] = str(event["_id"])
            event["type"] = "event"
        results.extend(events)
    
    result = {
        "results": results[:limit],
        "total": len(results)
    }
    
    await cache_set(cache_key, result, ttl=120)
    return result

@app.get("/api/pastors/{slug}")
async def get_pastor(slug: str):
    cache_key = f"pastors:detail:{slug}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    pastor = await db.pastors.find_one({"slug": slug, "status": "active"})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    pastor["_id"] = str(pastor["_id"])
    
    await cache_set(cache_key, pastor, ttl=300)
    return pastor

@app.get("/church/{domain}/{page_slug}")
async def serve_church_site(domain: str, page_slug: str = "home"):
    cache_key = f"site:{domain}:{page_slug}"
    cached = await cache_get(cache_key)
    if cached:
        return HTMLResponse(cached)
    
    site = await db.church_sites.find_one({"domain": domain, "hosting_status": "active"})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    html = site.get("pages", {}).get(page_slug, site.get("pages", {}).get("home", ""))
    if not html:
        raise HTTPException(status_code=404, detail="Page not found")
    
    signature = f'<!-- Powered by ChurchNavigator.com | Church: {site["church_slug"]} | Domain: {domain} -->'
    html = html.replace("</body>", f"{signature}</body>")
    
    await cache_set(cache_key, html, ttl=86400)
    return HTMLResponse(html)

@app.get("/")
async def root():
    return {"status": "ok", "service": "ChurchNavigator API", "version": "2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)