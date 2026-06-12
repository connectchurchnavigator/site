from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import os
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import re
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

client = MongoClient(MONGO_URI)
db_name = "ChurchNavigator" if ENVIRONMENT == "production" else "DEV-ChurchNavigator"
db = client[db_name]
churches_collection = db["churches"]
visits_collection = db["visits"]
enquiries_collection = db["enquiries"]

class ChatMessage(BaseModel):
    message: str
    church_id: Optional[str] = None
    conversation_history: Optional[List[dict]] = []

class SpaceEnquiry(BaseModel):
    church_id: str
    name: str
    email: EmailStr
    phone: str
    preferred_dates: str
    number_of_people: int
    message: Optional[str] = ""

class WorkerApplication(BaseModel):
    church_id: str
    role_type: str
    name: str
    email: EmailStr
    phone: str
    experience: str
    availability: str
    message: Optional[str] = ""

class EventSubmission(BaseModel):
    church_id: str
    title: str
    date: str
    time: str
    description: str
    contact_email: EmailStr
    is_recurring: bool = False

def serialize_doc(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    return doc

def extract_location_from_query(query: str) -> Optional[str]:
    query_lower = query.lower()
    uk_cities = ["london", "barking", "ilford", "east london", "dagenham", "romford", 
                 "stratford", "newham", "tower hamlets", "hackney", "redbridge",
                 "manchester", "birmingham", "leeds", "liverpool", "bristol"]
    for city in uk_cities:
        if city in query_lower:
            return city.title()
    return None

def extract_capacity_from_query(query: str) -> Optional[int]:
    numbers = re.findall(r'\b(\d+)\s*(?:people|persons|capacity)?', query.lower())
    if numbers:
        return int(numbers[0])
    return None

def extract_day_from_query(query: str) -> Optional[str]:
    query_lower = query.lower()
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for day in days:
        if day in query_lower:
            return day.capitalize()
    if "weekend" in query_lower:
        return "weekend"
    if "weekday" in query_lower:
        return "weekday"
    return None

def extract_price_limit_from_query(query: str) -> Optional[int]:
    price_match = re.search(r'under\s*£?(\d+)', query.lower())
    if price_match:
        return int(price_match.group(1))
    affordable = ["cheap", "affordable", "budget", "low cost"]
    if any(word in query.lower() for word in affordable):
        return 50
    return None

def is_space_query(query: str) -> bool:
    space_keywords = [
        "rent", "lease", "hire", "space", "hall", "venue", 
        "looking for church", "need a space", "church to rent",
        "available hall", "sunday space", "where can i rent",
        "church venue", "church plant", "hire a church"
    ]
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in space_keywords)

@app.get("/api/search/ai")
async def ai_search(query: str = Query(...)):
    try:
        search_type = "spaces" if is_space_query(query) else "churches"
        
        if search_type == "spaces":
            filter_query = {"space_rental.enabled": True}
            
            location = extract_location_from_query(query)
            if location:
                filter_query["$or"] = [
                    {"city": {"$regex": location, "$options": "i"}},
                    {"area": {"$regex": location, "$options": "i"}}
                ]
            
            capacity = extract_capacity_from_query(query)
            if capacity:
                filter_query["space_rental.capacity"] = {"$gte": capacity}
            
            day = extract_day_from_query(query)
            if day:
                if day == "weekend":
                    filter_query["space_rental.available_days"] = {"$in": ["Saturday", "Sunday"]}
                elif day == "weekday":
                    filter_query["space_rental.available_days"] = {
                        "$in": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                    }
                else:
                    filter_query["space_rental.available_days"] = day
            
            price_limit = extract_price_limit_from_query(query)
            if price_limit:
                filter_query["space_rental.price_per_hour"] = {"$lte": price_limit}
            
            results = list(churches_collection.find(filter_query).limit(20))
            
            return {
                "query": query,
                "search_type": "spaces",
                "filters_detected": {
                    "location": location,
                    "capacity": capacity,
                    "day": day,
                    "price_limit": price_limit
                },
                "results": [{
                    "id": str(r["_id"]),
                    "name": r.get("name"),
                    "city": r.get("city"),
                    "area": r.get("area"),
                    "logo_url": r.get("logo_url"),
                    "space": {
                        "name": r.get("space_rental", {}).get("space_name"),
                        "capacity": r.get("space_rental", {}).get("capacity"),
                        "price_per_hour": r.get("space_rental", {}).get("price_per_hour"),
                        "price_per_day": r.get("space_rental", {}).get("price_per_day"),
                        "available_days": r.get("space_rental", {}).get("available_days", []),
                        "available_times": r.get("space_rental", {}).get("available_times"),
                        "facilities": r.get("space_rental", {}).get("facilities_included", [])
                    },
                    "slug": r.get("slug")
                } for r in results],
                "total": len(results)
            }
        else:
            location = extract_location_from_query(query)
            filter_query = {}
            if location:
                filter_query["$or"] = [
                    {"city": {"$regex": location, "$options": "i"}},
                    {"area": {"$regex": location, "$options": "i"}}
                ]
            
            results = list(churches_collection.find(filter_query).limit(20))
            
            return {
                "query": query,
                "search_type": "churches",
                "results": [serialize_doc(r) for r in results],
                "total": len(results)
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/ai")
async def ai_chat(data: ChatMessage):
    try:
        query = data.message.lower()
        church_id = data.church_id
        
        if church_id:
            church = churches_collection.find_one({"_id": ObjectId(church_id)})
            if not church:
                return {"response": "Sorry, I couldn't find that church."}
            
            has_space = church.get("space_rental", {}).get("enabled", False)
            
            if has_space:
                space = church.get("space_rental", {})
                
                if any(word in query for word in ["rent", "hire", "space", "hall", "venue"]):
                    if "how much" in query or "price" in query or "cost" in query:
                        return {
                            "response": f"Our {space.get('space_name', 'space')} costs £{space.get('price_per_hour', 0)}/hour or £{space.get('price_per_day', 0)}/day. It can accommodate up to {space.get('capacity', 0)} people. Would you like to enquire about booking?"
                        }
                    
                    if "available" in query or "when" in query:
                        days = ", ".join(space.get("available_days", []))
                        times = space.get("available_times", "Please enquire for specific times")
                        return {
                            "response": f"Our space is available on: {days}. Times: {times}. Would you like to send an enquiry?"
                        }
                    
                    if "capacity" in query or "how many" in query or "fit" in query:
                        return {
                            "response": f"Our {space.get('space_name', 'space')} can accommodate up to {space.get('capacity', 0)} people. It includes: {', '.join(space.get('facilities_included', []))}. Would you like more details?"
                        }
                    
                    if "facilities" in query or "equipment" in query or "included" in query:
                        facilities = space.get("facilities_included", [])
                        return {
                            "response": f"Our space includes: {', '.join(facilities)}. Price: £{space.get('price_per_hour', 0)}/hour. Interested in booking?"
                        }
                    
                    if "book" in query or "enquire" in query or "reserve" in query:
                        return {
                            "response": f"Great! To enquire about booking our {space.get('space_name', 'space')}, please use the 'Enquire Now' form on this page or contact us at {church.get('email', 'the contact details above')}. We'll get back to you within 24 hours!",
                            "action": "show_enquiry_form"
                        }
                    
                    return {
                        "response": f"Yes! We have our {space.get('space_name', 'space')} available for hire. Capacity: {space.get('capacity', 0)} people | Price: £{space.get('price_per_hour', 0)}/hour or £{space.get('price_per_day', 0)}/day | Available: {', '.join(space.get('available_days', []))} | Facilities: {', '.join(space.get('facilities_included', [])[:3])}. Would you like to enquire?"
                    }
        
        else:
            if is_space_query(query):
                location = extract_location_from_query(query)
                capacity = extract_capacity_from_query(query)
                
                filter_query = {"space_rental.enabled": True}
                if location:
                    filter_query["$or"] = [
                        {"city": {"$regex": location, "$options": "i"}},
                        {"area": {"$regex": location, "$options": "i"}}
                    ]
                if capacity:
                    filter_query["space_rental.capacity"] = {"$gte": capacity}
                
                results = list(churches_collection.find(filter_query).limit(3))
                
                if results:
                    response_parts = [f"I found {len(results)} churches with available spaces"]
                    if location:
                        response_parts.append(f"near {location}")
                    response_parts.append(":\n\n")
                    
                    for r in results:
                        space = r.get("space_rental", {})
                        response_parts.append(
                            f"🏛️ {r.get('name')} — {r.get('city')}\n"
                            f"{space.get('space_name', 'Space')}: {space.get('capacity', 0)} people · £{space.get('price_per_hour', 0)}/hour\n"
                            f"Available: {', '.join(space.get('available_days', [])[:3])}\n"
                            f"→ churchnavigator.com/church/{r.get('slug')}\n\n"
                        )
                    
                    response_parts.append("Would you like me to help you send an enquiry to any of these churches?")
                    
                    return {
                        "response": "".join(response_parts),
                        "results": [{
                            "id": str(r["_id"]),
                            "name": r.get("name"),
                            "slug": r.get("slug")
                        } for r in results]
                    }
                else:
                    return {
                        "response": "I couldn't find any churches with available spaces matching your criteria. Try broadening your search or contact us directly for help finding the perfect space!"
                    }
        
        return {
            "response": "I'm here to help you find churches and available spaces! You can ask me about church services, locations, or space rental. What would you like to know?"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/spaces/enquire")
async def space_enquiry(enquiry: SpaceEnquiry):
    try:
        church = churches_collection.find_one({"_id": ObjectId(enquiry.church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        enquiry_doc = {
            "church_id": enquiry.church_id,
            "church_name": church.get("name"),
            "type": "space_rental",
            "name": enquiry.name,
            "email": enquiry.email,
            "phone": enquiry.phone,
            "preferred_dates": enquiry.preferred_dates,
            "number_of_people": enquiry.number_of_people,
            "message": enquiry.message,
            "status": "pending",
            "created_at": datetime.utcnow()
        }
        
        result = enquiries_collection.insert_one(enquiry_doc)
        
        return {
            "success": True,
            "message": f"Your enquiry has been sent to {church.get('name')}. They will contact you at {enquiry.email} within 24 hours.",
            "enquiry_id": str(result.inserted_id)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/spaces/available")
async def get_available_spaces(
    city: Optional[str] = None,
    capacity: Optional[int] = None,
    day: Optional[str] = None,
    max_price: Optional[int] = None
):
    try:
        filter_query = {"space_rental.enabled": True}
        
        if city:
            filter_query["$or"] = [
                {"city": {"$regex": city, "$options": "i"}},
                {"area": {"$regex": city, "$options": "i"}}
            ]
        
        if capacity:
            filter_query["space_rental.capacity"] = {"$gte": capacity}
        
        if day:
            filter_query["space_rental.available_days"] = day
        
        if max_price:
            filter_query["space_rental.price_per_hour"] = {"$lte": max_price}
        
        results = list(churches_collection.find(filter_query))
        
        return {
            "spaces": [{
                "id": str(r["_id"]),
                "church_name": r.get("name"),
                "city": r.get("city"),
                "area": r.get("area"),
                "logo_url": r.get("logo_url"),
                "slug": r.get("slug"),
                "space": r.get("space_rental", {})
            } for r in results],
            "total": len(results)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/churches")
async def get_churches(skip: int = 0, limit: int = 20):
    try:
        churches = list(churches_collection.find().skip(skip).limit(limit))
        total = churches_collection.count_documents({})
        return {
            "churches": [serialize_doc(church) for church in churches],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/churches/{church_id}")
async def get_church(church_id: str):
    try:
        church = churches_collection.find_one({"_id": ObjectId(church_id)})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        return serialize_doc(church)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/churches/slug/{slug}")
async def get_church_by_slug(slug: str):
    try:
        church = churches_collection.find_one({"slug": slug})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        return serialize_doc(church)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/visits/track")
async def track_visit(request: Request):
    try:
        data = await request.json()
        visit_doc = {
            "church_id": data.get("church_id"),
            "source": data.get("source", "web"),
            "timestamp": datetime.utcnow(),
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.client.host
        }
        visits_collection.insert_one(visit_doc)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "environment": ENVIRONMENT, "database": db_name}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)