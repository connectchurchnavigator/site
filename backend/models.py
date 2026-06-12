from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
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

class VisitPreferences(BaseModel):
    open_to_visits: bool = False
    preferred_days: List[str] = []
    preferred_times: List[str] = []
    denomination_preference: Optional[str] = None
    min_notice_weeks: int = 2
    max_visits_per_month: int = 2
    welcome_message: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "open_to_visits": True,
                "preferred_days": ["Sunday", "Wednesday"],
                "preferred_times": ["Morning", "Evening"],
                "denomination_preference": "Any",
                "min_notice_weeks": 4,
                "max_visits_per_month": 2,
                "welcome_message": "We welcome visiting ministers to share God's word with our congregation."
            }
        }

class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float]

class SocialMedia(BaseModel):
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None

class Church(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    slug: str
    denomination: str
    address: str
    city: str
    postcode: str
    country: str = "United Kingdom"
    location: Optional[Location] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    pastor_name: Optional[str] = None
    service_times: Optional[str] = None
    image_url: Optional[str] = None
    social_media: Optional[SocialMedia] = None
    verified: bool = False
    visit_preferences: Optional[VisitPreferences] = None
    owner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Pastor(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    slug: str
    title: Optional[str] = "Pastor"
    denomination: Optional[str] = None
    church_name: Optional[str] = None
    church_slug: Optional[str] = None
    bio: Optional[str] = None
    specialties: List[str] = []
    years_experience: Optional[int] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    location: Optional[Location] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    image_url: Optional[str] = None
    social_media: Optional[SocialMedia] = None
    verified: bool = False
    visit_preferences: Optional[VisitPreferences] = None
    owner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class VisitInvitation(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    from_church_slug: str
    from_church_name: str
    to_type: str
    to_slug: str
    to_name: str
    message: str
    proposed_dates: List[str]
    contact_email: str
    contact_phone: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}