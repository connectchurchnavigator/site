from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PlannerSubscription(BaseModel):
    tier: str = "free"
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    visit_requests_this_month: int = 0
    visit_requests_reset_date: Optional[datetime] = None
    org_id: Optional[str] = None

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: str
    name: str
    role: str = "user"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    stripe_customer_id: Optional[str] = None
    subscription_tier: str = "free"
    subscription_status: str = "inactive"
    planner_subscription: PlannerSubscription = Field(default_factory=PlannerSubscription)
    preferences: dict = Field(default_factory=dict)
    last_login: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
