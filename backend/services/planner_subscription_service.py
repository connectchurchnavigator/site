import os
from datetime import datetime, timedelta
from typing import Optional, Dict
import stripe
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

STRIPE_PLANNER_STANDARD_PRICE_ID = os.getenv("STRIPE_PLANNER_STANDARD_PRICE_ID")
STRIPE_PLANNER_PREMIUM_PRICE_ID = os.getenv("STRIPE_PLANNER_PREMIUM_PRICE_ID")

TIER_LIMITS = {
    "free": {
        "visit_requests_per_month": 3,
        "templates_limit": 0,
        "collaborators_limit": 1,
        "ai_planning": False,
        "ai_intelligence": False,
        "professional_pdf": False
    },
    "standard": {
        "visit_requests_per_month": -1,
        "templates_limit": 5,
        "collaborators_limit": 3,
        "ai_planning": True,
        "ai_intelligence": False,
        "professional_pdf": True
    },
    "premium": {
        "visit_requests_per_month": -1,
        "templates_limit": -1,
        "collaborators_limit": -1,
        "ai_planning": True,
        "ai_intelligence": True,
        "professional_pdf": True
    },
    "denomination": {
        "visit_requests_per_month": -1,
        "templates_limit": -1,
        "collaborators_limit": -1,
        "ai_planning": True,
        "ai_intelligence": True,
        "professional_pdf": True
    }
}

class PlannerSubscriptionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users

    async def get_subscription_status(self, user_id: str) -> Dict:
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        planner_sub = user.get("planner_subscription", {})
        tier = planner_sub.get("tier", "free")
        limits = TIER_LIMITS[tier]
        
        return {
            "tier": tier,
            "limits": limits,
            "usage": {
                "visit_requests_this_month": planner_sub.get("visit_requests_this_month", 0),
                "visit_requests_reset_date": planner_sub.get("visit_requests_reset_date")
            },
            "subscription": {
                "stripe_subscription_id": planner_sub.get("stripe_subscription_id"),
                "current_period_end": planner_sub.get("current_period_end"),
                "cancel_at_period_end": planner_sub.get("cancel_at_period_end", False)
            }
        }

    async def create_subscription(self, user_id: str, plan: str, success_url: str, cancel_url: str) -> str:
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        if plan not in ["standard", "premium"]:
            raise ValueError("Invalid plan")
        
        price_id = STRIPE_PLANNER_STANDARD_PRICE_ID if plan == "standard" else STRIPE_PLANNER_PREMIUM_PRICE_ID
        
        if not price_id:
            raise ValueError(f"Stripe price ID not configured for {plan}")
        
        stripe_customer_id = user.get("planner_subscription", {}).get("stripe_customer_id")
        
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=user["email"],
                name=user.get("name"),
                metadata={"user_id": user_id, "product": "planner"}
            )
            stripe_customer_id = customer.id
            await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"planner_subscription.stripe_customer_id": stripe_customer_id}}
            )
        
        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            subscription_data={"trial_period_days": 14},
            metadata={"user_id": user_id, "plan": plan, "product": "planner"}
        )
        
        return session.url

    async def cancel_subscription(self, user_id: str) -> bool:
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        planner_sub = user.get("planner_subscription", {})
        subscription_id = planner_sub.get("stripe_subscription_id")
        
        if not subscription_id:
            raise ValueError("No active subscription")
        
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"planner_subscription.cancel_at_period_end": True}}
        )
        
        return True

    async def handle_subscription_created(self, subscription):
        customer_id = subscription.customer
        subscription_id = subscription.id
        
        price_id = subscription.items.data[0].price.id
        if price_id == STRIPE_PLANNER_STANDARD_PRICE_ID:
            tier = "standard"
        elif price_id == STRIPE_PLANNER_PREMIUM_PRICE_ID:
            tier = "premium"
        else:
            tier = "free"
        
        current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        
        await self.users.update_one(
            {"planner_subscription.stripe_customer_id": customer_id},
            {
                "$set": {
                    "planner_subscription.tier": tier,
                    "planner_subscription.stripe_subscription_id": subscription_id,
                    "planner_subscription.current_period_end": current_period_end,
                    "planner_subscription.cancel_at_period_end": False
                }
            }
        )

    async def handle_subscription_deleted(self, subscription):
        customer_id = subscription.customer
        
        await self.users.update_one(
            {"planner_subscription.stripe_customer_id": customer_id},
            {
                "$set": {
                    "planner_subscription.tier": "free",
                    "planner_subscription.stripe_subscription_id": None,
                    "planner_subscription.current_period_end": None,
                    "planner_subscription.cancel_at_period_end": False,
                    "planner_subscription.visit_requests_this_month": 0
                }
            }
        )

    async def handle_subscription_updated(self, subscription):
        customer_id = subscription.customer
        current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        cancel_at_period_end = subscription.cancel_at_period_end
        
        await self.users.update_one(
            {"planner_subscription.stripe_customer_id": customer_id},
            {
                "$set": {
                    "planner_subscription.current_period_end": current_period_end,
                    "planner_subscription.cancel_at_period_end": cancel_at_period_end
                }
            }
        )

    async def check_visit_request_limit(self, user_id: str) -> bool:
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return False
        
        planner_sub = user.get("planner_subscription", {})
        tier = planner_sub.get("tier", "free")
        
        if tier != "free":
            return True
        
        limit = TIER_LIMITS["free"]["visit_requests_per_month"]
        current_count = planner_sub.get("visit_requests_this_month", 0)
        
        return current_count < limit

    async def increment_visit_request(self, user_id: str):
        user = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        planner_sub = user.get("planner_subscription", {})
        reset_date = planner_sub.get("visit_requests_reset_date")
        
        if not reset_date or reset_date < datetime.utcnow():
            next_month = datetime.utcnow().replace(day=1) + timedelta(days=32)
            reset_date = next_month.replace(day=1)
            await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "planner_subscription.visit_requests_this_month": 1,
                        "planner_subscription.visit_requests_reset_date": reset_date
                    }
                }
            )
        else:
            await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"planner_subscription.visit_requests_this_month": 1}}
            )

    async def reset_monthly_limits(self):
        next_month = datetime.utcnow().replace(day=1) + timedelta(days=32)
        reset_date = next_month.replace(day=1)
        
        await self.users.update_many(
            {"planner_subscription.tier": "free"},
            {
                "$set": {
                    "planner_subscription.visit_requests_this_month": 0,
                    "planner_subscription.visit_requests_reset_date": reset_date
                }
            }
        )
