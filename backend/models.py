from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class ChurchLocation(BaseModel):
    address: str
    city: str
    county: str
    postcode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ChurchContact(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None

class ChurchServiceTime(BaseModel):
    day: str
    time: str
    type: Optional[str] = None

class ChurchStats(BaseModel):
    views: int = 0
    checkins: int = 0
    followers: int = 0
    messages: int = 0
    events: int = 0

class Church(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    slug: str
    denomination: str
    description: Optional[str] = None
    location: ChurchLocation
    contact: Optional[ChurchContact] = None
    service_times: List[ChurchServiceTime] = []
    pastor_name: Optional[str] = None
    pastor_email: Optional[str] = None
    avatar: Optional[str] = None
    cover_photo: Optional[str] = None
    gallery: List[str] = []
    verified: bool = False
    featured: bool = False
    stats: ChurchStats = ChurchStats()
    is_parent: bool = False
    is_branch: bool = False
    parent_id: Optional[str] = None
    branches: List[str] = []
    branch_pastor_id: Optional[str] = None
    branch_label: Optional[str] = None
    network_name: Optional[str] = None
    owner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserListing(BaseModel):
    type: str
    listing_id: str
    listing_slug: str
    listing_name: str
    listing_avatar: Optional[str] = None
    role: str
    is_parent: bool = False
    parent_id: Optional[str] = None

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: str
    name: str
    avatar: Optional[str] = None
    phone: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    listings: List[UserListing] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ChurchCreate(BaseModel):
    name: str
    denomination: str
    location: ChurchLocation
    contact: Optional[ChurchContact] = None
    description: Optional[str] = None
    pastor_name: Optional[str] = None
    pastor_email: Optional[str] = None

class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    denomination: Optional[str] = None
    description: Optional[str] = None
    location: Optional[ChurchLocation] = None
    contact: Optional[ChurchContact] = None
    service_times: Optional[List[ChurchServiceTime]] = None
    pastor_name: Optional[str] = None
    pastor_email: Optional[str] = None
    avatar: Optional[str] = None
    cover_photo: Optional[str] = None
    network_name: Optional[str] = None

class BranchCreate(BaseModel):
    branch_slug: str
    branch_label: str
    branch_pastor_id: Optional[str] = None

class ListingAdd(BaseModel):
    type: str
    listing_id: str
    role: str = "viewer"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserRegister(BaseModel):
    email: str
    name: str
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class NetworkResponse(BaseModel):
    parent: Optional[Dict[str, Any]] = None
    branches: List[Dict[str, Any]] = []
    combined_stats: ChurchStats