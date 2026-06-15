from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Literal
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
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=500)
    leader_name: str = Field(..., max_length=100)
    leader_contact: EmailStr
    meeting_day: str = Field(..., max_length=20)
    meeting_time: str = Field(..., max_length=20)
    frequency: str = Field(..., max_length=50)
    location_type: Literal["in-person", "online", "hybrid"]
    address_or_link: str = Field(..., max_length=300)
    capacity: int = Field(..., ge=2, le=100)
    current_members: int = Field(default=0, ge=0)
    age_group: Optional[str] = Field(None, max_length=50)
    topics: List[str] = Field(default_factory=list)
    is_open_to_join: bool = Field(default=True)

class SmallGroupCreate(SmallGroupBase):
    church_id: str

class SmallGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    leader_name: Optional[str] = Field(None, max_length=100)
    leader_contact: Optional[EmailStr] = None
    meeting_day: Optional[str] = Field(None, max_length=20)
    meeting_time: Optional[str] = Field(None, max_length=20)
    frequency: Optional[str] = Field(None, max_length=50)
    location_type: Optional[Literal["in-person", "online", "hybrid"]] = None
    address_or_link: Optional[str] = Field(None, max_length=300)
    capacity: Optional[int] = Field(None, ge=2, le=100)
    current_members: Optional[int] = Field(None, ge=0)
    age_group: Optional[str] = Field(None, max_length=50)
    topics: Optional[List[str]] = None
    is_open_to_join: Optional[bool] = None

class SmallGroupInDB(SmallGroupBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    church_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class SmallGroupResponse(SmallGroupBase):
    id: str
    church_id: str
    created_at: datetime
    church_name: Optional[str] = None

class JoinRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: Optional[str] = Field(None, max_length=500)

class JoinRequestInDB(JoinRequest):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    group_id: str
    church_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}