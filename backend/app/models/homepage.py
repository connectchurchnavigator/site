from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HomepageStats(BaseModel):
    churches: int
    events: int
    pastors: int
    cities: int
    registered_users: int
    visits_this_week: int

class HomepageActivity(BaseModel):
    type: str
    title: str
    subtitle: str
    icon: str
    color: str
    link: Optional[str] = None
    church_id: Optional[str] = None
    created_at: datetime
    time_ago: Optional[str] = None

class ListingCounts(BaseModel):
    churches: int
    pastors: int
    worship_leaders: int
    media_teams: int
    events: int
    bible_colleges: int