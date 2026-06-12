from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    plan: str = 'free'
    created_at: datetime = datetime.utcnow()
    
    class Config:
        from_attributes = True
