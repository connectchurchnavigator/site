from fastapi import FastAPI, HTTPException, Depends, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
import os
import jwt
import qrcode
from io import BytesIO
import uuid
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://churchnavigator.com", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

client = MongoClient(MONGO_URI)
db = client.get_database()
churches_collection = db["churches"]
visitors_collection = db["visitors"]

security = HTTPBearer()

class VisitorRegistration(BaseModel):
    church_id: str
    church_slug: str
    church_name: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    how_did_you_hear: str
    first_time_visitor: bool
    would_like_followup: bool = False
    prayer_request: Optional[str] = None
    notes: Optional[str] = None
    checked_in_via: str = "Online Form"

class VisitorCheckIn(BaseModel):
    church_slug: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    first_time_visitor: bool

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_church_owner(church_slug: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials)
    user_id = payload.get("user_id")
    church = churches_collection.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    if str(church.get("owner_id")) != str(user_id):
        raise HTTPException(status_code=403, detail="Not authorized to access this church's data")
    return church

@app.get("/")
def read_root():
    return {"message": "ChurchNavigator API", "status": "running"}

@app.post("/api/visitors/register")
def register_visitor(visitor: VisitorRegistration):
    try:
        church = churches_collection.find_one({"slug": visitor.church_slug})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        visitor_doc = {
            "id": str(uuid.uuid4()),
            "church_id": visitor.church_id,
            "church_slug": visitor.church_slug,
            "church_name": visitor.church_name,
            "first_name": visitor.first_name,
            "last_name": visitor.last_name,
            "email": visitor.email,
            "phone": visitor.phone,
            "visit_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "visit_time": datetime.utcnow().strftime("%H:%M:%S"),
            "how_did_you_hear": visitor.how_did_you_hear,
            "first_time_visitor": visitor.first_time_visitor,
            "would_like_followup": visitor.would_like_followup,
            "prayer_request": visitor.prayer_request,
            "notes": visitor.notes,
            "checked_in_via": visitor.checked_in_via,
            "created_at": datetime.utcnow()
        }
        
        result = visitors_collection.insert_one(visitor_doc)
        visitor_doc["_id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "message": "Visitor registered successfully",
            "visitor_id": visitor_doc["id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visitors/{church_slug}")
def get_church_visitors(church_slug: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    church = verify_church_owner(church_slug, credentials)
    
    visitors = list(visitors_collection.find(
        {"church_slug": church_slug}
    ).sort("created_at", DESCENDING))
    
    for visitor in visitors:
        visitor["_id"] = str(visitor["_id"])
    
    return {
        "success": True,
        "church_name": church.get("name"),
        "total_visitors": len(visitors),
        "visitors": visitors
    }

@app.get("/api/visitors/{church_slug}/stats")
def get_visitor_stats(church_slug: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    church = verify_church_owner(church_slug, credentials)
    
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    total_visitors = visitors_collection.count_documents({"church_slug": church_slug})
    
    week_visitors = visitors_collection.count_documents({
        "church_slug": church_slug,
        "created_at": {"$gte": week_ago}
    })
    
    month_visitors = visitors_collection.count_documents({
        "church_slug": church_slug,
        "created_at": {"$gte": month_ago}
    })
    
    first_time_visitors = visitors_collection.count_documents({
        "church_slug": church_slug,
        "first_time_visitor": True
    })
    
    returning_visitors = total_visitors - first_time_visitors
    
    followup_requests = visitors_collection.count_documents({
        "church_slug": church_slug,
        "would_like_followup": True
    })
    
    prayer_requests = visitors_collection.count_documents({
        "church_slug": church_slug,
        "prayer_request": {"$ne": None, "$ne": ""}
    })
    
    all_visitors = list(visitors_collection.find(
        {"church_slug": church_slug}
    ).sort("created_at", DESCENDING))
    
    source_breakdown = defaultdict(int)
    for v in all_visitors:
        source = v.get("how_did_you_hear", "Unknown")
        source_breakdown[source] += 1
    
    checkin_method = defaultdict(int)
    for v in all_visitors:
        method = v.get("checked_in_via", "Unknown")
        checkin_method[method] += 1
    
    weekly_trend = []
    for i in range(4):
        week_start = now - timedelta(days=(i+1)*7)
        week_end = now - timedelta(days=i*7)
        count = visitors_collection.count_documents({
            "church_slug": church_slug,
            "created_at": {"$gte": week_start, "$lt": week_end}
        })
        weekly_trend.insert(0, {
            "week": f"Week {4-i}",
            "count": count
        })
    
    return {
        "success": True,
        "stats": {
            "total_visitors": total_visitors,
            "this_week": week_visitors,
            "this_month": month_visitors,
            "first_time_visitors": first_time_visitors,
            "returning_visitors": returning_visitors,
            "followup_requests": followup_requests,
            "prayer_requests": prayer_requests,
            "source_breakdown": dict(source_breakdown),
            "checkin_method": dict(checkin_method),
            "weekly_trend": weekly_trend
        }
    }

@app.get("/api/qr/{church_slug}")
def generate_qr_code(church_slug: str):
    church = churches_collection.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    qr_url = f"https://churchnavigator.com/church/{church_slug}/visit"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return Response(content=buffer.getvalue(), media_type="image/png")

@app.post("/api/visitors/checkin")
def visitor_checkin(checkin: VisitorCheckIn):
    try:
        church = churches_collection.find_one({"slug": checkin.church_slug})
        if not church:
            raise HTTPException(status_code=404, detail="Church not found")
        
        visitor_doc = {
            "id": str(uuid.uuid4()),
            "church_id": str(church["_id"]),
            "church_slug": checkin.church_slug,
            "church_name": church.get("name", ""),
            "first_name": checkin.first_name,
            "last_name": checkin.last_name,
            "email": checkin.email,
            "phone": checkin.phone,
            "visit_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "visit_time": datetime.utcnow().strftime("%H:%M:%S"),
            "how_did_you_hear": "QR Code",
            "first_time_visitor": checkin.first_time_visitor,
            "would_like_followup": False,
            "prayer_request": None,
            "notes": None,
            "checked_in_via": "QR",
            "created_at": datetime.utcnow()
        }
        
        result = visitors_collection.insert_one(visitor_doc)
        visitor_doc["_id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "message": "Check-in successful",
            "visitor_id": visitor_doc["id"],
            "church_name": church.get("name")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/churches")
def get_churches():
    churches = list(churches_collection.find().limit(100))
    for church in churches:
        church["_id"] = str(church["_id"])
    return {"churches": churches}

@app.get("/api/churches/{slug}")
def get_church(slug: str):
    church = churches_collection.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["_id"] = str(church["_id"])
    return church