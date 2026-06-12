from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import asyncio
import json
import uuid
from ..database import db
from ..auth import get_current_user, optional_current_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/planner", tags=["planner"])

class ItineraryItem(BaseModel):
    church_id: str
    church_name: str
    datetime: str
    duration_minutes: int
    event_type: str
    notes: Optional[str] = None
    status: str = "pending"
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[str] = None
    declined_reason: Optional[str] = None
    alternative_time: Optional[str] = None

class Trip(BaseModel):
    minister_id: str
    minister_name: str
    title: str
    start_date: str
    end_date: str
    itinerary: List[ItineraryItem]
    share_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coordinators: List[str] = []
    drivers: List[str] = []
    public_view_enabled: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UpdateItemStatus(BaseModel):
    status: str
    confirmed_by: Optional[str] = None
    declined_reason: Optional[str] = None
    alternative_time: Optional[str] = None

active_connections = {}

@router.post("/trips")
async def create_trip(trip: Trip, current_user: dict = Depends(get_current_user)):
    trip_dict = trip.dict()
    trip_dict["minister_id"] = current_user["_id"]
    trip_dict["minister_name"] = current_user.get("name", "Unknown")
    trip_dict["coordinators"] = [current_user["_id"]]
    result = await db.trips.insert_one(trip_dict)
    trip_dict["_id"] = str(result.inserted_id)
    return {"success": True, "trip": trip_dict}

@router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(trip_id):
        raise HTTPException(status_code=400, detail="Invalid trip ID")
    trip = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip["_id"] = str(trip["_id"])
    return trip

@router.get("/trips")
async def list_trips(current_user: dict = Depends(get_current_user)):
    cursor = db.trips.find({
        "$or": [
            {"minister_id": current_user["_id"]},
            {"coordinators": current_user["_id"]}
        ]
    }).sort("created_at", -1)
    trips = await cursor.to_list(length=100)
    for trip in trips:
        trip["_id"] = str(trip["_id"])
    return {"trips": trips}

@router.put("/trips/{trip_id}")
async def update_trip(trip_id: str, trip: Trip, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(trip_id):
        raise HTTPException(status_code=400, detail="Invalid trip ID")
    existing = await db.trips.find_one({"_id": ObjectId(trip_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Trip not found")
    if current_user["_id"] not in existing.get("coordinators", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    trip_dict = trip.dict(exclude={"share_token", "created_at"})
    trip_dict["updated_at"] = datetime.utcnow().isoformat()
    await db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": trip_dict})
    return {"success": True}

@router.get("/{share_token}/live")
async def get_live_itinerary(share_token: str, current_user: Optional[dict] = Depends(optional_current_user)):
    trip = await db.trips.find_one({"share_token": share_token})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip["_id"] = str(trip["_id"])
    share_level = determine_share_level(trip, current_user)
    filtered_trip = filter_trip_by_share_level(trip, share_level, current_user)
    
    viewer_count = len(active_connections.get(share_token, []))
    return {
        "trip": filtered_trip,
        "share_level": share_level,
        "viewer_count": viewer_count
    }

@router.get("/{share_token}/stream")
async def stream_updates(share_token: str, current_user: Optional[dict] = Depends(optional_current_user)):
    trip = await db.trips.find_one({"share_token": share_token})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    share_level = determine_share_level(trip, current_user)
    viewer_id = str(uuid.uuid4())
    
    async def event_generator():
        queue = asyncio.Queue()
        if share_token not in active_connections:
            active_connections[share_token] = {}
        active_connections[share_token][viewer_id] = queue
        
        try:
            yield f"data: {json.dumps({'type': 'connected', 'viewer_id': viewer_id})}\n\n"
            
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            if share_token in active_connections and viewer_id in active_connections[share_token]:
                del active_connections[share_token][viewer_id]
                if not active_connections[share_token]:
                    del active_connections[share_token]
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.put("/{share_token}/items/{item_index}/status")
async def update_item_status(
    share_token: str,
    item_index: int,
    update: UpdateItemStatus,
    current_user: Optional[dict] = Depends(optional_current_user)
):
    trip = await db.trips.find_one({"share_token": share_token})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if item_index < 0 or item_index >= len(trip.get("itinerary", [])):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    share_level = determine_share_level(trip, current_user)
    if share_level not in ["coordinator", "minister", "host_church"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = trip["itinerary"][item_index]
    if share_level == "host_church" and current_user:
        church_id = current_user.get("church_id")
        if item.get("church_id") != church_id:
            raise HTTPException(status_code=403, detail="Can only update your own church")
    
    update_dict = {f"itinerary.{item_index}.status": update.status}
    if update.status == "confirmed":
        update_dict[f"itinerary.{item_index}.confirmed_by"] = current_user.get("name", "Unknown") if current_user else "Unknown"
        update_dict[f"itinerary.{item_index}.confirmed_at"] = datetime.utcnow().isoformat()
    if update.declined_reason:
        update_dict[f"itinerary.{item_index}.declined_reason"] = update.declined_reason
    if update.alternative_time:
        update_dict[f"itinerary.{item_index}.alternative_time"] = update.alternative_time
    
    await db.trips.update_one({"share_token": share_token}, {"$set": update_dict})
    
    updated_trip = await db.trips.find_one({"share_token": share_token})
    await broadcast_update(share_token, {
        "type": "status_update",
        "item_index": item_index,
        "item": updated_trip["itinerary"][item_index],
        "updater": current_user.get("name", "Unknown") if current_user else "Unknown"
    })
    
    return {"success": True}

async def broadcast_update(share_token: str, message: dict):
    if share_token not in active_connections:
        return
    for viewer_id, queue in active_connections[share_token].items():
        try:
            await queue.put(message)
        except:
            pass

def determine_share_level(trip: dict, current_user: Optional[dict]) -> str:
    if not current_user:
        return "public" if trip.get("public_view_enabled") else "none"
    
    user_id = current_user.get("_id")
    if user_id in trip.get("coordinators", []):
        return "coordinator"
    if user_id == trip.get("minister_id"):
        return "minister"
    if user_id in trip.get("drivers", []):
        return "driver"
    
    church_id = current_user.get("church_id")
    if church_id:
        for item in trip.get("itinerary", []):
            if item.get("church_id") == church_id:
                return "host_church"
    
    return "public" if trip.get("public_view_enabled") else "none"

def filter_trip_by_share_level(trip: dict, share_level: str, current_user: Optional[dict]) -> dict:
    if share_level == "none":
        raise HTTPException(status_code=403, detail="Not authorized to view this trip")
    
    if share_level in ["coordinator", "minister"]:
        return trip
    
    filtered = {k: v for k, v in trip.items() if k not in ["coordinators", "drivers"]}
    
    if share_level == "host_church":
        church_id = current_user.get("church_id") if current_user else None
        filtered_items = []
        for i, item in enumerate(trip.get("itinerary", [])):
            if item.get("church_id") == church_id:
                filtered_items.append(item)
            elif i > 0 and trip["itinerary"][i-1].get("church_id") == church_id:
                sanitized = {k: v for k, v in item.items() if k in ["datetime", "church_name", "event_type"]}
                filtered_items.append(sanitized)
            elif i < len(trip["itinerary"]) - 1 and trip["itinerary"][i+1].get("church_id") == church_id:
                sanitized = {k: v for k, v in item.items() if k in ["datetime", "church_name", "event_type"]}
                filtered_items.append(sanitized)
        filtered["itinerary"] = filtered_items
    
    elif share_level == "driver":
        filtered["itinerary"] = [
            {k: v for k, v in item.items() if k in ["datetime", "church_name", "duration_minutes"]}
            for item in trip.get("itinerary", [])
        ]
    
    elif share_level == "public":
        filtered["itinerary"] = [
            {k: v for k, v in item.items() if k in ["datetime", "church_name", "event_type", "status"]}
            for item in trip.get("itinerary", [])
        ]
    
    return filtered
