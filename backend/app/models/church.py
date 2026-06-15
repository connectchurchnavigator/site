from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ChurchLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float]

class ChurchAddress(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    postcode: Optional[str] = None
    country: str = "United Kingdom"

class SocialConnection(BaseModel):
    connected: bool = False
    username: Optional[str] = None
    page_id: Optional[str] = None
    access_token: Optional[str] = None
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
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: ChurchAddress
    location: Optional[ChurchLocation] = None
    image_url: Optional[str] = None
    services: Optional[List[dict]] = []
    facilities: Optional[List[str]] = []
    social_connections: SocialConnections = SocialConnections()
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "St Mary's Church",
                "slug": "st-marys-church-london",
                "denomination": "Church of England",
                "description": "Historic church in central London",
                "website": "https://stmarys.church",
                "email": "info@stmarys.church",
                "phone": "020 1234 5678",
                "address": {
                    "street": "123 High Street",
                    "city": "London",
                    "postcode": "SW1A 1AA"
                }
            }
        }