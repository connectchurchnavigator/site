from fastapi import FastAPI, HTTPException, Query, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, List
from datetime import datetime
import os
from models import Church, SpaceEnquiry
from bson import ObjectId
import resend

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
churches_collection = db["churches"]

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0", "environment": DB_NAME}

@app.get("/api/churches")
async def get_churches(
    city: Optional[str] = None,
    denomination: Optional[str] = None,
    limit: int = Query(100, le=1000),
    skip: int = 0
):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    
    cursor = churches_collection.find(query).skip(skip).limit(limit)
    churches = await cursor.to_list(length=limit)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return {"churches": churches, "count": len(churches)}

@app.get("/api/churches/{church_id}")
async def get_church(church_id: str):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await churches_collection.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["_id"] = str(church["_id"])
    return church

@app.get("/api/spaces/available")
async def get_available_spaces(
    city: Optional[str] = None,
    capacity: Optional[int] = None,
    day: Optional[str] = None,
    price_max: Optional[float] = None,
    suitable_for: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    query = {"space_rental.enabled": True}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if capacity:
        query["space_rental.capacity"] = {"$gte": capacity}
    if day:
        query["space_rental.available_days"] = day
    if price_max:
        query["$or"] = [
            {"space_rental.price_per_hour": {"$lte": price_max}},
            {"space_rental.price_per_day": {"$lte": price_max * 8}}
        ]
    if suitable_for:
        query["space_rental.suitable_for"] = {"$regex": suitable_for, "$options": "i"}
    
    cursor = churches_collection.find(query).skip(skip).limit(limit)
    spaces = await cursor.to_list(length=limit)
    
    for space in spaces:
        space["_id"] = str(space["_id"])
    
    return {"spaces": spaces, "count": len(spaces)}

@app.get("/api/spaces/needed")
async def get_spaces_needed(
    city: Optional[str] = None,
    capacity: Optional[int] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    query = {"space_needed.enabled": True}
    
    if city:
        query["$or"] = [
            {"city": {"$regex": city, "$options": "i"}},
            {"space_needed.preferred_location": {"$regex": city, "$options": "i"}}
        ]
    if capacity:
        query["space_needed.required_capacity"] = {"$lte": capacity}
    
    cursor = churches_collection.find(query).skip(skip).limit(limit)
    needed = await cursor.to_list(length=limit)
    
    for item in needed:
        item["_id"] = str(item["_id"])
    
    return {"spaces_needed": needed, "count": len(needed)}

@app.post("/api/spaces/enquire/{church_id}")
async def send_space_enquiry(church_id: str, enquiry: SpaceEnquiry):
    if not ObjectId.is_valid(church_id):
        raise HTTPException(status_code=400, detail="Invalid church ID")
    
    church = await churches_collection.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if not church.get("space_rental", {}).get("enabled"):
        raise HTTPException(status_code=400, detail="This church does not have space rental enabled")
    
    contact_email = church.get("space_rental", {}).get("contact_email") or church.get("email")
    if not contact_email:
        raise HTTPException(status_code=400, detail="No contact email available for this church")
    
    space_name = church.get("space_rental", {}).get("space_name", "Church Space")
    church_name = church.get("name", "Church")
    
    email_body = f"""
    <h2>New Space Rental Enquiry</h2>
    <p>You have received a new enquiry about your space rental: <strong>{space_name}</strong></p>
    
    <h3>Enquiry Details:</h3>
    <p><strong>Name:</strong> {enquiry.name}</p>
    <p><strong>Email:</strong> {enquiry.email}</p>
    {f'<p><strong>Phone:</strong> {enquiry.phone}</p>' if enquiry.phone else ''}
    {f'<p><strong>Capacity Needed:</strong> {enquiry.capacity_needed} people</p>' if enquiry.capacity_needed else ''}
    {f'<p><strong>Preferred Dates:</strong> {enquiry.preferred_dates}</p>' if enquiry.preferred_dates else ''}
    
    <h3>Message:</h3>
    <p>{enquiry.message}</p>
    
    <hr>
    <p style="color: #666; font-size: 12px;">This enquiry was sent via ChurchNavigator.com</p>
    """
    
    try:
        if RESEND_API_KEY:
            resend.Emails.send({
                "from": "ChurchNavigator <noreply@churchnavigator.com>",
                "to": contact_email,
                "reply_to": enquiry.email,
                "subject": f"Space Rental Enquiry - {church_name}",
                "html": email_body
            })
        
        enquiry_record = {
            "church_id": church_id,
            "enquiry_type": "space_rental",
            "name": enquiry.name,
            "email": enquiry.email,
            "phone": enquiry.phone,
            "message": enquiry.message,
            "preferred_dates": enquiry.preferred_dates,
            "capacity_needed": enquiry.capacity_needed,
            "created_at": datetime.utcnow()
        }
        await db["enquiries"].insert_one(enquiry_record)
        
        return {"success": True, "message": "Enquiry sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send enquiry: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)