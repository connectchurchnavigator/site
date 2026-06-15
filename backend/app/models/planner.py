from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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

class ChurchVisit(BaseModel):
    church_id: str
    church_name: str
    day_number: int
    time_slot: str
    visit_type: str
    notes: Optional[str] = ""
    status: str = "pending"
    match_score: Optional[float] = None

class TripStructure(BaseModel):
    total_days: int
    cities: List[str]
    churches: List[ChurchVisit]
    daily_structure: List[Dict[str, Any]]

class MinistryTrip(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    org_id: Optional[str] = None
    missionary_name: str
    missionary_denomination: Optional[str] = ""
    ministry_focus: Optional[str] = ""
    languages: List[str] = []
    start_date: datetime
    end_date: datetime
    total_days: int
    cities: List[str] = []
    visits: List[ChurchVisit] = []
    status: str = "draft"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    collaborators: List[str] = []
    template_id: Optional[str] = None
    budget: Optional[float] = None
    notes: Optional[str] = ""

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TripTemplate(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    created_by_user_id: str
    org_id: Optional[str] = None
    name: str
    description: str
    tags: List[str] = []
    visibility: str = "private"
    trip_structure: TripStructure
    use_count: int = 0
    avg_trip_score: Optional[float] = None
    last_used: Optional[datetime] = None
    reviews: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ChurchPickerFilters(BaseModel):
    q: Optional[str] = None
    city: Optional[str] = None
    denomination: Optional[str] = None
    size: Optional[str] = None
    language: Optional[str] = None
    open_to_visits: Optional[bool] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius: Optional[float] = None
    trip_id: Optional[str] = None
    service_days: Optional[List[str]] = None
    skip: int = 0
    limit: int = 50