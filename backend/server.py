from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv
import uuid
import re
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "DEV-ChurchNavigator")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def generate_slug(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

class ChurchBase(BaseModel):
    name: str
    slug: str
    city: str
    state: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl] = None
    denomination: Optional[str] = None
    service_times: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = []
    pastor_name: Optional[str] = None
    founded_year: Optional[int] = None
    capacity: Optional[int] = None
    ministries: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    facilities: Optional[List[str]] = []
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    is_verified: bool = False
    is_featured: bool = False
    status: str = "draft"

class ChurchCreate(ChurchBase):
    pass

class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl] = None
    denomination: Optional[str] = None
    service_times: Optional[str] = None
    description: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    pastor_name: Optional[str] = None
    founded_year: Optional[int] = None
    capacity: Optional[int] = None
    ministries: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    facilities: Optional[List[str]] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    status: Optional[str] = None

class MediaTeamBase(BaseModel):
    name: str
    slug: str
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = []
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl] = None
    city: str
    state: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    services: List[str] = []
    equipment: Optional[List[str]] = []
    team_size: Optional[str] = None
    availability: Optional[str] = None
    pricing_from: Optional[float] = None
    portfolio_url: Optional[HttpUrl] = None
    social_facebook: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    church_associated_to: Optional[str] = None
    is_verified: bool = False
    is_featured: bool = False
    status: str = "draft"

class MediaTeamCreate(MediaTeamBase):
    pass

class MediaTeamUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[HttpUrl] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    services: Optional[List[str]] = None
    equipment: Optional[List[str]] = None
    team_size: Optional[str] = None
    availability: Optional[str] = None
    pricing_from: Optional[float] = None
    portfolio_url: Optional[HttpUrl] = None
    social_facebook: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    church_associated_to: Optional[str] = None
    status: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0", "database": DATABASE_NAME}

@app.get("/api/churches")
async def get_churches(
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    denomination: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0
):
    query = {"status": "published", "trashed_at": None}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    churches = await db.churches.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.churches.count_documents(query)
    
    for church in churches:
        church["id"] = str(church["_id"])
        del church["_id"]
    
    return {"churches": churches, "total": total, "limit": limit, "skip": skip}

@app.get("/api/churches/{slug}")
async def get_church(slug: str):
    church = await db.churches.find_one({"slug": slug, "status": "published", "trashed_at": None})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church["id"] = str(church["_id"])
    del church["_id"]
    return church

@app.post("/api/churches")
async def create_church(church: ChurchCreate, owner_id: str = Depends(get_current_user)):
    church_dict = church.dict()
    church_dict["id"] = str(uuid.uuid4())
    church_dict["created_at"] = datetime.utcnow()
    church_dict["updated_at"] = datetime.utcnow()
    church_dict["owner_id"] = owner_id
    church_dict["trashed_at"] = None
    
    existing = await db.churches.find_one({"slug": church.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Church with this slug already exists")
    
    result = await db.churches.insert_one(church_dict)
    church_dict["_id"] = str(result.inserted_id)
    return {"message": "Church created successfully", "id": church_dict["id"]}

@app.put("/api/churches/{slug}")
async def update_church(slug: str, church_update: ChurchUpdate, owner_id: str = Depends(get_current_user)):
    existing = await db.churches.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if existing.get("owner_id") != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this church")
    
    update_data = {k: v for k, v in church_update.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.churches.update_one({"slug": slug}, {"$set": update_data})
    return {"message": "Church updated successfully"}

@app.get("/api/media-teams")
async def get_media_teams(
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    service: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0
):
    query = {"status": "published", "trashed_at": None}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if service:
        query["services"] = {"$regex": service, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"bio": {"$regex": search, "$options": "i"}},
            {"tagline": {"$regex": search, "$options": "i"}}
        ]
    
    teams = await db.media_teams.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.media_teams.count_documents(query)
    
    for team in teams:
        team["id"] = str(team["_id"])
        del team["_id"]
    
    return {"media_teams": teams, "total": total, "limit": limit, "skip": skip}

@app.get("/api/media-teams/{slug}")
async def get_media_team(slug: str):
    team = await db.media_teams.find_one({"slug": slug, "status": "published", "trashed_at": None})
    if not team:
        raise HTTPException(status_code=404, detail="Media team not found")
    
    team["id"] = str(team["_id"])
    del team["_id"]
    return team

@app.post("/api/media-teams")
async def create_media_team(media_team: MediaTeamCreate, owner_id: str = Depends(get_current_user)):
    team_dict = media_team.dict()
    team_dict["id"] = str(uuid.uuid4())
    team_dict["created_at"] = datetime.utcnow()
    team_dict["updated_at"] = datetime.utcnow()
    team_dict["owner_id"] = owner_id
    team_dict["trashed_at"] = None
    
    existing = await db.media_teams.find_one({"slug": media_team.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Media team with this slug already exists")
    
    result = await db.media_teams.insert_one(team_dict)
    team_dict["_id"] = str(result.inserted_id)
    return {"message": "Media team created successfully", "id": team_dict["id"]}

@app.put("/api/media-teams/{slug}")
async def update_media_team(slug: str, team_update: MediaTeamUpdate, owner_id: str = Depends(get_current_user)):
    existing = await db.media_teams.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Media team not found")
    
    if existing.get("owner_id") != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this media team")
    
    update_data = {k: v for k, v in team_update.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.media_teams.update_one({"slug": slug}, {"$set": update_data})
    return {"message": "Media team updated successfully"}

@app.get("/sitemap.xml")
async def sitemap():
    churches = await db.churches.find({"status": "published", "trashed_at": None}).to_list(length=10000)
    media_teams = await db.media_teams.find({"status": "published", "trashed_at": None}).to_list(length=10000)
    
    urls = [
        {"loc": "https://churchnavigator.com/", "priority": "1.0"},
        {"loc": "https://churchnavigator.com/churches", "priority": "0.9"},
        {"loc": "https://churchnavigator.com/media-teams", "priority": "0.9"},
    ]
    
    for church in churches:
        urls.append({
            "loc": f"https://churchnavigator.com/church/{church['slug']}",
            "priority": "0.8",
            "lastmod": church.get("updated_at", church.get("created_at", datetime.utcnow())).strftime("%Y-%m-%d")
        })
    
    for team in media_teams:
        urls.append({
            "loc": f"https://churchnavigator.com/media-team/{team['slug']}",
            "priority": "0.8",
            "lastmod": team.get("updated_at", team.get("created_at", datetime.utcnow())).strftime("%Y-%m-%d")
        })
    
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for url in urls:
        xml_content += '  <url>\n'
        xml_content += f'    <loc>{url["loc"]}</loc>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        if "lastmod" in url:
            xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += '  </url>\n'
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

@app.get("/robots.txt")
async def robots():
    content = """User-agent: *
Allow: /

Sitemap: https://api.churchnavigator.com/sitemap.xml"""
    return Response(content=content, media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)