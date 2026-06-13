from fastapi import FastAPI, HTTPException, Depends, Request, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient
import anthropic
from passlib.context import CryptContext
import jwt
from slugify import slugify
import qrcode
from io import BytesIO
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from ics import Calendar, Event as ICSEvent
import resend
import secrets

from routers import planner_router, tools_router, analytics_router, search_router, events_router

app = FastAPI(title="ChurchNavigator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "https://churchnavigator.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable not set")

client = AsyncIOMotorClient(MONGODB_URI)
db_name = "ChurchNavigator" if os.getenv("ENVIRONMENT") == "production" else "DEV-ChurchNavigator"
db = client[db_name]

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if ANTHROPIC_API_KEY:
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    anthropic_client = None

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")

app.include_router(planner_router, prefix="/api/planner", tags=["planner"])
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(search_router, prefix="/api/search", tags=["search"])
app.include_router(events_router, prefix="/api/events", tags=["events"])

@app.get("/")
async def root():
    return {"status": "ok", "service": "ChurchNavigator API", "version": "2.0.0", "database": db_name}

@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

class ListingCreate(BaseModel):
    name: str
    description: Optional[str] = None
    denomination: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    website: Optional[HttpUrl] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    open_to_visits: Optional[bool] = False
    capacity: Optional[int] = None
    founded_year: Optional[int] = None

class VisitorCheckIn(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    source: str = "walk_in"
    notes: Optional[str] = None

@app.post("/api/churches")
async def create_church(listing: ListingCreate):
    slug = slugify(listing.name)
    existing = await db.churches.find_one({"slug": slug})
    if existing:
        counter = 1
        while await db.churches.find_one({"slug": f"{slug}-{counter}"}):
            counter += 1
        slug = f"{slug}-{counter}"
    
    church_data = listing.dict()
    church_data["slug"] = slug
    church_data["created_at"] = datetime.utcnow()
    church_data["listing_type"] = "church"
    
    if listing.latitude and listing.longitude:
        church_data["location"] = {"type": "Point", "coordinates": [listing.longitude, listing.latitude]}
    
    result = await db.churches.insert_one(church_data)
    church_data["_id"] = str(result.inserted_id)
    return {"success": True, "slug": slug, "church": church_data}

@app.get("/api/churches/{slug}")
async def get_church(slug: str):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church["_id"] = str(church["_id"])
    return church

@app.post("/api/churches/{slug}/visit")
async def check_in_visitor(slug: str, visitor: VisitorCheckIn):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church_id = str(church["_id"])
    existing_visitor = await db.visitors.find_one({"email": visitor.email, "church_id": church_id})
    
    if existing_visitor:
        total_visits = existing_visitor.get("total_visits", 0) + 1
        journey_stage = "returning" if total_visits == 2 else "engaged" if total_visits >= 3 else "first_visit"
        
        await db.visitors.update_one(
            {"_id": existing_visitor["_id"]},
            {"$set": {"last_visit_date": datetime.utcnow(), "total_visits": total_visits, "journey_stage": journey_stage}}
        )
        return {"success": True, "visitor_id": str(existing_visitor["_id"]), "total_visits": total_visits, "journey_stage": journey_stage}
    else:
        visitor_data = visitor.dict()
        visitor_data["church_id"] = church_id
        visitor_data["visit_date"] = datetime.utcnow()
        visitor_data["last_visit_date"] = datetime.utcnow()
        visitor_data["total_visits"] = 1
        visitor_data["journey_stage"] = "first_visit"
        
        result = await db.visitors.insert_one(visitor_data)
        return {"success": True, "visitor_id": str(result.inserted_id), "total_visits": 1, "journey_stage": "first_visit"}

@app.get("/api/visitors/export")
async def export_visitors_csv(church_id: Optional[str] = None):
    query = {"church_id": church_id} if church_id else {}
    visitors = await db.visitors.find(query).to_list(length=10000)
    
    csv_lines = ["Email,Name,Phone,Source,Journey Stage,Total Visits,First Visit,Last Visit"]
    for v in visitors:
        csv_lines.append(f"{v.get('email','')},{v.get('name','')},{v.get('phone','')},{v.get('source','')},{v.get('journey_stage','')},{v.get('total_visits',0)},{v.get('visit_date','').isoformat() if v.get('visit_date') else ''},{v.get('last_visit_date','').isoformat() if v.get('last_visit_date') else ''}")
    
    csv_content = "\n".join(csv_lines)
    return StreamingResponse(iter([csv_content]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=visitors.csv"})

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    message = body.get("message", "")
    listing_type = body.get("listing_type", "church")
    listing_slug = body.get("listing_slug", "")
    
    if not anthropic_client:
        return {"response": "I'm currently offline. Please contact us directly.", "fallback": True}
    
    try:
        response = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": f"You are a helpful assistant for a {listing_type}. Answer this question concisely: {message}"}]
        )
        return {"response": response.content[0].text, "fallback": False}
    except Exception as e:
        return {"response": "I'm having trouble connecting right now. Please try again later.", "fallback": True, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
