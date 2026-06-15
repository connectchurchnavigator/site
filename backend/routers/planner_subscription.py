from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import os
import stripe
from ..auth import get_current_user
from ..database import db

router = APIRouter(prefix="/api/planner", tags=["planner_subscription"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PLANNER_STANDARD_PRICE_ID = os.getenv("STRIPE_PLANNER_STANDARD_PRICE_ID")
STRIPE_PLANNER_PREMIUM_PRICE_ID = os.getenv("STRIPE_PLANNER_PREMIUM_PRICE_ID")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://churchnavigator.com")

class SubscribeRequest(BaseModel):
    plan: str

class VisitRequestCreate(BaseModel):
    church_id: str
    trip_id: str
    preferred_date: Optional[str] = None
    message: Optional[str] = None

@router.post("/subscribe")
async def create_subscription(request: SubscribeRequest, current_user: dict = Depends(get_current_user)):
    if request.plan not in ["standard", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    price_id = STRIPE_PLANNER_STANDARD_PRICE_ID if request.plan == "standard" else STRIPE_PLANNER_PREMIUM_PRICE_ID
    
    user = db.users.find_one({"_id": current_user["_id"]})
    stripe_customer_id = user.get("planner_subscription", {}).get("stripe_customer_id")
    
    if not stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.get("email"),
            name=user.get("name"),
            metadata={"user_id": str(user["_id"]), "type": "planner"}
        )
        stripe_customer_id = customer.id
    
    checkout_session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{FRONTEND_URL}/planner/subscription-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/planner/pricing",
        subscription_data={"trial_period_days": 14},
        metadata={"user_id": str(user["_id"]), "plan": request.plan}
    )
    
    return {"checkout_url": checkout_session.url}

@router.post("/cancel-subscription")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    user = db.users.find_one({"_id": current_user["_id"]})
    subscription_data = user.get("planner_subscription", {})
    
    if not subscription_data.get("stripe_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription")
    
    stripe.Subscription.modify(
        subscription_data["stripe_subscription_id"],
        cancel_at_period_end=True
    )
    
    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"planner_subscription.cancel_at_period_end": True}}
    )
    
    return {"message": "Subscription will cancel at period end"}

@router.get("/subscription-status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    user = db.users.find_one({"_id": current_user["_id"]})
    subscription = user.get("planner_subscription", {
        "tier": "free",
        "visit_requests_this_month": 0,
        "visit_requests_reset_date": None
    })
    
    if subscription.get("tier") == "free":
        reset_date = subscription.get("visit_requests_reset_date")
        if not reset_date or reset_date < datetime.utcnow():
            next_month = datetime.utcnow().replace(day=1) + timedelta(days=32)
            reset_date = next_month.replace(day=1)
            db.users.update_one(
                {"_id": current_user["_id"]},
                {"$set": {"planner_subscription.visit_requests_reset_date": reset_date}}
            )
        
        return {
            "tier": "free",
            "visit_requests_used": subscription.get("visit_requests_this_month", 0),
            "visit_requests_limit": 3,
            "reset_date": reset_date.isoformat() if reset_date else None
        }
    
    return {
        "tier": subscription.get("tier"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "visit_requests_used": subscription.get("visit_requests_this_month", 0),
        "visit_requests_limit": "unlimited"
    }

@router.post("/visit-requests")
async def create_visit_request(request: VisitRequestCreate, current_user: dict = Depends(get_current_user)):
    user = db.users.find_one({"_id": current_user["_id"]})
    subscription = user.get("planner_subscription", {"tier": "free", "visit_requests_this_month": 0})
    
    if subscription.get("tier") == "free":
        if subscription.get("visit_requests_this_month", 0) >= 3:
            raise HTTPException(
                status_code=402,
                detail={
                    "message": "Visit request limit reached",
                    "upgrade_required": True,
                    "current_usage": subscription.get("visit_requests_this_month"),
                    "limit": 3
                }
            )
    
    visit_request = {
        "user_id": current_user["_id"],
        "church_id": request.church_id,
        "trip_id": request.trip_id,
        "preferred_date": request.preferred_date,
        "message": request.message,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = db.visit_requests.insert_one(visit_request)
    
    if subscription.get("tier") == "free":
        db.users.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"planner_subscription.visit_requests_this_month": 1}}
        )
    
    return {"id": str(result.inserted_id), "status": "pending"}

@router.get("/usage-stats")
async def get_usage_stats(current_user: dict = Depends(get_current_user)):
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    trips_count = db.trips.count_documents({
        "user_id": current_user["_id"],
        "created_at": {"$gte": start_of_month}
    })
    
    visit_requests = list(db.visit_requests.find({
        "user_id": current_user["_id"],
        "created_at": {"$gte": start_of_month}
    }))
    
    confirmed_visits = len([r for r in visit_requests if r.get("status") == "confirmed"])
    unique_churches = len(set([r["church_id"] for r in visit_requests]))
    
    ai_analyses = db.ai_analyses.count_documents({
        "user_id": current_user["_id"],
        "created_at": {"$gte": start_of_month}
    })
    
    templates_used = db.template_usage.count_documents({
        "user_id": current_user["_id"],
        "created_at": {"$gte": start_of_month}
    })
    
    collaborators = db.trip_collaborators.count_documents({
        "user_id": current_user["_id"],
        "created_at": {"$gte": start_of_month}
    })
    
    return {
        "trips_created": trips_count,
        "visit_requests_sent": len(visit_requests),
        "visits_confirmed": confirmed_visits,
        "churches_reached": unique_churches,
        "ai_analyses_run": ai_analyses,
        "templates_used": templates_used,
        "collaborators_added": collaborators
    }