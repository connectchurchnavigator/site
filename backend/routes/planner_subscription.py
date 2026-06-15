from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from backend.services.planner_subscription_service import PlannerSubscriptionService
from backend.dependencies import get_current_user, get_database
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/planner", tags=["planner_subscription"])

class SubscribeRequest(BaseModel):
    plan: str
    success_url: Optional[str] = "https://churchnavigator.com/planner/subscription/success"
    cancel_url: Optional[str] = "https://churchnavigator.com/planner/pricing"

@router.get("/subscription-status")
async def get_subscription_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = PlannerSubscriptionService(db)
    try:
        status = await service.get_subscription_status(str(current_user["_id"]))
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscribe")
async def create_subscription(
    request: SubscribeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if request.plan not in ["standard", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    service = PlannerSubscriptionService(db)
    try:
        checkout_url = await service.create_subscription(
            str(current_user["_id"]),
            request.plan,
            request.success_url,
            request.cancel_url
        )
        return {"checkout_url": checkout_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = PlannerSubscriptionService(db)
    try:
        success = await service.cancel_subscription(str(current_user["_id"]))
        return {"success": success, "message": "Subscription will be cancelled at period end"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-feature")
async def check_feature(
    feature: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    service = PlannerSubscriptionService(db)
    status = await service.get_subscription_status(str(current_user["_id"]))
    
    tier = status["tier"]
    limits = status["limits"]
    
    feature_map = {
        "ai_planning": limits.get("ai_planning", False),
        "ai_intelligence": limits.get("ai_intelligence", False),
        "professional_pdf": limits.get("professional_pdf", False),
        "unlimited_requests": limits.get("visit_requests_per_month", 0) == -1
    }
    
    has_access = feature_map.get(feature, False)
    
    return {
        "feature": feature,
        "has_access": has_access,
        "current_tier": tier,
        "required_tier": "standard" if feature in ["ai_planning", "professional_pdf"] else "premium"
    }
