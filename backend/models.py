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

class Church(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    address: Optional[str]
    city: Optional[str]
    postcode: Optional[str]
    denomination: Optional[str]
    website: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    pastor_name: Optional[str]
    congregation_size: Optional[int]
    service_times: Optional[List[str]]
    latitude: Optional[float]
    longitude: Optional[float]
    imagekit_id: Optional[str]
    description: Optional[str]
    facilities: Optional[List[str]]
    ministries: Optional[List[str]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    email: str
    name: Optional[str]
    role: Optional[str]
    created_at: Optional[datetime]
    phone: Optional[str]
    ministry_name: Optional[str]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TripMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime

class TripCollaborator(BaseModel):
    user_id: Optional[str]
    email: str
    name: Optional[str]
    role: str
    invited_at: datetime
    accepted_at: Optional[datetime]
    last_viewed_at: Optional[datetime]
    invite_token: Optional[str]

class TripVisit(BaseModel):
    church_id: str
    church_name: str
    service_time: datetime
    service_type: Optional[str]
    confirmed: bool = False
    confirmed_at: Optional[datetime]
    status: str = "pending"
    notes: Optional[str]
    accommodation_offered: bool = False
    meal_offered: bool = False
    estimated_honorarium: Optional[float]
    estimated_attendance: Optional[int]
    contact_name: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    parking_notes: Optional[str]

class TripAnalysis(BaseModel):
    cost_analysis: Dict[str, Any]
    time_analysis: Dict[str, Any]
    impact_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    recommendations: List[str]
    overall_score: int
    generated_at: datetime

class MinistryTrip(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    user_id: str
    title: Optional[str]
    start_date: datetime
    end_date: datetime
    status: str = "planning"
    trip_details: Dict[str, Any]
    conversation: List[TripMessage]
    visits: List[TripVisit]
    collaborators: List[TripCollaborator] = []
    analysis: Optional[TripAnalysis]
    pdf_generated_at: Optional[datetime]
    share_token: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class ChatMessage(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    trip_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    sent_at: datetime
    read_by: List[str] = []

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class WorshipLeader(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    denomination: Optional[str]
    experience_years: Optional[int]
    instruments: Optional[List[str]]
    genres: Optional[List[str]]
    availability: Optional[str]
    bio: Optional[str]
    profile_image: Optional[str]
    created_at: Optional[datetime]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class MediaTeamMember(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    skills: Optional[List[str]]
    equipment: Optional[List[str]]
    experience_years: Optional[int]
    availability: Optional[str]
    portfolio_url: Optional[str]
    bio: Optional[str]
    profile_image: Optional[str]
    created_at: Optional[datetime]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Event(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    title: str
    church_id: Optional[str]
    church_name: Optional[str]
    event_type: str
    start_date: datetime
    end_date: Optional[datetime]
    description: Optional[str]
    speaker: Optional[str]
    address: Optional[str]
    city: Optional[str]
    postcode: Optional[str]
    registration_url: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    image_url: Optional[str]
    is_featured: bool = False
    created_at: Optional[datetime]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}