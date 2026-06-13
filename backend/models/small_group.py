from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class LocationType(str, Enum):
    IN_PERSON = "in-person"
    ONLINE = "online"
    HYBRID = "hybrid"

class Frequency(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"

class SmallGroupBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=500)
    leader_name: str = Field(..., min_length=2, max_length=100)
    leader_contact: EmailStr
    meeting_day: str = Field(..., pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    meeting_time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    frequency: Frequency
    location_type: LocationType
    address_or_link: str = Field(..., max_length=300)
    capacity: int = Field(ge=2, le=100)
    current_members: int = Field(default=0, ge=0)
    age_group: Optional[str] = Field(None, max_length=50)
    topics: List[str] = Field(default_factory=list, max_items=10)
    is_open_to_join: bool = True

class SmallGroupCreate(SmallGroupBase):
    church_id: str

class SmallGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    leader_name: Optional[str] = Field(None, min_length=2, max_length=100)
    leader_contact: Optional[EmailStr] = None
    meeting_day: Optional[str] = Field(None, pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    meeting_time: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    frequency: Optional[Frequency] = None
    location_type: Optional[LocationType] = None
    address_or_link: Optional[str] = Field(None, max_length=300)
    capacity: Optional[int] = Field(None, ge=2, le=100)
    current_members: Optional[int] = Field(None, ge=0)
    age_group: Optional[str] = Field(None, max_length=50)
    topics: Optional[List[str]] = Field(None, max_items=10)
    is_open_to_join: Optional[bool] = None

class SmallGroup(SmallGroupBase):
    id: str
    church_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class JoinRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    message: Optional[str] = Field(None, max_length=500)
