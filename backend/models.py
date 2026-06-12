from pydantic import BaseModel, Field, EmailStr
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
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class SpaceRental(BaseModel):
    enabled: bool = False
    type: Optional[str] = None
    space_name: Optional[str] = None
    capacity: Optional[int] = None
    available_days: Optional[List[str]] = []
    available_times: Optional[str] = None
    price_per_hour: Optional[float] = None
    price_per_day: Optional[float] = None
    currency: str = "GBP"
    minimum_hours: Optional[int] = None
    facilities_included: Optional[List[str]] = []
    suitable_for: Optional[List[str]] = []
    photos: Optional[List[str]] = []
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    instant_booking: bool = False
    available_from: Optional[str] = None

class SpaceNeeded(BaseModel):
    enabled: bool = False
    looking_for: Optional[str] = None
    required_capacity: Optional[int] = None
    preferred_days: Optional[List[str]] = []
    preferred_location: Optional[str] = None
    budget_per_hour: Optional[float] = None
    budget_per_month: Optional[float] = None
    needed_from: Optional[str] = None
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None

class SpaceEnquiry(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    preferred_dates: Optional[str] = None
    capacity_needed: Optional[int] = None

class Church(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    denomination: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    country: str = "United Kingdom"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_times: Optional[List[dict]] = []
    facilities: Optional[List[str]] = []
    photos: Optional[List[str]] = []
    logo: Optional[str] = None
    verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    space_rental: Optional[SpaceRental] = SpaceRental()
    space_needed: Optional[SpaceNeeded] = SpaceNeeded()

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "name": "St Mary's Church",
                "denomination": "Anglican",
                "city": "London",
                "postcode": "SW1A 1AA"
            }
        }