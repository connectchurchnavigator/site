from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import re
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://churchnavigator.com", "https://www.churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://username:password@cluster.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

churches_collection = db["churches"]
worshipleaders_collection = db["worshipleaders"]
mediateams_collection = db["mediateams"]
events_collection = db["events"]
users_collection = db["users"]
subscriptions_collection = db["subscriptions"]
views_collection = db["views"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_plan(user: dict, required_plan: str):
    plan_hierarchy = {"free": 0, "standard": 1, "premium": 2}
    subscription = subscriptions_collection.find_one({"user_id": str(user["_id"]), "status": "active"})
    user_plan = subscription.get("plan", "free") if subscription else "free"
    if plan_hierarchy.get(user_plan, 0) < plan_hierarchy.get(required_plan, 0):
        raise HTTPException(status_code=403, detail=f"{required_plan.capitalize()} plan required")
    return subscription

class ViewTrackingModel(BaseModel):
    listing_id: str
    listing_type: str
    listing_slug: str
    source: str = "direct"
    device: str = "desktop"
    country: Optional[str] = None
    city: Optional[str] = None
    tab_viewed: str = "overview"

@app.post("/api/track-view")
async def track_view(view: ViewTrackingModel):
    try:
        view_doc = {
            "listing_id": view.listing_id,
            "listing_type": view.listing_type,
            "listing_slug": view.listing_slug,
            "viewed_at": datetime.utcnow(),
            "source": view.source,
            "device": view.device,
            "country": view.country,
            "city": view.city,
            "tab_viewed": view.tab_viewed
        }
        views_collection.insert_one(view_doc)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tools/analytics/{listing_id}")
async def get_analytics(listing_id: str, user: dict = Depends(get_current_user)):
    subscription = require_plan(user, "standard")
    
    try:
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        year_ago = now - timedelta(days=365)
        
        total_views = views_collection.count_documents({"listing_id": listing_id})
        views_this_week = views_collection.count_documents({
            "listing_id": listing_id,
            "viewed_at": {"$gte": week_ago}
        })
        views_this_month = views_collection.count_documents({
            "listing_id": listing_id,
            "viewed_at": {"$gte": month_ago}
        })
        views_this_year = views_collection.count_documents({
            "listing_id": listing_id,
            "viewed_at": {"$gte": year_ago}
        })
        
        weekly_trend = []
        for i in range(52):
            week_start = now - timedelta(weeks=i+1)
            week_end = now - timedelta(weeks=i)
            count = views_collection.count_documents({
                "listing_id": listing_id,
                "viewed_at": {"$gte": week_start, "$lt": week_end}
            })
            weekly_trend.insert(0, {"week": i+1, "count": count, "date": week_start.strftime("%Y-%m-%d")})
        
        monthly_trend = []
        for i in range(12):
            month_start = now - timedelta(days=30*(i+1))
            month_end = now - timedelta(days=30*i)
            count = views_collection.count_documents({
                "listing_id": listing_id,
                "viewed_at": {"$gte": month_start, "$lt": month_end}
            })
            monthly_trend.insert(0, {"month": i+1, "count": count, "date": month_start.strftime("%b %Y")})
        
        sources_pipeline = [
            {"$match": {"listing_id": listing_id}},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        sources_data = list(views_collection.aggregate(sources_pipeline))
        sources = [{"source": s["_id"], "count": s["count"], "pct": round(s["count"] / total_views * 100, 1) if total_views > 0 else 0} for s in sources_data]
        
        tabs_pipeline = [
            {"$match": {"listing_id": listing_id}},
            {"$group": {"_id": "$tab_viewed", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        tabs_data = list(views_collection.aggregate(tabs_pipeline))
        top_tabs = [{"tab": t["_id"], "count": t["count"], "pct": round(t["count"] / total_views * 100, 1) if total_views > 0 else 0} for t in tabs_data]
        
        device_pipeline = [
            {"$match": {"listing_id": listing_id}},
            {"$group": {"_id": "$device", "count": {"$sum": 1}}}
        ]
        device_data = list(views_collection.aggregate(device_pipeline))
        mobile_count = next((d["count"] for d in device_data if d["_id"] == "mobile"), 0)
        desktop_count = next((d["count"] for d in device_data if d["_id"] == "desktop"), 0)
        device_split = {
            "mobile_pct": round(mobile_count / total_views * 100, 1) if total_views > 0 else 0,
            "desktop_pct": round(desktop_count / total_views * 100, 1) if total_views > 0 else 0
        }
        
        geo_pipeline = [
            {"$match": {"listing_id": listing_id, "city": {"$ne": None}}},
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        geo_data = list(views_collection.aggregate(geo_pipeline))
        geographic = [{"city": g["_id"], "count": g["count"]} for g in geo_data]
        
        event_impact = []
        listing = None
        for coll in [churches_collection, worshipleaders_collection, mediateams_collection]:
            listing = coll.find_one({"_id": ObjectId(listing_id)})
            if listing:
                break
        
        if listing and "events" in listing:
            for event in listing.get("events", []):
                event_date = event.get("date")
                if event_date:
                    event_week_start = event_date - timedelta(days=7)
                    event_week_end = event_date + timedelta(days=7)
                    before_views = views_collection.count_documents({
                        "listing_id": listing_id,
                        "viewed_at": {"$gte": event_week_start - timedelta(days=7), "$lt": event_week_start}
                    })
                    during_views = views_collection.count_documents({
                        "listing_id": listing_id,
                        "viewed_at": {"$gte": event_week_start, "$lt": event_week_end}
                    })
                    spike_pct = round(((during_views - before_views) / before_views * 100), 1) if before_views > 0 else 0
                    if abs(spike_pct) > 20:
                        event_impact.append({
                            "event_name": event.get("name", "Event"),
                            "date": event_date.strftime("%Y-%m-%d"),
                            "views_spike_pct": spike_pct
                        })
        
        return {
            "total_views": total_views,
            "views_this_week": views_this_week,
            "views_this_month": views_this_month,
            "views_this_year": views_this_year,
            "weekly_trend": weekly_trend,
            "monthly_trend": monthly_trend,
            "sources": sources,
            "top_tabs": top_tabs,
            "device_split": device_split,
            "geographic": geographic,
            "event_impact": event_impact
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tools/analytics/{listing_id}/spikes")
async def get_spikes(listing_id: str, user: dict = Depends(get_current_user)):
    subscription = require_plan(user, "standard")
    
    try:
        now = datetime.utcnow()
        spikes = []
        
        for i in range(1, 13):
            current_week_start = now - timedelta(weeks=i)
            current_week_end = now - timedelta(weeks=i-1)
            prev_week_start = now - timedelta(weeks=i+1)
            prev_week_end = now - timedelta(weeks=i)
            
            current_count = views_collection.count_documents({
                "listing_id": listing_id,
                "viewed_at": {"$gte": current_week_start, "$lt": current_week_end}
            })
            prev_count = views_collection.count_documents({
                "listing_id": listing_id,
                "viewed_at": {"$gte": prev_week_start, "$lt": prev_week_end}
            })
            
            if prev_count > 0:
                pct_change = round(((current_count - prev_count) / prev_count) * 100, 1)
                if abs(pct_change) > 30:
                    spike_type = "spike" if pct_change > 0 else "drop"
                    likely_cause = ""
                    ai_explanation = ""
                    
                    if spike_type == "spike":
                        likely_cause = "event or social media mention"
                        ai_explanation = f"Views increased by {pct_change}% during week of {current_week_start.strftime('%b %d')}. This could be due to a church event, social media sharing, or improved search visibility."
                    else:
                        likely_cause = "seasonal decrease or event conclusion"
                        ai_explanation = f"Views decreased by {abs(pct_change)}% during week of {current_week_start.strftime('%b %d')}. This may indicate seasonal patterns or the end of a promotional period."
                    
                    spikes.append({
                        "week": current_week_start.strftime("%Y-%m-%d"),
                        "type": spike_type,
                        "pct_change": pct_change,
                        "likely_cause": likely_cause,
                        "ai_explanation": ai_explanation
                    })
        
        return {"spikes": spikes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)