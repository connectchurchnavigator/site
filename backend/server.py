from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv

logger = logging.getLogger(__name__)
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from enum import Enum
import shutil
import aiofiles
import httpx
import asyncio
from analytics_utils import AnalyticsService
import math
import re
from imagekitio import ImageKit

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)

# Create the main app without a prefix
app = FastAPI(title="Church Navigator API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Upload directory configuration
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_DOC_EXTENSIONS = {'.pdf', '.doc', '.docx'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOC_EXTENSIONS
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# ===== ENUMS =====
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    CUSTOMER = "customer"

class ListingStatus(str, Enum):
    DRAFT = "draft"
    DRAFT_UNCLAIMED = "draft_unclaimed"
    PENDING_VERIFICATION = "pending_verification"
    REJECTED = "rejected"
    PUBLISHED = "published"
    TRASH = "trash"

class ListingType(str, Enum):
    CHURCH = "church"
    PASTOR = "pastor"

class RelationshipStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"

class ClaimRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REMOVED = "removed"

# ===== MODELS =====

# User Models
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_picture: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(UserBase):
    id: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Church Models
class ServiceTiming(BaseModel):
    day: str  # Monday-Sunday
    availability: str  # "hours", "open_all_day", "closed_all_day", "by_appointment"
    from_time: Optional[str] = None
    to_time: Optional[str] = None

class ChurchService(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day: str
    start_time: str
    end_time: Optional[str] = None
    ends_next_day: bool = False
    event_name: str
    description: Optional[str] = None

class TeamInfo(BaseModel):
    description: Optional[str] = None
    images: List[str] = []
    video_url: Optional[str] = None
    video_urls: List[str] = []

class BranchInfo(BaseModel):
    church_id: str
    church_name: str

class ChurchBase(BaseModel):
    name: str
    slug: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: List[str] = []
    video_url: Optional[str] = None
    
    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    google_maps_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Contact
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    website_status: Optional[str] = "no_website"  # "no_website", "under_construction", "link"
    
    # Social
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    
    # Faith Metadata
    denomination: Optional[str] = None
    ministries: List[str] = []
    worship_styles: List[str] = []
    facilities: List[str] = []
    languages: List[str] = []
    
    # Pastor
    pastor_id: Optional[str] = None
    pastor_name: Optional[str] = None
    
    # Branch Info
    main_branch_id: Optional[str] = None
    other_branches: List[str] = []
    hidden_branches: List[str] = []
    
    # Service Timings
    service_timings: List[ServiceTiming] = []
    timezone: str = "UTC"
    
    # Services
    services: List[ChurchService] = []
    
    # Teams
    it_media_team: Optional[TeamInfo] = None
    worship_team: Optional[TeamInfo] = None
    outreach_team: Optional[TeamInfo] = None
    
    # Donations
    donations_url: Optional[str] = None
    
    # Verification
    verification_documents: List[str] = []
    
    # Status
    status: ListingStatus = ListingStatus.DRAFT
    trashed_at: Optional[str] = None
    is_recommended: bool = False
    is_featured: bool = False

class Church(ChurchBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Pastor Models
class PastorBase(BaseModel):
    name: str
    slug: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_images: List[str] = []
    video_url: Optional[str] = None
    
    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    google_maps_link: Optional[str] = None
    locations_serving: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: str = "UTC"
    
    # Contact
    phone: str
    fax: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    
    # Social
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    youtube: Optional[str] = None
    
    # Church Affiliation
    church_associated_to: Optional[str] = None
    bible_college: Optional[str] = None
    current_designation: Optional[str] = None
    
    # Faith Metadata
    denomination: Optional[str] = None
    worship_styles: List[str] = []
    languages_known: List[str] = []
    
    # Education
    highest_degree: Optional[str] = None
    qualification: Optional[str] = None
    certifications: List[str] = []
    skills: List[str] = []
    training: List[str] = []
    
    # Experience
    years_in_ministry: Optional[int] = None
    ministry_experience: List[str] = []
    recognitions: Optional[str] = None
    
    # Interests
    roles_interested: List[str] = []
    passion_areas: List[str] = []
    cities_served: List[str] = []
    
    # Status
    status: ListingStatus = ListingStatus.DRAFT
    trashed_at: Optional[str] = None
    is_recommended: bool = False
    is_featured: bool = False

class Pastor(PastorBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Utility Models
class MapResolveRequest(BaseModel):
    url: str

class TimezoneRequest(BaseModel):
    latitude: float
    longitude: float

async def get_timezone_from_coords(lat: float, lng: float) -> str:
    """Gets IANA timezone ID from coordinates using TimeAPI.io"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://www.timeapi.io/api/Time/current/coordinate?latitude={lat}&longitude={lng}"
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("timeZone", "UTC")
    except Exception as e:
        # Use existing logger if defined, else just return UTC
        try:
            logger.error(f"Timezone lookup failed: {str(e)}")
        except NameError:
            print(f"Timezone lookup failed: {str(e)}")
    return "UTC"

@api_router.post("/utility/resolve-map")
async def resolve_map_url(request: MapResolveRequest):
    """
    Expands a short Google Maps URL and extracts coordinates if available.
    """
    url = request.url
    if not url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")
        
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            # follow_redirects is for newer httpx, allow_redirects for older. 
            # Production uses 0.27.0 which needs follow_redirects.
            try:
                response = await client.get(url, headers=headers, follow_redirects=True)
            except TypeError:
                # Fallback for very old local environments
                response = await client.get(url, headers=headers, allow_redirects=True)
            
            final_url = str(response.url)
            
            # Extract coordinates from URL if they exist
            import re
            lat = None
            lng = None
            
            # Pattern 1: @(lat),(lng)
            at_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
            # Pattern 2: !3d(lat)!4d(lng) - common in Google Maps redirects
            d_match = re.search(r'!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)', final_url)
            # Pattern 3: query parameter ll=(lat),(lng) or q=(lat),(lng)
            q_match = re.search(r'[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)

            if at_match:
                lat, lng = float(at_match.group(1)), float(at_match.group(2))
            elif d_match:
                lat, lng = float(d_match.group(1)), float(d_match.group(2))
            elif q_match:
                lat, lng = float(q_match.group(1)), float(q_match.group(2))

            # Get timezone for coordinates
            timezone_id = "UTC"
            if lat is not None and lng is not None:
                timezone_id = await get_timezone_from_coords(lat, lng)

            return {
                "original_url": url,
                "expanded_url": final_url,
                "latitude": lat,
                "longitude": lng,
                "timezone": timezone_id
            }
    except Exception as e:
        logger.error(f"Error resolving map URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve URL: {str(e)}")

@api_router.post("/utility/timezone")
async def get_timezone_endpoint(request: TimezoneRequest):
    """
    Returns the IANA timezone ID for a given set of coordinates.
    """
    timezone_id = await get_timezone_from_coords(request.latitude, request.longitude)
    return {"timezone": timezone_id}

# ImageKit Configuration
imagekit = ImageKit(
    private_key=os.environ.get('IMAGEKIT_PRIVATE_KEY', ''),
    public_key=os.environ.get('IMAGEKIT_PUBLIC_KEY', ''),
    url_endpoint=os.environ.get('IMAGEKIT_URL_ENDPOINT', '')
)

@api_router.get("/utility/imagekit-auth")
async def get_imagekit_auth():
    """
    Returns authentication parameters for ImageKit client-side uploads.
    """
    try:
        auth_params = imagekit.get_authentication_parameters()
        logger.info(f"Generated ImageKit auth parameters: {auth_params.get('token', 'no token')[:10]}...")
        return auth_params
    except Exception as e:
        logger.error(f"ImageKit Auth Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth parameters: {str(e)}")

# Relationship Model
class RelationshipBase(BaseModel):
    pastor_id: str
    church_id: str
    role: Optional[str] = "Pastor"
    is_primary: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: RelationshipStatus = RelationshipStatus.PENDING
    created_by: str  # user_id
    approved_by: Optional[str] = None

class Relationship(RelationshipBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Taxonomy Model
class Taxonomy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # "denomination", "facility", "ministry", etc.
    value: str
    icon: Optional[str] = None

# Analytics Model
class AnalyticsEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listing_id: str
    listing_type: ListingType
    event_type: str  # "view", "click", "call", "directions", "website"
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    device_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Bookmark Model
class Bookmark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    listing_id: str
    listing_type: ListingType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Claim Request Models
class ClaimRequestBase(BaseModel):
    listing_id: str
    listing_type: ListingType
    contact_name: str
    contact_email: EmailStr
    contact_phone: str
    message_to_admin: Optional[str] = None
    proof_documents: List[str] = []
    # Honeypot field for bot prevention
    website_url: Optional[str] = None # Humans leave this empty, bots fill it

class ClaimRequest(ClaimRequestBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: ClaimRequestStatus = ClaimRequestStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===== UTILITY FUNCTIONS =====

async def get_geo_info(ip: str):
    # Skip local IPs
    if not ip or ip in ['127.0.0.1', '::1', 'localhost']:
        return None, None
    try:
        async with httpx.AsyncClient() as client:
            # ip-api.com is free for non-commercial use
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,city", timeout=2.0)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'success':
                    return data.get('country'), data.get('city')
    except Exception as e:
        logger.error(f"GeoIP Error: {e}")
    return None, None

def parse_user_agent(ua_string: str):
    if not ua_string:
        return 'Unknown', 'Unknown', 'Unknown'
    
    ua = ua_string.lower()
    
    # OS detection
    os_name = 'Unknown'
    if 'windows' in ua: os_name = 'Windows'
    elif 'macintosh' in ua or 'mac os x' in ua: os_name = 'macOS'
    elif 'android' in ua: os_name = 'Android'
    elif 'iphone' in ua or 'ipad' in ua: os_name = 'iOS'
    elif 'linux' in ua: os_name = 'Linux'
    
    # Browser detection
    browser = 'Unknown'
    if 'edg/' in ua: browser = 'Edge'
    elif 'chrome' in ua: browser = 'Chrome'
    elif 'firefox' in ua: browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua: browser = 'Safari'
    elif 'opera' in ua or 'opr/' in ua: browser = 'Opera'
    
    # Device detection
    device = 'Desktop'
    if 'ipad' in ua or ('android' in ua and 'mobile' not in ua): device = 'Tablet'
    elif 'mobi' in ua or 'iphone' in ua or 'android' in ua: device = 'Mobile'
        
    return browser, os_name, device


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    if not credentials or not credentials.credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            return None
        # Use a timeout for the DB lookup just in case
        return await asyncio.wait_for(db.users.find_one({'id': user_id}, {'_id': 0}), timeout=5.0)
    except Exception as e:
        print(f"DEBUG: get_current_user_optional error: {e}")
        return None

async def get_super_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    if current_user.get('role') != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user

def create_slug(name: str) -> str:
    return name.lower().replace(' ', '-').replace('/', '-')

# ===== AUTH ROUTES =====

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    del user_dict['password']
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token(user_obj.id, user_obj.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user_obj.model_dump())
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user['id'], user['role'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@api_router.put("/auth/me", response_model=UserResponse)
async def update_me(update_data: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    allowed_fields = ['first_name', 'last_name', 'display_picture']
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update_dict:
        await db.users.update_one(
            {'id': current_user['id']},
            {'$set': update_dict}
        )
    
    updated_user = await db.users.find_one({'id': current_user['id']}, {'_id': 0})
    return UserResponse(**updated_user)

# ===== TAXONOMY ROUTES =====

@api_router.get("/taxonomies/{category}")
async def get_taxonomies(category: str):
    taxonomies = await db.taxonomies.find({'category': category}, {'_id': 0}).to_list(1000)
    return [t['value'] for t in taxonomies]

@api_router.get("/taxonomies")
async def get_all_taxonomies():
    taxonomies = await db.taxonomies.find({}, {'_id': 0}).to_list(5000)
    result = {}
    for t in taxonomies:
        category = t['category']
        if category not in result:
            result[category] = []
        result[category].append(t['value'])
    return result

# ===== CHURCH ROUTES =====

@api_router.post("/churches", response_model=Church)
async def create_church(church_data: ChurchBase, current_user: Dict = Depends(get_current_user)):
    church_dict = church_data.model_dump()
    church_dict['owner_id'] = current_user['id']
    church_dict['slug'] = create_slug(church_data.name)
    
    church_obj = Church(**church_dict)
    doc = church_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.churches.insert_one(doc)
    return church_obj

@api_router.get("/churches")
async def get_churches(
    open_now: Optional[bool] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    day: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None,
    owner_id: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[List[str]] = Query(None),
    language: Optional[List[str]] = Query(None),
    worship_style: Optional[List[str]] = Query(None),
    ministry: Optional[List[str]] = Query(None),
    order_by: Optional[str] = 'name',
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = None,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    logger.warning(f"LISTING_TRACE: get_churches started. owner_id={owner_id}, status={status}")
    skip = (page - 1) * limit
    query = {}
    
    user_role = current_user.get('role') if current_user else None
    
    # Basic Filters
    if owner_id:
        if not current_user or (current_user['id'] != owner_id and user_role != "super_admin" and user_role != UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=403, detail="Not authorized to see these listings")
        query['owner_id'] = owner_id
    
    if status and status != 'all':
        query['status'] = status
    elif not status and not owner_id:
        query['status'] = ListingStatus.PUBLISHED
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]

    # Advanced Filters
    if city:
        query['city'] = {'$regex': city, '$options': 'i'}
    
    if denomination:
        if isinstance(denomination, list):
            query['denomination'] = {'$in': denomination}
        else:
            query['denomination'] = denomination
        
    if language:
        if isinstance(language, list):
            query['languages'] = {'$in': language}
        else:
            query['languages'] = language
        
    if worship_style:
        if isinstance(worship_style, list):
            query['worship_styles'] = {'$in': worship_style}
        else:
            query['worship_styles'] = worship_style
        
    if ministry:
        if isinstance(ministry, list):
            query['ministries'] = {'$in': ministry}
        else:
            query['ministries'] = ministry
        
    # Service Time & Day Filtering
    if start_time and end_time:
        service_query = {
            'start_time': { '$gte': start_time, '$lte': end_time }
        }
        if day:
            service_query['day'] = day
        query['services'] = { '$elemMatch': service_query }
    elif day:
        query['services'] = { '$elemMatch': { 'day': day } }
    elif open_now:
        # Simplified 'open now' - check if there's any service today
        from datetime import datetime
        now = datetime.now()
        current_day = now.strftime('%A')
        query['services'] = { '$elemMatch': { 'day': current_day } }
        
    # Map Bounds Filtering
    if min_lat is not None and max_lat is not None and min_lng is not None and max_lng is not None:
        query['latitude'] = {'$gte': min_lat, '$lte': max_lat}
        query['longitude'] = {'$gte': min_lng, '$lte': max_lng}
    elif latitude is not None and longitude is not None and radius is not None:
        # Simple circular radius filtering (approximate)
        # For production, use $nearSphere with 2dsphere index
        # 1 degree lat is ~111km. 1 degree lng is ~111km * cos(lat)
        # For 50km radius: lat +/- 0.45, lng +/- 0.45
        lat_range = radius / 111.0
        lng_range = radius / (111.0 * math.cos(math.radians(latitude)))
        query['latitude'] = {'$gte': latitude - lat_range, '$lte': latitude + lat_range}
        query['longitude'] = {'$gte': longitude - lng_range, '$lte': longitude + lng_range}

    # Execution
    try:
        logger.warning(f"LISTING_TRACE: Building query: {query}")
        
        # Determine Sort
        sort_field = 'created_at'
        sort_dir = -1
        
        if order_by == 'a-z':
            sort_field = 'name'
            sort_dir = 1
        elif order_by == 'z-a':
            sort_field = 'name'
            sort_dir = -1
        elif order_by == 'latest':
            sort_field = 'created_at'
            sort_dir = -1
        elif order_by == 'nearby' and latitude is not None and longitude is not None:
            # MongoDB $near or sorting by calculated distance would go here
            # For now we'll stick to name if coords provided but no native index
            sort_field = 'name'
            sort_dir = 1

        total = await db.churches.count_documents(query)
        cursor = db.churches.find(query, {'_id': 0}).sort(sort_field, sort_dir).skip(skip).limit(limit)
        churches = await cursor.to_list(length=limit)
        logger.warning(f"LISTING_TRACE: success. returned={len(churches)}")
        
        return {
            'total': total,
            'page': page,
            'limit': limit,
            'data': churches
        }
    except Exception as e:
        logger.error(f"LISTING_ERROR: get_churches failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/churches/{church_id}")
async def get_church(church_id: str):
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        church = await db.churches.find_one({'slug': church_id}, {'_id': 0})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    # Find main branch if this church is linked in other_branches of another church
    main_branch = await db.churches.find_one(
        {'other_branches': church['id']},
        {'id': 1, 'name': 1, 'slug': 1, 'logo': 1, 'city': 1, 'state': 1, '_id': 0}
    )
    if main_branch:
        church['main_branch_info'] = main_branch
    
    return church

@api_router.put("/churches/{church_id}")
async def update_church(
    church_id: str,
    update_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    # Check ownership (handle legacy data without owner_id)
    owner_id = church.get('owner_id')
    if owner_id and owner_id != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Handle Trashed At logic
    if update_data.get('status') == 'trash':
        update_data['trashed_at'] = datetime.now(timezone.utc).isoformat()
    elif 'status' in update_data and update_data.get('status') != 'trash':
        update_data['trashed_at'] = None

    await db.churches.update_one(
        {'id': church_id},
        {'$set': update_data}
    )
    
    updated_church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    return updated_church

@api_router.post("/churches/{church_id}/submit")
async def submit_church(
    church_id: str,
    current_user: Dict = Depends(get_current_user)
):
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    # Handle legacy data without owner_id
    owner_id = church.get('owner_id')
    if owner_id and owner_id != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verification documents are no longer required
    await db.churches.update_one(
        {'id': church_id},
        {'$set': {'status': ListingStatus.PENDING_VERIFICATION}}
    )
    
    return {'message': 'Church submitted for review'}

# ===== HOMEPAGE DATA ROUTES =====

@api_router.get("/homepage/featured-churches")
async def get_featured_churches(limit: int = 6):
    """Get featured churches for homepage"""
    churches = await db.churches.find(
        {'is_featured': True, 'status': ListingStatus.PUBLISHED},
        {'_id': 0}
    ).limit(limit).to_list(limit)
    return churches

@api_router.get("/homepage/open-churches")
async def get_open_churches(limit: int = 6):
    """Get churches that are open now based on service timings"""
    from datetime import datetime
    
    # Get current day and time
    now = datetime.now()
    current_day = now.strftime('%A')  # e.g., 'Sunday'
    current_time = now.strftime('%H:%M')  # e.g., '10:30'
    
    # Find published churches
    churches = await db.churches.find(
        {'status': ListingStatus.PUBLISHED},
        {'_id': 0}
    ).to_list(100)
    
    open_churches = []
    for church in churches:
        services = church.get('services', [])
        for service in services:
            if service.get('day') == current_day:
                start_time = service.get('start_time', '')
                end_time = service.get('end_time', '')
                if start_time and end_time:
                    if start_time <= current_time <= end_time:
                        church['current_service'] = service.get('event_name', 'Service')
                        open_churches.append(church)
                        break
        
        if len(open_churches) >= limit:
            break
    
    return open_churches

@api_router.get("/homepage/featured-pastors")
async def get_featured_pastors(limit: int = 6):
    """Get featured pastors for homepage"""
    pastors = await db.pastors.find(
        {'is_featured': True, 'status': ListingStatus.PUBLISHED},
        {'_id': 0}
    ).limit(limit).to_list(limit)
    return pastors

@api_router.get("/homepage/new-pastors")
async def get_new_pastors(limit: int = 6):
    """Get newly added pastors"""
    pastors = await db.pastors.find(
        {'status': ListingStatus.PUBLISHED},
        {'_id': 0}
    ).sort('created_at', -1).limit(limit).to_list(limit)
    return pastors

@api_router.delete("/churches/{church_id}")
async def delete_church(
    church_id: str,
    current_user: Dict = Depends(get_current_user)
):
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if church['owner_id'] != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.churches.delete_one({'id': church_id})
    return {'message': 'Church deleted'}

# ===== PASTOR ROUTES =====

@api_router.post("/pastors", response_model=Pastor)
async def create_pastor(pastor_data: PastorBase, current_user: Dict = Depends(get_current_user)):
    pastor_dict = pastor_data.model_dump()
    pastor_dict['owner_id'] = current_user['id']
    pastor_dict['slug'] = create_slug(pastor_data.name)
    
    pastor_obj = Pastor(**pastor_dict)
    doc = pastor_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.pastors.insert_one(doc)
    return pastor_obj

@api_router.get("/pastors")
async def get_pastors(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    search: Optional[str] = None,
    owner_id: Optional[str] = None,
    city: Optional[str] = None,
    denomination: Optional[List[str]] = Query(None),
    language: Optional[List[str]] = Query(None),
    qualification: Optional[str] = None,
    designation: Optional[str] = None,
    min_experience: Optional[int] = None,
    order_by: Optional[str] = 'name',
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    current_user: Optional[Dict] = Depends(get_current_user_optional)
):
    logger.warning(f"LISTING_TRACE: get_pastors started. owner_id={owner_id}, status={status}")
    skip = (page - 1) * limit
    query = {}
    user_role = current_user.get('role') if current_user else None
    
    # Basic Filters
    if owner_id:
        if not current_user or (current_user['id'] != owner_id and user_role != "super_admin" and user_role != UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=403, detail="Not authorized to see these listings")
        query['owner_id'] = owner_id
    
    if status and status != 'all':
        query['status'] = status
    elif not status and not owner_id:
        query['status'] = ListingStatus.PUBLISHED
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'bio': {'$regex': search, '$options': 'i'}}
        ]

    # Advanced Filters
    if city:
        query['city'] = {'$regex': city, '$options': 'i'}
    
    if denomination:
        if isinstance(denomination, list):
            query['denomination'] = {'$in': denomination}
        else:
            query['denomination'] = denomination
        
    if language:
        if isinstance(language, list):
            query['languages_known'] = {'$in': language}
        else:
            query['languages_known'] = language
        
    if qualification:
        query['qualification'] = qualification
        
    if designation:
        query['current_designation'] = designation
        
    if min_experience is not None:
        query['years_in_ministry'] = {'$gte': min_experience}
        
    # Map Bounds Filtering
    if min_lat is not None and max_lat is not None and min_lng is not None and max_lng is not None:
        query['latitude'] = {'$gte': min_lat, '$lte': max_lat}
        query['longitude'] = {'$gte': min_lng, '$lte': max_lng}

    # Execution
    try:
        logger.warning(f"LISTING_TRACE: Building query: {query}")
        
        # Determine Sort
        sort_field = 'created_at'
        sort_dir = -1
        
        if order_by == 'a-z':
            sort_field = 'name'
            sort_dir = 1
        elif order_by == 'z-a':
            sort_field = 'name'
            sort_dir = -1
        elif order_by == 'latest':
            sort_field = 'created_at'
            sort_dir = -1

        total = await db.pastors.count_documents(query)
        cursor = db.pastors.find(query, {'_id': 0}).sort(sort_field, sort_dir).skip(skip).limit(limit)
        pastors = await cursor.to_list(length=limit)
        logger.warning(f"LISTING_TRACE: success. total={total}, returned={len(pastors)}")
        
        return {
            'total': total,
            'page': page,
            'limit': limit,
            'data': pastors
        }
    except Exception as e:
        logger.error(f"LISTING_ERROR: get_pastors failure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/pastors/{pastor_id}")
async def get_pastor(pastor_id: str):
    pastor = await db.pastors.find_one({'id': pastor_id}, {'_id': 0})
    if not pastor:
        pastor = await db.pastors.find_one({'slug': pastor_id}, {'_id': 0})
    
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    # Fetch linked churches
    linked_churches = await db.churches.find({'pastor_id': pastor['id']}, {'_id': 0, 'id': 1, 'name': 1, 'slug': 1, 'city': 1, 'profile_picture': 1}).to_list(100)
    pastor['churches'] = linked_churches
    
    return pastor

@api_router.put("/pastors/{pastor_id}")
async def update_pastor(
    pastor_id: str,
    update_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    pastor = await db.pastors.find_one({'id': pastor_id}, {'_id': 0})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    # Check ownership (handle legacy data without owner_id)
    owner_id = pastor.get('owner_id')
    if owner_id and owner_id != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Handle Trashed At logic
    if update_data.get('status') == 'trash':
        update_data['trashed_at'] = datetime.now(timezone.utc).isoformat()
    elif 'status' in update_data and update_data.get('status') != 'trash':
        update_data['trashed_at'] = None

    await db.pastors.update_one(
        {'id': pastor_id},
        {'$set': update_data}
    )
    
    updated_pastor = await db.pastors.find_one({'id': pastor_id}, {'_id': 0})
    return updated_pastor

@api_router.delete("/pastors/{pastor_id}")
async def delete_pastor(
    pastor_id: str,
    current_user: Dict = Depends(get_current_user)
):
    pastor = await db.pastors.find_one({'id': pastor_id}, {'_id': 0})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    # Check ownership (handle legacy data without owner_id)
    owner_id = pastor.get('owner_id')
    if owner_id and owner_id != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.pastors.delete_one({'id': pastor_id})
    return {'message': 'Pastor deleted'}

# ===== RELATIONSHIP ROUTES =====

@api_router.post("/relationships", response_model=Relationship)
async def create_relationship(
    relationship_data: RelationshipBase,
    current_user: Dict = Depends(get_current_user)
):
    relationship_dict = relationship_data.model_dump()
    relationship_dict['created_by'] = current_user['id']
    
    relationship_obj = Relationship(**relationship_dict)
    doc = relationship_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('start_date'):
        doc['start_date'] = doc['start_date'].isoformat()
    if doc.get('end_date'):
        doc['end_date'] = doc['end_date'].isoformat()
    
    await db.relationships.insert_one(doc)
    return relationship_obj

@api_router.get("/relationships/pastor/{pastor_id}")
async def get_pastor_relationships(pastor_id: str):
    relationships = await db.relationships.find(
        {'pastor_id': pastor_id, 'status': RelationshipStatus.ACTIVE},
        {'_id': 0}
    ).to_list(100)
    return relationships

@api_router.get("/relationships/church/{church_id}")
async def get_church_relationships(church_id: str):
    relationships = await db.relationships.find(
        {'church_id': church_id, 'status': RelationshipStatus.ACTIVE},
        {'_id': 0}
    ).to_list(100)
    return relationships

@api_router.put("/relationships/{relationship_id}/approve")
async def approve_relationship(
    relationship_id: str,
    current_user: Dict = Depends(get_current_user)
):
    relationship = await db.relationships.find_one({'id': relationship_id}, {'_id': 0})
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    # Check if user owns the church or pastor
    church = await db.churches.find_one({'id': relationship['church_id']}, {'_id': 0})
    pastor = await db.pastors.find_one({'id': relationship['pastor_id']}, {'_id': 0})
    
    if church['owner_id'] != current_user['id'] and pastor['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.relationships.update_one(
        {'id': relationship_id},
        {'$set': {'status': RelationshipStatus.ACTIVE, 'approved_by': current_user['id']}}
    )
    
    return {'message': 'Relationship approved'}

@api_router.put("/relationships/{relationship_id}/reject")
async def reject_relationship(
    relationship_id: str,
    current_user: Dict = Depends(get_current_user)
):
    relationship = await db.relationships.find_one({'id': relationship_id}, {'_id': 0})
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    church = await db.churches.find_one({'id': relationship['church_id']}, {'_id': 0})
    pastor = await db.pastors.find_one({'id': relationship['pastor_id']}, {'_id': 0})
    
    if church['owner_id'] != current_user['id'] and pastor['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.relationships.update_one(
        {'id': relationship_id},
        {'$set': {'status': RelationshipStatus.REJECTED}}
    )
    
    return {'message': 'Relationship rejected'}

# ===== CLAIM REQUEST ROUTES =====

@api_router.post("/claim-requests", response_model=ClaimRequest)
async def submit_claim_request(
    request_data: ClaimRequestBase,
    current_user: Dict = Depends(get_current_user)
):
    # Bot Prevention: Honeypot check
    if request_data.website_url:
        logger.warning(f"Bot detected: Honeypot field filled by user {current_user['id']}")
        raise HTTPException(status_code=400, detail="Invalid request")

    # Rate Limiting (Simple check)
    since_hour = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_claims = await db.claim_requests.count_documents({
        'user_id': current_user['id'],
        'created_at': {'$gte': since_hour.isoformat()}
    })
    if recent_claims >= 3:
        raise HTTPException(status_code=429, detail="Too many claim requests. Try again later.")

    # Check if a pending claim already exists for this listing by this user
    existing = await db.claim_requests.find_one({
        'user_id': current_user['id'],
        'listing_id': request_data.listing_id,
        'status': ClaimRequestStatus.PENDING
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending claim for this listing")

    claim_obj = ClaimRequest(
        **request_data.model_dump(),
        user_id=current_user['id']
    )
    doc = claim_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()

    await db.claim_requests.insert_one(doc)
    
    # Send Notification (Mock for now, logging as placeholder)
    logger.info(f"NEW CLAIM REQUEST: User {current_user['email']} claiming {request_data.listing_type} {request_data.listing_id}")
    
    return claim_obj

@api_router.get("/claim-requests")
async def get_claim_requests(current_user: Dict = Depends(get_current_user)):
    """Users see their own claims, admins see all"""
    user_role = current_user.get('role')
    is_admin = user_role == "super_admin" or user_role == UserRole.SUPER_ADMIN
    
    query = {} if is_admin else {'user_id': current_user['id']}
    claims = await db.claim_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    
    # Enrich with listing and user info
    enriched_claims = []
    for claim in claims:
        listing = None
        if claim['listing_type'] == ListingType.CHURCH:
            listing = await db.churches.find_one({'id': claim['listing_id']}, {'_id': 0, 'name': 1, 'id': 1, 'owner_id': 1})
        else:
            listing = await db.pastors.find_one({'id': claim['listing_id']}, {'_id': 0, 'name': 1, 'id': 1, 'owner_id': 1})
        
        user = await db.users.find_one({'id': claim['user_id']}, {'_id': 0, 'first_name': 1, 'last_name': 1, 'email': 1})
        
        entry = {
            **claim,
            'listing_name': listing.get('name') if listing else 'Unknown',
            'current_owner_id': listing.get('owner_id') if listing else None,
            'claimant_name': f"{user.get('first_name')} {user.get('last_name')}" if user else 'Unknown',
            'claimant_email': user.get('email') if user else 'Unknown'
        }
        
        # Add history record of processing if it was rejected/approved
        if claim.get('status') != ClaimRequestStatus.PENDING:
             # Already captured in updated_at and rejection_reason, but could add more audit logs here
             pass
             
        enriched_claims.append(entry)
    
    return enriched_claims

@api_router.get("/admin/claim-requests")
async def get_all_claim_requests_admin(current_user: Dict = Depends(get_super_admin)):
    return await get_claim_requests(current_user)

@api_router.put("/admin/claim-requests/{claim_id}/approve")
async def approve_claim_request(claim_id: str, current_user: Dict = Depends(get_super_admin)):
    claim = await db.claim_requests.find_one({'id': claim_id}, {'_id': 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim request not found")
    
    if claim['status'] != ClaimRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Claim is already processed")

    # 1. Update listing ownership
    if claim['listing_type'] == ListingType.CHURCH:
        await db.churches.update_one({'id': claim['listing_id']}, {'$set': {'owner_id': claim['user_id']}})
    else:
        await db.pastors.update_one({'id': claim['listing_id']}, {'$set': {'owner_id': claim['user_id']}})
    
    # 2. Update claim status
    await db.claim_requests.update_one(
        {'id': claim_id}, 
        {'$set': {
            'status': ClaimRequestStatus.APPROVED,
            'processed_by': current_user['id'],
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {'message': 'Claim approved and ownership transferred'}

@api_router.put("/admin/claim-requests/{claim_id}/reject")
async def reject_claim_request(
    claim_id: str, 
    reason: str = Form(...),
    current_user: Dict = Depends(get_super_admin)
):
    claim = await db.claim_requests.find_one({'id': claim_id}, {'_id': 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim request not found")
    
    await db.claim_requests.update_one(
        {'id': claim_id}, 
        {'$set': {
            'status': ClaimRequestStatus.REJECTED,
            'rejection_reason': reason,
            'processed_by': current_user['id'],
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {'message': 'Claim rejected'}

# ===== ANALYTICS ROUTES =====

@api_router.post("/analytics/track")
async def track_event(request: Request, event_data: AnalyticsEvent):
    doc = event_data.model_dump()
    
    # Enrich data if missing
    ua = request.headers.get("user-agent")
    ip = request.headers.get("x-forwarded-for") or request.client.host
    
    if not doc.get('browser') or doc.get('browser') == 'Unknown':
        browser, os_name, device = parse_user_agent(ua)
        doc['browser'] = browser
        doc['os'] = os_name
        doc['device_type'] = device
        
    if not doc.get('country') or doc.get('country') == 'Unknown':
        country, city = await get_geo_info(ip)
        if country: doc['country'] = country
        if city: doc['city'] = city
        
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.analytics.insert_one(doc)
    return {'message': 'Event tracked'}

@api_router.get("/analytics/user-dashboard")
async def get_user_dashboard_analytics(
    scope: str = "sitewide",
    listing_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Comprehensive dashboard analytics for user dashboard"""
    # Force account scope for non-admins
    user_role = current_user.get('role')
    if user_role != "super_admin" and user_role != UserRole.SUPER_ADMIN:
        scope = "account"
        
    now = datetime.now(timezone.utc)
    day_ago = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    six_months_ago = (now - timedelta(days=180)).isoformat()
    year_ago = (now - timedelta(days=365)).isoformat()

    # Build base query for analytics events
    base_query = {}
    if listing_id and listing_id != 'all':
        base_query['listing_id'] = listing_id
    elif scope == 'account':
        # Get user's listings
        user_churches = await db.churches.find({'owner_id': current_user['id']}, {'id': 1, '_id': 0}).to_list(500)
        user_pastors = await db.pastors.find({'owner_id': current_user['id']}, {'id': 1, '_id': 0}).to_list(500)
        user_listing_ids = [c['id'] for c in user_churches] + [p['id'] for p in user_pastors]
        if user_listing_ids:
            base_query['listing_id'] = {'$in': user_listing_ids}
        else:
            base_query['listing_id'] = '__none__'

    # --- Listing counts ---
    if scope == 'account':
        published_count = await db.churches.count_documents({'owner_id': current_user['id'], 'status': 'published'}) + \
                          await db.pastors.count_documents({'owner_id': current_user['id'], 'status': 'published'})
        pending_count = await db.churches.count_documents({'owner_id': current_user['id'], 'status': 'pending_verification'}) + \
                        await db.pastors.count_documents({'owner_id': current_user['id'], 'status': 'pending_verification'})
    else:
        published_count = await db.churches.count_documents({'status': 'published'}) + \
                          await db.pastors.count_documents({'status': 'published'})
        pending_count = await db.churches.count_documents({'status': 'pending_verification'}) + \
                        await db.pastors.count_documents({'status': 'pending_verification'})

    # --- Views ---
    view_query = {**base_query, 'event_type': 'view'}
    views_24h = await db.analytics.count_documents({**view_query, 'timestamp': {'$gte': day_ago}})
    views_7d = await db.analytics.count_documents({**view_query, 'timestamp': {'$gte': week_ago}})
    views_30d = await db.analytics.count_documents({**view_query, 'timestamp': {'$gte': month_ago}})

    # --- Unique views (by session_id) ---
    unique_pipeline_base = [{'$match': {**view_query}}]

    async def count_unique(since):
        pipeline = [
            {'$match': {**view_query, 'timestamp': {'$gte': since}}},
            {'$group': {'_id': '$session_id'}},
            {'$count': 'total'}
        ]
        result = await db.analytics.aggregate(pipeline).to_list(1)
        return result[0]['total'] if result else 0

    unique_24h = await count_unique(day_ago)
    unique_7d = await count_unique(week_ago)
    unique_30d = await count_unique(month_ago)

    # --- Visits this week ---
    visits_week = views_7d

    # --- Visits chart data ---
    async def get_chart_data(since, group_format, num_points):
        pipeline = [
            {'$match': {**view_query, 'timestamp': {'$gte': since}}},
            {'$addFields': {'ts': {'$dateFromString': {'dateString': '$timestamp'}}}},
            {'$group': {
                '_id': {'$dateToString': {'format': group_format, 'date': '$ts'}},
                'views': {'$sum': 1},
                'unique_sessions': {'$addToSet': '$session_id'}
            }},
            {'$project': {
                'date': '$_id',
                'views': 1,
                'unique_views': {'$size': '$unique_sessions'}
            }},
            {'$sort': {'_id': 1}}
        ]
        return await db.analytics.aggregate(pipeline).to_list(500)

    chart_7d = await get_chart_data(week_ago, '%Y-%m-%d', 7)
    chart_30d = await get_chart_data(month_ago, '%Y-%m-%d', 30)
    chart_24h = await get_chart_data(day_ago, '%Y-%m-%dT%H', 24)
    chart_6m = await get_chart_data(six_months_ago, '%Y-%m', 6)
    chart_12m = await get_chart_data(year_ago, '%Y-%m', 12)

    # --- Top aggregations ---
    async def get_top(field, limit=10):
        pipeline = [
            {'$match': {**view_query, 'timestamp': {'$gte': month_ago}}},
            {'$match': {field: {'$ne': None, '$ne': ''}}},
            {'$group': {'_id': f'${field}', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': limit}
        ]
        results = await db.analytics.aggregate(pipeline).to_list(limit)
        return [{'name': r['_id'], 'count': r['count']} for r in results]

    top_referrers = await get_top('referrer', 10)
    top_browsers = await get_top('browser', 10)
    top_devices = await get_top('device_type', 10)
    top_countries = await get_top('country', 10)
    top_platforms = await get_top('os', 10)

    # --- Button clicks ---
    click_query = {**base_query, 'event_type': {'$in': ['click', 'call', 'directions', 'website']}}
    click_pipeline = [
        {'$match': {**click_query, 'timestamp': {'$gte': month_ago}}},
        {'$group': {'_id': '$event_type', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    button_clicks = await db.analytics.aggregate(click_pipeline).to_list(20)
    button_clicks = [{'name': r['_id'], 'count': r['count']} for r in button_clicks]

    # --- User listings for filter dropdown ---
    if scope == 'account':
        churches = await db.churches.find({'owner_id': current_user['id']}, {'_id': 0, 'id': 1, 'name': 1, 'status': 1}).to_list(200)
        pastors_list = await db.pastors.find({'owner_id': current_user['id']}, {'_id': 0, 'id': 1, 'name': 1, 'status': 1}).to_list(200)
    else:
        churches = await db.churches.find({}, {'_id': 0, 'id': 1, 'name': 1, 'status': 1}).to_list(500)
        pastors_list = await db.pastors.find({}, {'_id': 0, 'id': 1, 'name': 1, 'status': 1}).to_list(500)
    
    all_listings = [{'id': c['id'], 'name': c['name'], 'type': 'church'} for c in churches] + \
                   [{'id': p['id'], 'name': p['name'], 'type': 'pastor'} for p in pastors_list]

    return {
        'overview': {
            'published': published_count,
            'pending': pending_count,
            'promotions': 0,
            'visits_week': visits_week,
        },
        'views': {
            'last_24h': views_24h,
            'last_7d': views_7d,
            'last_30d': views_30d,
        },
        'unique_views': {
            'last_24h': unique_24h,
            'last_7d': unique_7d,
            'last_30d': unique_30d,
        },
        'chart': {
            'last_24h': chart_24h,
            'last_7d': chart_7d,
            'last_30d': chart_30d,
            'last_6m': chart_6m,
            'last_12m': chart_12m,
        },
        'top_referrers': top_referrers,
        'top_browsers': top_browsers,
        'top_devices': top_devices,
        'top_countries': top_countries,
        'top_platforms': top_platforms,
        'button_clicks': button_clicks,
        'listings': all_listings,
    }

@api_router.get("/analytics/dashboard/{listing_id}")
async def get_dashboard_analytics(
    listing_id: str,
    current_user: Dict = Depends(get_current_user)
):
    # Get listing to check ownership
    church = await db.churches.find_one({'id': listing_id}, {'_id': 0})
    pastor = await db.pastors.find_one({'id': listing_id}, {'_id': 0})
    
    listing = church or pastor
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing['owner_id'] != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate analytics
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Total views
    views_24h = await db.analytics.count_documents({
        'listing_id': listing_id,
        'event_type': 'view',
        'timestamp': {'$gte': day_ago.isoformat()}
    })
    
    views_7d = await db.analytics.count_documents({
        'listing_id': listing_id,
        'event_type': 'view',
        'timestamp': {'$gte': week_ago.isoformat()}
    })
    
    views_30d = await db.analytics.count_documents({
        'listing_id': listing_id,
        'event_type': 'view',
        'timestamp': {'$gte': month_ago.isoformat()}
    })
    
    return {
        'views_24h': views_24h,
        'views_7d': views_7d,
        'views_30d': views_30d
    }

# ===== BOOKMARK ROUTES =====

@api_router.post("/bookmarks")
async def add_bookmark(
    listing_id: str,
    listing_type: ListingType,
    current_user: Dict = Depends(get_current_user)
):
    existing = await db.bookmarks.find_one({
        'user_id': current_user['id'],
        'listing_id': listing_id
    })
    
    if existing:
        return {'message': 'Already bookmarked'}
    
    bookmark = Bookmark(
        user_id=current_user['id'],
        listing_id=listing_id,
        listing_type=listing_type
    )
    
    doc = bookmark.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookmarks.insert_one(doc)
    
    return {'message': 'Bookmark added'}

@api_router.get("/bookmarks")
async def get_bookmarks(current_user: Dict = Depends(get_current_user)):
    bookmarks = await db.bookmarks.find(
        {'user_id': current_user['id']},
        {'_id': 0}
    ).to_list(1000)
    
    # Fetch actual listings
    result = []
    for bookmark in bookmarks:
        if bookmark['listing_type'] == ListingType.CHURCH:
            listing = await db.churches.find_one({'id': bookmark['listing_id']}, {'_id': 0})
        else:
            listing = await db.pastors.find_one({'id': bookmark['listing_id']}, {'_id': 0})
        
        if listing:
            result.append({
                'bookmark_id': bookmark['id'],
                'listing': listing,
                'listing_type': bookmark['listing_type']
            })
    
    return result

@api_router.delete("/bookmarks/{bookmark_id}")
async def remove_bookmark(
    bookmark_id: str,
    current_user: Dict = Depends(get_current_user)
):
    bookmark = await db.bookmarks.find_one({'id': bookmark_id}, {'_id': 0})
    if not bookmark or bookmark['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    await db.bookmarks.delete_one({'id': bookmark_id})
    return {'message': 'Bookmark removed'}

# ===== SUPER ADMIN ROUTES =====

# --- Admin Analytics ---
@api_router.get("/admin/analytics/overview")
async def get_admin_analytics_overview(current_user: Dict = Depends(get_super_admin)):
    """Get overview analytics for admin dashboard"""
    total_users = await db.users.count_documents({})
    total_churches = await db.churches.count_documents({})
    total_pastors = await db.pastors.count_documents({})
    
    # Status breakdown
    churches_published = await db.churches.count_documents({'status': ListingStatus.PUBLISHED})
    churches_pending = await db.churches.count_documents({'status': ListingStatus.PENDING_VERIFICATION})
    churches_draft = await db.churches.count_documents({'status': ListingStatus.DRAFT})
    churches_rejected = await db.churches.count_documents({'status': ListingStatus.REJECTED})
    
    pastors_published = await db.pastors.count_documents({'status': ListingStatus.PUBLISHED})
    pastors_pending = await db.pastors.count_documents({'status': ListingStatus.PENDING_VERIFICATION})
    
    # Recent activity (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({'created_at': {'$gte': seven_days_ago}})
    recent_churches = await db.churches.count_documents({'created_at': {'$gte': seven_days_ago}})
    recent_pastors = await db.pastors.count_documents({'created_at': {'$gte': seven_days_ago}})
    
    # Featured and recommended counts
    featured_churches = await db.churches.count_documents({'is_featured': True})
    recommended_churches = await db.churches.count_documents({'is_recommended': True})
    
    return {
        'total_users': total_users,
        'total_churches': total_churches,
        'total_pastors': total_pastors,
        'churches': {
            'published': churches_published,
            'pending': churches_pending,
            'draft': churches_draft,
            'rejected': churches_rejected,
            'featured': featured_churches,
            'recommended': recommended_churches
        },
        'pastors': {
            'published': pastors_published,
            'pending': pastors_pending
        },
        'recent_activity': {
            'new_users': recent_users,
            'new_churches': recent_churches,
            'new_pastors': recent_pastors
        }
    }

# --- User Management ---
@api_router.get("/admin/users")
async def get_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Dict = Depends(get_super_admin)
):
    """Get all users with search and filter"""
    query = {}
    
    if search:
        query['$or'] = [
            {'email': {'$regex': search, '$options': 'i'}},
            {'first_name': {'$regex': search, '$options': 'i'}},
            {'last_name': {'$regex': search, '$options': 'i'}}
        ]
    
    if role and role != 'all':
        query['role'] = role
    
    if status and status != 'all':
        query['status'] = status
    
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {'_id': 0, 'hashed_password': 0, 'password_hash': 0}).skip(skip).limit(limit).to_list(limit)
    
    return {
        'total': total,
        'skip': skip,
        'limit': limit,
        'data': users
    }

@api_router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, current_user: Dict = Depends(get_super_admin)):
    """Get single user details"""
    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'hashed_password': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's listings
    user_churches = await db.churches.count_documents({'owner_id': user_id})
    user_pastors = await db.pastors.count_documents({'owner_id': user_id})
    
    user['listings_count'] = {
        'churches': user_churches,
        'pastors': user_pastors
    }
    
    return user

@api_router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: Dict[str, Any],
    current_user: Dict = Depends(get_super_admin)
):
    """Update user details"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow updating password through this endpoint
    update_data.pop('hashed_password', None)
    update_data.pop('password', None)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({'id': user_id}, {'$set': update_data})
    
    # Log the action
    await log_admin_action(current_user['id'], 'update_user', f"Updated user {user_id}")
    
    updated_user = await db.users.find_one({'id': user_id}, {'_id': 0, 'hashed_password': 0})
    return updated_user

@api_router.put("/admin/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    role: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Change user role"""
    if role not in [UserRole.CUSTOMER, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent demoting yourself
    if user_id == current_user['id'] and role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    
    await db.users.update_one({'id': user_id}, {'$set': {'role': role}})
    await log_admin_action(current_user['id'], 'change_role', f"Changed user {user_id} role to {role}")
    
    return {'message': f'User role changed to {role}'}

@api_router.put("/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    suspended: bool,
    current_user: Dict = Depends(get_super_admin)
):
    """Suspend or unsuspend user"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent suspending yourself
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    
    status = 'suspended' if suspended else 'active'
    await db.users.update_one({'id': user_id}, {'$set': {'status': status}})
    await log_admin_action(current_user['id'], 'suspend_user', f"{'Suspended' if suspended else 'Unsuspended'} user {user_id}")
    
    return {'message': f"User {'suspended' if suspended else 'activated'}"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: Dict = Depends(get_super_admin)):
    """Delete a user"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    await db.users.delete_one({'id': user_id})
    await log_admin_action(current_user['id'], 'delete_user', f"Deleted user {user_id} ({user.get('email')})")
    
    return {'message': 'User deleted'}

@api_router.put("/admin/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    new_password: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Admin reset user password"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one({'id': user_id}, {'$set': {'hashed_password': hashed_password}})
    await log_admin_action(current_user['id'], 'reset_password', f"Reset password for user {user_id}")
    
    return {'message': 'Password reset successfully'}

# --- Church Management ---
@api_router.get("/admin/churches")
async def get_all_churches_admin(
    search: Optional[str] = None,
    status: Optional[str] = None,
    denomination: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_recommended: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Dict = Depends(get_super_admin)
):
    """Get all churches for admin"""
    query = {}
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'city': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]
    
    if status and status != 'all':
        query['status'] = status
    
    if denomination and denomination != 'all':
        query['denomination'] = denomination
    
    if is_featured is not None:
        query['is_featured'] = is_featured
    
    if is_recommended is not None:
        query['is_recommended'] = is_recommended
    
    total = await db.churches.count_documents(query)
    churches = await db.churches.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        'total': total,
        'skip': skip,
        'limit': limit,
        'data': churches
    }

@api_router.put("/admin/churches/{church_id}")
async def admin_update_church(
    church_id: str,
    update_data: Dict[str, Any],
    current_user: Dict = Depends(get_super_admin)
):
    """Admin update any church"""
    church = await db.churches.find_one({'id': church_id})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.churches.update_one({'id': church_id}, {'$set': update_data})
    await log_admin_action(current_user['id'], 'update_church', f"Updated church {church_id}")
    
    updated = await db.churches.find_one({'id': church_id}, {'_id': 0})
    return updated

@api_router.delete("/admin/churches/{church_id}")
async def admin_delete_church(church_id: str, current_user: Dict = Depends(get_super_admin)):
    """Admin delete any church"""
    church = await db.churches.find_one({'id': church_id})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.delete_one({'id': church_id})
    await log_admin_action(current_user['id'], 'delete_church', f"Deleted church {church_id} ({church.get('name')})")
    
    return {'message': 'Church deleted'}

@api_router.put("/admin/churches/{church_id}/status")
async def change_church_status(
    church_id: str,
    status: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Change church status"""
    valid_statuses = [ListingStatus.DRAFT, ListingStatus.PENDING_VERIFICATION, ListingStatus.PUBLISHED, ListingStatus.REJECTED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    church = await db.churches.find_one({'id': church_id})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one({'id': church_id}, {'$set': {'status': status}})
    await log_admin_action(current_user['id'], 'change_status', f"Changed church {church_id} status to {status}")
    
    return {'message': f'Church status changed to {status}'}

class BulkActionRequest(BaseModel):
    church_ids: List[str]

@api_router.post("/admin/churches/bulk")
async def bulk_church_action(
    action: str,
    body: BulkActionRequest,
    current_user: Dict = Depends(get_super_admin)
):
    """Bulk actions on churches"""
    church_ids = body.church_ids
    if action not in ['delete', 'publish', 'unpublish', 'feature', 'unfeature']:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    if not church_ids or len(church_ids) == 0:
        raise HTTPException(status_code=400, detail="No churches selected")
    
    if action == 'delete':
        result = await db.churches.delete_many({'id': {'$in': church_ids}})
        await log_admin_action(current_user['id'], 'bulk_delete', f"Bulk deleted {result.deleted_count} churches")
        return {'message': f'{result.deleted_count} churches deleted'}
    
    elif action == 'publish':
        result = await db.churches.update_many({'id': {'$in': church_ids}}, {'$set': {'status': ListingStatus.PUBLISHED}})
        await log_admin_action(current_user['id'], 'bulk_publish', f"Bulk published {result.modified_count} churches")
        return {'message': f'{result.modified_count} churches published'}
    
    elif action == 'unpublish':
        result = await db.churches.update_many({'id': {'$in': church_ids}}, {'$set': {'status': ListingStatus.DRAFT}})
        return {'message': f'{result.modified_count} churches unpublished'}
    
    elif action == 'feature':
        result = await db.churches.update_many({'id': {'$in': church_ids}}, {'$set': {'is_featured': True}})
        return {'message': f'{result.modified_count} churches featured'}
    
    elif action == 'unfeature':
        result = await db.churches.update_many({'id': {'$in': church_ids}}, {'$set': {'is_featured': False}})
        return {'message': f'{result.modified_count} churches unfeatured'}

# --- Pastor Management ---
@api_router.get("/admin/pastors")
async def get_all_pastors_admin(
    search: Optional[str] = None,
    status: Optional[str] = None,
    denomination: Optional[str] = None,
    is_featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Dict = Depends(get_super_admin)
):
    """Get all pastors for admin"""
    query = {}
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'city': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]
    
    if status and status != 'all':
        query['status'] = status
    
    if denomination and denomination != 'all':
        query['denomination'] = denomination
    
    if is_featured is not None:
        query['is_featured'] = is_featured
    
    total = await db.pastors.count_documents(query)
    pastors = await db.pastors.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        'total': total,
        'skip': skip,
        'limit': limit,
        'data': pastors
    }

@api_router.put("/admin/pastors/{pastor_id}")
async def admin_update_pastor(
    pastor_id: str,
    update_data: Dict[str, Any],
    current_user: Dict = Depends(get_super_admin)
):
    """Admin update any pastor"""
    pastor = await db.pastors.find_one({'id': pastor_id})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.pastors.update_one({'id': pastor_id}, {'$set': update_data})
    await log_admin_action(current_user['id'], 'update_pastor', f"Updated pastor {pastor_id}")
    
    updated = await db.pastors.find_one({'id': pastor_id}, {'_id': 0})
    return updated

@api_router.delete("/admin/pastors/{pastor_id}")
async def admin_delete_pastor(pastor_id: str, current_user: Dict = Depends(get_super_admin)):
    """Admin delete any pastor"""
    pastor = await db.pastors.find_one({'id': pastor_id})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    await db.pastors.delete_one({'id': pastor_id})
    await log_admin_action(current_user['id'], 'delete_pastor', f"Deleted pastor {pastor_id} ({pastor.get('name')})")
    
    return {'message': 'Pastor deleted'}

@api_router.put("/admin/pastors/{pastor_id}/status")
async def change_pastor_status(
    pastor_id: str,
    status: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Change pastor status"""
    valid_statuses = [ListingStatus.DRAFT, ListingStatus.PENDING_VERIFICATION, ListingStatus.PUBLISHED, ListingStatus.REJECTED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    pastor = await db.pastors.find_one({'id': pastor_id})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    await db.pastors.update_one({'id': pastor_id}, {'$set': {'status': status}})
    await log_admin_action(current_user['id'], 'change_status', f"Changed pastor {pastor_id} status to {status}")
    
    return {'message': f'Pastor status changed to {status}'}

# --- Verification Queue (existing, enhanced) ---
@api_router.get("/admin/pending-verifications")
async def get_pending_verifications(current_user: Dict = Depends(get_super_admin)):
    churches = await db.churches.find(
        {'status': ListingStatus.PENDING_VERIFICATION},
        {'_id': 0}
    ).to_list(1000)
    
    pastors = await db.pastors.find(
        {'status': ListingStatus.PENDING_VERIFICATION},
        {'_id': 0}
    ).to_list(1000)
    
    return {
        'churches': churches,
        'pastors': pastors
    }

@api_router.put("/admin/approve/{listing_type}/{listing_id}")
async def approve_listing(
    listing_type: ListingType,
    listing_id: str,
    current_user: Dict = Depends(get_super_admin)
):
    collection = db.churches if listing_type == ListingType.CHURCH else db.pastors
    
    result = await collection.update_one(
        {'id': listing_id},
        {'$set': {'status': ListingStatus.PUBLISHED}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await log_admin_action(current_user['id'], 'approve_listing', f"Approved {listing_type} {listing_id}")
    return {'message': 'Listing approved'}

@api_router.put("/admin/reject/{listing_type}/{listing_id}")
async def reject_listing(
    listing_type: ListingType,
    listing_id: str,
    feedback: str = "",
    current_user: Dict = Depends(get_super_admin)
):
    collection = db.churches if listing_type == ListingType.CHURCH else db.pastors
    
    result = await collection.update_one(
        {'id': listing_id},
        {'$set': {'status': ListingStatus.REJECTED, 'rejection_feedback': feedback}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await log_admin_action(current_user['id'], 'reject_listing', f"Rejected {listing_type} {listing_id}")
    return {'message': 'Listing rejected'}

@api_router.put("/admin/feature/{listing_type}/{listing_id}")
async def feature_listing(
    listing_type: ListingType,
    listing_id: str,
    is_featured: bool,
    current_user: Dict = Depends(get_super_admin)
):
    collection = db.churches if listing_type == ListingType.CHURCH else db.pastors
    
    await collection.update_one(
        {'id': listing_id},
        {'$set': {'is_featured': is_featured}}
    )
    
    await log_admin_action(current_user['id'], 'feature_listing', f"{'Featured' if is_featured else 'Unfeatured'} {listing_type} {listing_id}")
    return {'message': 'Listing featured status updated'}

@api_router.put("/admin/recommend/{listing_type}/{listing_id}")
async def recommend_listing(
    listing_type: ListingType,
    listing_id: str,
    is_recommended: bool,
    current_user: Dict = Depends(get_super_admin)
):
    collection = db.churches if listing_type == ListingType.CHURCH else db.pastors
    
    await collection.update_one(
        {'id': listing_id},
        {'$set': {'is_recommended': is_recommended}}
    )
    
    await log_admin_action(current_user['id'], 'recommend_listing', f"{'Recommended' if is_recommended else 'Unrecommended'} {listing_type} {listing_id}")
    return {'message': 'Listing recommended status updated'}

# --- Taxonomy Management ---
@api_router.get("/admin/taxonomies")
async def get_all_taxonomies_admin(current_user: Dict = Depends(get_super_admin)):
    """Get all taxonomies grouped by category"""
    taxonomies = await db.taxonomies.find({}, {'_id': 0}).to_list(5000)
    
    result = {}
    for t in taxonomies:
        category = t['category']
        if category not in result:
            result[category] = []
        result[category].append({'id': t.get('id', t['value']), 'value': t['value']})
    
    return result

@api_router.post("/admin/taxonomies")
async def create_taxonomy(
    category: str,
    value: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Add new taxonomy value"""
    # Check if already exists
    existing = await db.taxonomies.find_one({'category': category, 'value': value})
    if existing:
        raise HTTPException(status_code=400, detail="Taxonomy value already exists")
    
    taxonomy_id = str(uuid.uuid4())
    await db.taxonomies.insert_one({
        'id': taxonomy_id,
        'category': category,
        'value': value,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    await log_admin_action(current_user['id'], 'create_taxonomy', f"Added {value} to {category}")
    return {'id': taxonomy_id, 'category': category, 'value': value}

@api_router.put("/admin/taxonomies/{taxonomy_id}")
async def update_taxonomy(
    taxonomy_id: str,
    value: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Update taxonomy value"""
    result = await db.taxonomies.update_one(
        {'id': taxonomy_id},
        {'$set': {'value': value}}
    )
    
    if result.matched_count == 0:
        # Try matching by value (for legacy data)
        result = await db.taxonomies.update_one(
            {'value': taxonomy_id},
            {'$set': {'value': value}}
        )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Taxonomy not found")
    
    await log_admin_action(current_user['id'], 'update_taxonomy', f"Updated taxonomy {taxonomy_id} to {value}")
    return {'message': 'Taxonomy updated'}

@api_router.delete("/admin/taxonomies/{taxonomy_id}")
async def delete_taxonomy(taxonomy_id: str, current_user: Dict = Depends(get_super_admin)):
    """Delete taxonomy value"""
    result = await db.taxonomies.delete_one({'id': taxonomy_id})
    
    if result.deleted_count == 0:
        # Try matching by value (for legacy data)
        result = await db.taxonomies.delete_one({'value': taxonomy_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Taxonomy not found")
    
    await log_admin_action(current_user['id'], 'delete_taxonomy', f"Deleted taxonomy {taxonomy_id}")
    return {'message': 'Taxonomy deleted'}

# --- System Settings ---
@api_router.get("/admin/settings")
async def get_system_settings(current_user: Dict = Depends(get_super_admin)):
    """Get system settings"""
    settings = await db.settings.find_one({'type': 'system'}, {'_id': 0})
    if not settings:
        # Return defaults
        settings = {
            'type': 'system',
            'site_name': 'Church Navigator',
            'site_description': 'Find churches and pastors near you',
            'contact_email': '',
            'contact_phone': '',
            'social_links': {},
            'features_enabled': {
                'user_registration': True,
                'church_submission': True,
                'pastor_submission': True
            }
        }
    return settings

@api_router.put("/admin/settings")
async def update_system_settings(
    settings: Dict[str, Any],
    current_user: Dict = Depends(get_super_admin)
):
    """Update system settings"""
    settings['type'] = 'system'
    settings['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {'type': 'system'},
        {'$set': settings},
        upsert=True
    )
    
    await log_admin_action(current_user['id'], 'update_settings', "Updated system settings")
    return {'message': 'Settings updated'}

# --- Announcements ---
@api_router.get("/admin/announcements")
async def get_announcements(current_user: Dict = Depends(get_super_admin)):
    """Get all announcements"""
    announcements = await db.announcements.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return announcements

@api_router.post("/admin/announcements")
async def create_announcement(
    title: str,
    message: str,
    target: str = "all",  # all, customers, admins
    current_user: Dict = Depends(get_super_admin)
):
    """Create new announcement"""
    announcement = {
        'id': str(uuid.uuid4()),
        'title': title,
        'message': message,
        'target': target,
        'created_by': current_user['id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'is_active': True
    }
    
    await db.announcements.insert_one(announcement)
    await log_admin_action(current_user['id'], 'create_announcement', f"Created announcement: {title}")
    
    return announcement

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user: Dict = Depends(get_super_admin)):
    """Delete announcement"""
    result = await db.announcements.delete_one({'id': announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    await log_admin_action(current_user['id'], 'delete_announcement', f"Deleted announcement {announcement_id}")
    return {'message': 'Announcement deleted'}

# --- Audit Logs ---
async def log_admin_action(admin_id: str, action: str, details: str):
    """Log admin action"""
    log_entry = {
        'id': str(uuid.uuid4()),
        'admin_id': admin_id,
        'action': action,
        'details': details,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    await db.admin_logs.insert_one(log_entry)

@api_router.get("/admin/logs")
async def get_admin_logs(
    action: Optional[str] = None,
    admin_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: Dict = Depends(get_super_admin)
):
    """Get admin audit logs"""
    query = {}
    
    if action:
        query['action'] = action
    
    if admin_id:
        query['admin_id'] = admin_id
    
    total = await db.admin_logs.count_documents(query)
    logs = await db.admin_logs.find(query, {'_id': 0}).sort('timestamp', -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with admin names
    for log in logs:
        admin = await db.users.find_one({'id': log['admin_id']}, {'email': 1, 'first_name': 1, 'last_name': 1})
        if admin:
            log['admin_email'] = admin.get('email')
            log['admin_name'] = f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip()
    
    return {
        'total': total,
        'skip': skip,
        'limit': limit,
        'data': logs
    }

# --- Content Moderation (Reports) ---
@api_router.get("/admin/reports")
async def get_reports(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: Dict = Depends(get_super_admin)
):
    """Get content reports"""
    query = {}
    if status:
        query['status'] = status
    
    total = await db.reports.count_documents(query)
    reports = await db.reports.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        'total': total,
        'skip': skip,
        'limit': limit,
        'data': reports
    }

@api_router.post("/admin/reports")
async def create_report(
    listing_type: str,
    listing_id: str,
    reason: str,
    description: str = "",
    current_user: Dict = Depends(get_current_user)
):
    """Create a content report (any user can report)"""
    report = {
        'id': str(uuid.uuid4()),
        'listing_type': listing_type,
        'listing_id': listing_id,
        'reason': reason,
        'description': description,
        'reported_by': current_user['id'],
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.reports.insert_one(report)
    return {'message': 'Report submitted', 'id': report['id']}

@api_router.put("/admin/reports/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    resolution: str,
    action_taken: str = "",
    current_user: Dict = Depends(get_super_admin)
):
    """Resolve a content report"""
    report = await db.reports.find_one({'id': report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.reports.update_one(
        {'id': report_id},
        {'$set': {
            'status': 'resolved',
            'resolution': resolution,
            'action_taken': action_taken,
            'resolved_by': current_user['id'],
            'resolved_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_admin_action(current_user['id'], 'resolve_report', f"Resolved report {report_id}: {resolution}")
    return {'message': 'Report resolved'}

# --- Bulk Operations ---
@api_router.post("/admin/bulk/upload/{type}")
async def bulk_upload(
    type: str,
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_super_admin)
):
    """Bulk upload listing via CSV"""
    if type not in ['church', 'pastor']:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    try:
        contents = await file.read()
        # Try to decode as utf-8-sig first (handles BOM from Excel), then utf-8, then latin-1
        try:
            decoded = contents.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                decoded = contents.decode('utf-8')
            except UnicodeDecodeError:
                decoded = contents.decode('latin-1')
        
        buffer = io.StringIO(decoded)
        reader = csv.DictReader(buffer)
        
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV file is empty or invalid")
            
        logger.info(f"Starting bulk upload of {type} for user {current_user['id']}. Columns: {reader.fieldnames}")
    except Exception as e:
        logger.error(f"Failed to read/parse CSV: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    
    count = 0
    errors = []
    collection = db.churches if type == 'church' else db.pastors
    
    for row in reader:
        try:
            # Clean empty strings into None for optional fields
            processed_row = {k: (v.strip() if v and v.strip() else None) for k, v in row.items()}
            
            # Basic validation: Name is required
            name = processed_row.get('name') or processed_row.get('full_name')
            if not name:
                errors.append(f"Row {count + 1}: Name is required")
                continue

            # Handle slug uniqueness
            base_slug = create_slug(name)
            slug = base_slug
            slug_count = 1
            while await collection.find_one({'slug': slug}):
                slug = f"{base_slug}-{slug_count}"
                slug_count += 1

            # URL Sanitization Helper
            def sanitize_url(url):
                if not url: return None
                # If it's already a full URL (ImageKit or external), keep it
                if url.startswith('http') or url.startswith('https'):
                    # Replace old localhost URLs if they exist
                    if 'localhost' in url:
                        return url.replace('http://localhost:8000', '').replace('http://localhost:3000', '')
                    return url
                # If it's a relative path, ensure it starts with /
                if not url.startswith('/'):
                    return f"/{url}"
                return url

            # Core fields mapping
            doc = {
                'id': str(uuid.uuid4()),
                'owner_id': current_user['id'],
                'slug': slug,
                'status': ListingStatus.PUBLISHED,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'is_verified': True,
                'is_featured': False
            }

            # Map CSV fields to DB fields
            # We use a broad mapping to handle different CSV versions
            field_map = {
                'tagline': 'tagline',
                'description': 'description',
                'bio': 'bio',
                'address': 'address_line1',
                'address_line1': 'address_line1',
                'city': 'city',
                'state': 'state',
                'country': 'country',
                'zip_code': 'zip_code',
                'phone': 'phone',
                'email': 'email',
                'website': 'website',
                'denomination': 'denomination',
                'worship_style': 'worship_style',
                'facebook': 'facebook',
                'instagram': 'instagram',
                'youtube': 'youtube',
                'twitter': 'twitter',
                'years_in_ministry': 'years_in_ministry',
                'highest_degree': 'highest_degree'
            }

            for csv_key, db_key in field_map.items():
                if processed_row.get(csv_key):
                    doc[db_key] = processed_row[csv_key]

            # Special field handling
            if type == 'church':
                doc['name'] = name
                doc['logo_url'] = sanitize_url(processed_row.get('logo_url'))
                doc['cover_url'] = sanitize_url(processed_row.get('cover_url'))
                
                # List fields
                for list_field in ['ministries', 'worship_styles', 'facilities', 'languages', 'other_branches']:
                    val = processed_row.get(list_field)
                    if val:
                        doc[list_field] = [x.strip() for x in val.split(',')]
                    else:
                        doc[list_field] = []
                
                # Coordinates
                try:
                    doc['latitude'] = float(processed_row.get('latitude')) if processed_row.get('latitude') else 0.0
                    doc['longitude'] = float(processed_row.get('longitude')) if processed_row.get('longitude') else 0.0
                except (ValueError, TypeError):
                    doc['latitude'] = 0.0
                    doc['longitude'] = 0.0
            else:
                doc['full_name'] = name
                doc['profile_image_url'] = sanitize_url(processed_row.get('profile_image_url') or processed_row.get('logo_url'))
                
                # List fields
                for list_field in ['locations_serving', 'languages_known', 'certifications', 'skills', 'training', 'ministry_experience', 'roles_interested', 'passion_areas', 'cities_served', 'languages']:
                    val = processed_row.get(list_field)
                    if val:
                        doc[list_field] = [x.strip() for x in val.split(',')]
                    else:
                        doc[list_field] = []

            await collection.insert_one(doc)
            count += 1
        except Exception as e:
            logger.error(f"Error processing row {count + 1}: {str(e)}")
            errors.append(f"Row {count + 1}: {str(e)}")
    
    await log_admin_action(current_user['id'], 'bulk_upload', f"Bulk uploaded {count} {type}s")
    
    return {
        'message': f'Successfully uploaded {count} {type}s',
        'errors': errors
    }

@api_router.get("/admin/bulk/export/{type}")
async def bulk_export(
    type: str,
    current_user: Dict = Depends(get_super_admin)
):
    """Export listings to CSV"""
    if type not in ['church', 'pastor']:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection = db.churches if type == 'church' else db.pastors
    data = await collection.find({}, {'_id': 0}).to_list(10000)
    
    if not data:
        raise HTTPException(status_code=404, detail="No data to export")
    
    # Get headers from first row
    headers = list(data[0].keys())
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    
    for row in data:
        # Convert lists to comma-separated strings for CSV
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, list):
                clean_row[k] = ", ".join([str(x) for x in v])
            else:
                clean_row[k] = v
        writer.writerow(clean_row)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={type}s_export_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ===== FILE UPLOAD ROUTES =====

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate file extension and size"""
    if not file.filename:
        return False, "No filename provided"
    
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    return True, ""

def get_file_category(filename: str) -> str:
    """Determine if file is image or document"""
    ext = Path(filename).suffix.lower()
    return "images" if ext in ALLOWED_IMAGE_EXTENSIONS else "documents"

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(default="general"),  # logo, cover, gallery, verification, profile
    current_user: Dict = Depends(get_current_user)
):
    """Upload a single file and return its URL"""
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{ext}"
    
    # Create subdirectory based on category
    file_category = get_file_category(file.filename)
    subdir = UPLOAD_DIR / file_category / category
    subdir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = subdir / unique_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)
    
    # Generate URL with /api prefix for proper routing
    relative_path = f"/api/uploads/{file_category}/{category}/{unique_filename}"
    
    logger.info(f"File uploaded: {relative_path} by user {current_user['id']}")
    
    return {
        "url": relative_path,
        "filename": file.filename,
        "size": len(file_content),
        "category": category,
        "type": file_category
    }

@api_router.post("/upload/multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    category: str = Form(default="gallery"),
    current_user: Dict = Depends(get_current_user)
):
    """Upload multiple files and return their URLs"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per upload")
    
    results = []
    errors = []
    
    for file in files:
        try:
            # Validate file
            is_valid, error_msg = validate_file(file)
            if not is_valid:
                errors.append({"filename": file.filename, "error": error_msg})
                continue
            
            # Check file size
            file_content = await file.read()
            if len(file_content) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large"})
                continue
            
            # Generate unique filename
            ext = Path(file.filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{ext}"
            
            # Create subdirectory
            file_category = get_file_category(file.filename)
            subdir = UPLOAD_DIR / file_category / category
            subdir.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file_path = subdir / unique_filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            # Generate URL with /api prefix for proper routing
            relative_path = f"/api/uploads/{file_category}/{category}/{unique_filename}"
            
            results.append({
                "url": relative_path,
                "filename": file.filename,
                "size": len(file_content)
            })
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    logger.info(f"Multiple files uploaded: {len(results)} success, {len(errors)} failed by user {current_user['id']}")
    
    return {
        "uploaded": results,
        "errors": errors,
        "total_uploaded": len(results),
        "total_failed": len(errors)
    }

@api_router.delete("/upload")
async def delete_file(
    url: str,
    current_user: Dict = Depends(get_current_user)
):
    """Delete an uploaded file"""
    # Handle ImageKit URLs (Skip deletion as they are managed in the cloud)
    if "ik.imagekit.io" in url:
        return {"message": "Cloud file removal skipped"}

    # Security: Only allow deleting files in uploads directory
    # Accept both /uploads/ and /api/uploads/ prefixes
    if url.startswith("/api/uploads/"):
        relative_path = url.replace("/api/uploads/", "uploads/")
    elif url.startswith("/uploads/"):
        relative_path = url.lstrip("/")
    else:
        raise HTTPException(status_code=400, detail="Invalid file URL")
    
    # Convert URL to file path
    file_path = ROOT_DIR / relative_path
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if path is within uploads directory (security check)
    try:
        file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    # Delete file
    file_path.unlink()
    logger.info(f"File deleted: {url} by user {current_user['id']}")
    
    return {"message": "File deleted successfully"}

# Initialize Analytics Service
analytics_service = AnalyticsService()

@api_router.get("/admin/analytics/unified")
async def get_unified_analytics(current_user: Dict = Depends(get_super_admin)):
    """Get aggregated analytics from GA4 and Clarity with 24h caching"""
    cache_key = "unified_analytics"
    now = datetime.now(timezone.utc)
    
    # Check cache
    cache = await db.analytics_cache.find_one({'key': cache_key})
    if cache:
        updated_at = datetime.fromisoformat(cache['updated_at'])
        if now - updated_at < timedelta(hours=24):
            return cache['data']
    
    # Fetch fresh data
    try:
        # GA4 Data
        ga4_data = analytics_service.get_ga4_summary()
        
        # Clarity Data
        clarity_data = await analytics_service.get_clarity_insights()
        
        # Internal Platform Stats
        total_users = await db.users.count_documents({})
        total_churches = await db.churches.count_documents({'status': ListingStatus.PUBLISHED})
        
        # Conversions
        conversions = analytics_service.get_listing_conversions()
        
        unified_data = {
            "sessions": ga4_data or [],
            "clarity": clarity_data.get('metrics', {}) if clarity_data else {
                "rageClicks": 0, "deadClicks": 0, "avgSession": "0m", "scrollDepth": "0%"
            },
            "conversions": conversions or [],
            "platform": {
                "total_users": total_users,
                "total_churches": total_churches
            },
            "updated_at": now.isoformat()
        }
        
        # Update cache
        await db.analytics_cache.update_one(
            {'key': cache_key},
            {'$set': {'data': unified_data, 'updated_at': now.isoformat()}},
            upsert=True
        )
        
        return unified_data
    except Exception as e:
        logger.error(f"Unified Analytics fetch failed: {e}")
        if cache: return cache['data'] # Return stale data if fetch fails
        return {"error": "Failed to fetch analytics", "sessions": []}

@api_router.get("/churches/{church_id}/insights")
async def get_church_insights(church_id: str, current_user: Dict = Depends(get_current_user)):
    """Get specific performance insights for a church listing (owner only)"""
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
        
    # Security check
    if church.get('owner_id') != current_user['id'] and current_user['role'] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch metrics for specific slug/path
    # This would involve querying GA4 filtered by pagePath
    # For now, return a sophisticated mock matching the UI plan
    return {
        "views": 1250,
        "actions": [
            {"name": "Directions", "count": 45},
            {"name": "Website", "count": 82},
            {"name": "Call", "count": 12}
        ],
        "engagement_score": 78,
        "avg_duration": "2m 15s"
    }

# Include the router in the main app
app.include_router(api_router)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG: Request started: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"DEBUG: Request finished: {request.method} {request.url.path} - {response.status_code}")
    return response

# Flexible CORS for production
frontend_url = os.environ.get('FRONTEND_URL')
allowed_origins = ["*"]
if os.environ.get('NODE_ENV') == 'production' and frontend_url:
    # Split by comma if multiple URLs are provided
    allowed_origins = [origin.strip() for origin in frontend_url.split(',')]
elif os.environ.get('NODE_ENV') == 'development':
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount static files for uploads under /api/uploads path for proper routing
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ===== SEED DATA ON STARTUP =====
@app.on_event("startup")
async def seed_data():
    # Create super admin if doesn't exist
    super_admin = await db.users.find_one({'email': 'zinxs4@gmail.com'}, {'_id': 0})
    if not super_admin:
        admin_user = User(
            email='zinxs4@gmail.com',
            password_hash=hash_password('Rut#vik7'),
            first_name='Super',
            last_name='Admin',
            role=UserRole.SUPER_ADMIN
        )
        doc = admin_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        logger.info("Super admin created")
    
    # Seed taxonomies
    taxonomy_count = await db.taxonomies.count_documents({})
    if taxonomy_count == 0:
        taxonomies = [
            # Denominations
            *[{'category': 'denomination', 'value': d} for d in [
                'Adventist', 'Anabaptist', 'Anglican / Episcopal', 'Baptist', 'Eastern Catholic',
                'Independent', 'Jehovah Witnesses', 'LDS / Latter-day Saints', 'Lutheran',
                'Messianic Jewish', 'Methodist', 'Non-Denominational', 'Old Catholic',
                'Oriental Orthodox', 'Orthodox', 'Pentecostal', 'Presbyterian', 'Reformed',
                'Restorationist', 'Roman Catholic', 'Apostolic Church', 'Assemblies of God',
                'Salvation Army'
            ]],
            # Languages
            *[{'category': 'language', 'value': l} for l in [
                'Arabic', 'Bengali', 'Burmese', 'Chinese (Mandarin)', 'Dutch', 'English',
                'French', 'German', 'Gujarati', 'Hindi', 'Italian', 'Japanese', 'Kannada',
                'Korean', 'Malayalam', 'Marathi', 'Nepali', 'Portuguese', 'Punjabi', 'Russian',
                'Sinhala', 'Spanish', 'Swahili', 'Tagalog / Filipino', 'Tamil', 'Telugu',
                'Thai', 'Urdu', 'Vietnamese'
            ]],
            # Worship Styles
            *[{'category': 'worship_style', 'value': w} for w in [
                'Traditional Worship', 'Contemporary Worship', 'Blended Worship',
                'Gospel Worship', 'Charismatic / Spirit-Filled Worship',
                'Multicultural Worship', 'Reflective / Soaking Worship',
                'Online / Digital Worship'
            ]],
            # Facilities (subset for brevity)
            *[{'category': 'facility', 'value': f} for f in [
                'Auditorium', 'Chapel', 'Fellowship Hall', 'Nursery / Crèche',
                'Sunday School Classrooms', 'Prayer Room', 'Parking Available',
                'Wheelchair Accessible', 'Free Wi-Fi', 'Live Streaming Equipment',
                'Sound System', 'Baptism Pool', 'Kitchen', 'Bookstore'
            ]],
            # Ministries (subset)
            *[{'category': 'ministry', 'value': m} for m in [
                "Youth Ministry", "Children's Ministry", "Worship Ministry",
                "Prayer Ministry", "Outreach Ministry", "Men's Ministry",
                "Women's Ministry", "Music Ministry", "Bible Study / Small Groups",
                "Missions / Global Outreach", "Community Service", "Food Pantry"
            ]],
            # Skills
            *[{'category': 'skill', 'value': s} for s in [
                'Preaching / Teaching', 'Pastoral Care', 'Discipleship',
                'Evangelism / Outreach', 'Prayer Leadership', 'Biblical Counseling',
                'Worship Leadership', 'Church Leadership', 'Team Building',
                'Strategic Planning', 'Event Planning / Coordination'
            ]],
            # Qualifications
            *[{'category': 'qualification', 'value': q} for q in [
                'Certificate in Theology', 'Diploma in Ministry',
                "Bachelor's in Theology", 'Master of Divinity (M.Div.)',
                'Doctor of Ministry (D.Min.)', 'Doctor of Theology (Th.D.)',
                'Ph.D. in Theology / Religious Studies'
            ]],
            # Roles
            *[{'category': 'role', 'value': r} for r in [
                'Lead Pastor / Senior Pastor', 'Associate Pastor / Assistant Pastor',
                'Youth Pastor / Youth Leader', "Children's Pastor",
                'Worship Pastor / Music Director', 'Outreach / Evangelism Pastor',
                'Teaching / Bible Study Leader', 'Chaplain / Hospital Ministry'
            ]]
        ]
        
        # Add IDs
        for t in taxonomies:
            t['id'] = str(uuid.uuid4())
        
        await db.taxonomies.insert_many(taxonomies)
        logger.info(f"Seeded {len(taxonomies)} taxonomies")

# ===== BACKGROUND TASKS =====
async def cleanup_trash():
    """Background task to permanently delete listings in trash for > 30 days"""
    while True:
        try:
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            thirty_days_ago_iso = thirty_days_ago.isoformat()
            
            # Delete old churches in trash
            church_result = await db.churches.delete_many({
                "status": "trash",
                "trashed_at": {"$lte": thirty_days_ago_iso}
            })
            
            # Delete old pastors in trash
            pastor_result = await db.pastors.delete_many({
                "status": "trash",
                "trashed_at": {"$lte": thirty_days_ago_iso}
            })
            
            if church_result.deleted_count > 0 or pastor_result.deleted_count > 0:
                print(f"Cleanup: Deleted {church_result.deleted_count} churches and {pastor_result.deleted_count} pastors from trash.")
                
        except Exception as e:
            print(f"Cleanup task error: {e}")
            
        # Run every 24 hours
        await asyncio.sleep(24 * 3600)

@app.on_event("startup")
async def startup_event():
    # Start cleanup task
    asyncio.create_task(cleanup_trash())
    
    # Seed taxonomies and admin
    await seed_data()
    logger.info("Startup sequence complete: Background tasks and seeding initialized.")
 
