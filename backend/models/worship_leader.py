from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class WorshipLeader(BaseModel):
    slug: str
    leader_type: str  # "individual" | "team"
    name: str
    profile_picture: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    cover_type: Optional[str] = "image"  # "image" | "slider" | "youtube"
    cover_slider_images: Optional[List[str]] = []
    cover_youtube_url: Optional[str] = None
    bio: Optional[str] = None
    description: Optional[str] = None
    team_size: Optional[int] = None
    member_images: Optional[List[str]] = []
    instruments: List[str] = []
    worship_styles: List[str] = []
    languages: List[str] = []
    home_church: Optional[str] = None
    home_church_name: Optional[str] = None
    city: str
    available_for_booking: bool = True
    gallery_images: Optional[List[str]] = []
    video_urls: Optional[List[str]] = []
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    events_done: Optional[int] = 0
    years_active: Optional[int] = 0
    featured: bool = False
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BookingEnquiry(BaseModel):
    listing_type: str  # "worship_leader" | "media_team" | "space_rental"
    listing_slug: str
    listing_name: str
    your_name: str
    your_email: EmailStr
    your_phone: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    expected_attendance: Optional[int] = None
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)