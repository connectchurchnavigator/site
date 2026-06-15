from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

class SocialPost(BaseModel):
    church_id: str
    platform: str
    post_id: str
    caption: Optional[str] = None
    image_url: Optional[str] = None
    permalink: str
    likes_count: int = 0
    comments_count: int = 0
    posted_at: datetime
    synced_at: datetime

    class Config:
        json_encoders = {ObjectId: str}