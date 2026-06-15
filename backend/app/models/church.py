from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float]

class SocialConnection(BaseModel):
    connected: bool = False
    username: Optional[str] = None
    page_id: Optional[str] = None
    access_token_encrypted: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    last_synced: Optional[datetime] = None

class SocialConnections(BaseModel):
    instagram: SocialConnection = SocialConnection()
    facebook: SocialConnection = SocialConnection()

class Church(BaseModel):
    name: str
    slug: str
    denomination: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    location: Optional[Location] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    service_times: Optional[str] = None
    images: List[str] = []
    verified: bool = False
    claimed: bool = False
    owner_email: Optional[str] = None
    social_connections: SocialConnections = SocialConnections()
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }