from fastapi import APIRouter, Request, HTTPException
import stripe
import os
from backend.services.planner_subscription_service import PlannerSubscriptionService
from backend.dependencies import get_database

router = APIRouter()

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    db = await get_database()
    planner_service = PlannerSubscriptionService(db)
    
    event_type = event["type"]
    data = event["data"]["object"]
    
    if event_type == "customer.subscription.created":
        await planner_service.handle_subscription_created(data)
    
    elif event_type == "customer.subscription.updated":
        await planner_service.handle_subscription_updated(data)
    
    elif event_type == "customer.subscription.deleted":
        await planner_service.handle_subscription_deleted(data)
    
    elif event_type == "invoice.payment_failed":
        pass
    
    elif event_type == "invoice.paid":
        pass
    
    return {"status": "success"}
