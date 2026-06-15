from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HomepageStats(BaseModel):
    churches: int
    events: int
    pastors: int
    cities: int
    registered_users: int
    visits_this_week: int

class ActivityItem(BaseModel):
    id: str = Field(alias="_id")
    type: str
    title: str
    subtitle: str
    icon: str
    color: str
    link: Optional[str] = None
    time_ago: str
    created_at: datetime
    
    class Config:
        populate_by_name = True

class ListingCounts(BaseModel):
    churches: int
    pastors: int
    worship_leaders: int
    media_teams: int
    events: int
    bible_colleges: int