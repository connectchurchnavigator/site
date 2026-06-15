from pydantic import BaseModel, Field
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

class VisitorCheckIn(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    visitor_name: str
    visitor_email: Optional[str]
    visitor_phone: Optional[str]
    check_in_date: datetime
    is_first_time: bool
    visit_purpose: Optional[str]
    notes: Optional[str]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class ContactMessage(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    sender_name: str
    sender_email: str
    sender_phone: Optional[str]
    message: str
    received_at: datetime
    is_read: bool = False
    is_archived: bool = False
    replied_at: Optional[datetime]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class Follower(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    user_email: str
    user_name: Optional[str]
    followed_at: datetime
    location: Optional[dict]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class ChurchPost(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    title: str
    content: str
    image_url: Optional[str]
    created_at: datetime
    scheduled_for: Optional[datetime]
    is_published: bool = False
    views: int = 0
    likes: int = 0
    shares: int = 0
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class SpaceRentalEnquiry(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    enquirer_name: str
    enquirer_email: str
    enquirer_phone: Optional[str]
    event_type: str
    event_date: Optional[datetime]
    guest_count: Optional[int]
    message: str
    enquiry_date: datetime
    status: str = "pending"
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class PageView(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    church_slug: str
    viewed_at: datetime
    referrer: Optional[str]
    search_term: Optional[str]
    device_type: str
    ip_address: str
    country: Optional[str]
    city: Optional[str]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class ChurchSettings(BaseModel):
    church_slug: str
    notification_email: bool = True
    notification_sms: bool = False
    facebook_url: Optional[str]
    youtube_url: Optional[str]
    instagram_url: Optional[str]
    is_pro: bool = False
    space_rental_enabled: bool = False
    space_rental_details: Optional[dict]
    
    class Config:
        arbitrary_types_allowed = True