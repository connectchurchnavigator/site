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
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class SmallGroupBase(BaseModel):
    church_id: str
    name: str
    description: str
    leader_name: str
    leader_contact: EmailStr
    meeting_day: str
    meeting_time: str
    frequency: str
    location_type: str
    address_or_link: str
    capacity: Optional[int] = None
    current_members: int = 0
    age_group: Optional[str] = None
    topics: List[str] = []
    is_open_to_join: bool = True

class SmallGroupCreate(SmallGroupBase):
    pass

class SmallGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    leader_name: Optional[str] = None
    leader_contact: Optional[EmailStr] = None
    meeting_day: Optional[str] = None
    meeting_time: Optional[str] = None
    frequency: Optional[str] = None
    location_type: Optional[str] = None
    address_or_link: Optional[str] = None
    capacity: Optional[int] = None
    current_members: Optional[int] = None
    age_group: Optional[str] = None
    topics: Optional[List[str]] = None
    is_open_to_join: Optional[bool] = None

class SmallGroup(SmallGroupBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class JoinRequest(BaseModel):
    name: str
    email: EmailStr
    message: Optional[str] = None
