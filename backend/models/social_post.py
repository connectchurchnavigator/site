from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class SocialPost(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    church_id: str
    platform: str
    post_id: str
    caption: Optional[str] = None
    message: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    permalink: str
    likes_count: Optional[int] = 0
    comments_count: Optional[int] = 0
    posted_at: datetime
    synced_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v)
        }
        populate_by_name = True