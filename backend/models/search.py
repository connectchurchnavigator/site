from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class SearchResult(BaseModel):
    id: str = Field(alias="_id")
    name: str
    slug: str
    city: str
    type: str
    denomination: Optional[str] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    rating: Optional[float] = None
    total_reviews: Optional[int] = 0
    is_verified: Optional[bool] = False
    description: Optional[str] = None
    search_score: Optional[float] = None
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    total: int
    page: int
    limit: int
    query: str
