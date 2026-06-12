from fastapi import FastAPI, HTTPException, Body, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from datetime import datetime, timedelta
from typing import Optional, List
import os
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import email_service

MONGO_URI = os.getenv("MONGO_URI", "")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

if ENVIRONMENT == "dev":
    DB_NAME = "DEV-ChurchNavigator"
else:
    DB_NAME = "ChurchNavigator"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "https://dev.churchnavigator.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()
scheduler.start()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class VisitRequest(BaseModel):
    church_slug: str
    visit_date: str
    user_email: EmailStr

class MessageRequest(BaseModel):
    listing_type: str
    listing_slug: str
    sender_name: str
    sender_email: EmailStr
    message: str

class SpaceEnquiryRequest(BaseModel):
    church_slug: str
    space_name: str
    enquirer_name: str
    enquirer_email: EmailStr
    enquirer_phone: str
    message: str

@app.get("/")
def read_root():
    return {"status": "ChurchNavigator API Running", "environment": ENVIRONMENT, "database": DB_NAME}

@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    existing = db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = pwd_context.hash(req.password)
    user = {
        "email": req.email,
        "password": hashed,
        "name": req.name,
        "created_at": datetime.utcnow(),
        "followed_listings": []
    }
    db.users.insert_one(user)
    
    email_service.send_welcome(req.email, req.name)
    
    return {"message": "User registered successfully"}

@app.post("/api/visits")
def register_visit(req: VisitRequest):
    church = db.churches.find_one({"slug": req.church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    user = db.users.find_one({"email": req.user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    visit = {
        "church_slug": req.church_slug,
        "user_email": req.user_email,
        "visit_date": req.visit_date,
        "registered_at": datetime.utcnow()
    }
    db.visits.insert_one(visit)
    
    email_service.send_visit_confirmed(
        req.user_email,
        user["name"],
        church["name"],
        req.church_slug,
        req.visit_date
    )
    
    return {"message": "Visit registered successfully"}

@app.post("/api/messages")
def send_message(req: MessageRequest):
    if req.listing_type == "church":
        listing = db.churches.find_one({"slug": req.listing_slug})
    elif req.listing_type == "worship_leader":
        listing = db.worship_leaders.find_one({"slug": req.listing_slug})
    elif req.listing_type == "media_team":
        listing = db.media_teams.find_one({"slug": req.listing_slug})
    else:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    message = {
        "listing_type": req.listing_type,
        "listing_slug": req.listing_slug,
        "sender_name": req.sender_name,
        "sender_email": req.sender_email,
        "message": req.message,
        "sent_at": datetime.utcnow(),
        "read": False
    }
    db.messages.insert_one(message)
    
    listing_url = f"https://churchnavigator.com/{req.listing_type}/{req.listing_slug}"
    email_service.send_message_notification(
        listing.get("email", listing.get("contact_email", "")),
        listing.get("name", ""),
        req.sender_name,
        req.listing_type,
        listing["name"],
        req.message,
        listing_url
    )
    
    return {"message": "Message sent successfully"}

@app.post("/api/spaces/enquire")
def space_enquiry(req: SpaceEnquiryRequest):
    church = db.churches.find_one({"slug": req.church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    enquiry = {
        "church_slug": req.church_slug,
        "space_name": req.space_name,
        "enquirer_name": req.enquirer_name,
        "enquirer_email": req.enquirer_email,
        "enquirer_phone": req.enquirer_phone,
        "message": req.message,
        "enquired_at": datetime.utcnow()
    }
    db.space_enquiries.insert_one(enquiry)
    
    space_url = f"https://churchnavigator.com/church/{req.church_slug}#spaces"
    email_service.send_space_enquiry(
        church.get("email", ""),
        church["name"],
        req.enquirer_name,
        req.enquirer_email,
        req.enquirer_phone,
        req.space_name,
        req.message,
        space_url
    )
    
    return {"message": "Enquiry sent successfully"}

def send_event_reminders_job():
    tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
    events = db.events.find({"date": tomorrow})
    
    for event in events:
        registrations = db.event_registrations.find({"event_id": str(event["_id"])})
        for reg in registrations:
            user = db.users.find_one({"email": reg["user_email"]})
            if user:
                event_url = f"https://churchnavigator.com/events/{event['slug']}"
                email_service.send_event_reminder(
                    user["email"],
                    user["name"],
                    event["name"],
                    event["date"],
                    event.get("time", "TBC"),
                    event.get("location", "See event page"),
                    event_url
                )

def send_weekly_digest_job():
    users = db.users.find({"followed_listings": {"$exists": True, "$ne": []}})
    
    for user in users:
        updates = []
        for followed in user.get("followed_listings", []):
            listing_type = followed["type"]
            listing_slug = followed["slug"]
            
            if listing_type == "church":
                listing = db.churches.find_one({"slug": listing_slug})
            elif listing_type == "worship_leader":
                listing = db.worship_leaders.find_one({"slug": listing_slug})
            elif listing_type == "media_team":
                listing = db.media_teams.find_one({"slug": listing_slug})
            else:
                continue
            
            if listing:
                updates.append({
                    "name": listing["name"],
                    "type": listing_type.replace("_", " ").title(),
                    "summary": f"Check out the latest updates from {listing['name']}",
                    "url": f"https://churchnavigator.com/{listing_type}/{listing_slug}"
                })
        
        if updates:
            email_service.send_weekly_digest(user["email"], user["name"], updates)

scheduler.add_job(send_event_reminders_job, CronTrigger(hour=9, minute=0))
scheduler.add_job(send_weekly_digest_job, CronTrigger(day_of_week="mon", hour=8, minute=0))

@app.get("/api/churches")
def get_churches(
    search: Optional[str] = Query(None),
    denomination: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    if denomination:
        query["denomination"] = denomination
    if county:
        query["county"] = county
    
    churches = list(db.churches.find(query, {"_id": 0}).limit(limit))
    return {"churches": churches}

@app.get("/api/churches/{slug}")
def get_church(slug: str):
    church = db.churches.find_one({"slug": slug}, {"_id": 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    return church

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    client.close()