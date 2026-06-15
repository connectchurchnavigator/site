from fastapi import APIRouter, Request, HTTPException
import stripe
import os
from datetime import datetime
from ..database import db
from ..email_service import send_email

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PLANNER_STANDARD_PRICE_ID = os.getenv("STRIPE_PLANNER_STANDARD_PRICE_ID")
STRIPE_PLANNER_PREMIUM_PRICE_ID = os.getenv("STRIPE_PLANNER_PREMIUM_PRICE_ID")

@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("metadata", {}).get("type") == "church_boost":
            await handle_church_boost_payment(session)
        elif session.get("mode") == "subscription":
            await handle_subscription_created(session)
    
    elif event["type"] == "customer.subscription.created":
        subscription = event["data"]["object"]
        await handle_planner_subscription_created(subscription)
    
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_deleted(subscription)
    
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(invoice)
    
    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        await handle_invoice_paid(invoice)
    
    return {"status": "success"}

async def handle_church_boost_payment(session):
    church_id = session["metadata"].get("church_id")
    boost_type = session["metadata"].get("boost_type")
    duration = int(session["metadata"].get("duration_months", 1))
    
    if boost_type == "featured":
        expiry = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        for _ in range(duration):
            expiry = expiry.replace(day=28) + timedelta(days=4)
            expiry = expiry.replace(day=1)
        
        db.churches.update_one(
            {"_id": church_id},
            {"$set": {"featured": True, "featured_until": expiry}}
        )
    
    elif boost_type == "verified":
        db.churches.update_one(
            {"_id": church_id},
            {"$set": {"verified": True, "verified_date": datetime.utcnow()}}
        )

async def handle_subscription_created(session):
    user_id = session["metadata"].get("user_id")
    plan = session["metadata"].get("plan")
    
    if not user_id or not plan:
        return
    
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")
    
    db.users.update_one(
        {"_id": user_id},
        {"$set": {
            "planner_subscription.tier": plan,
            "planner_subscription.stripe_subscription_id": subscription_id,
            "planner_subscription.stripe_customer_id": customer_id,
            "planner_subscription.cancel_at_period_end": False
        }}
    )

async def handle_planner_subscription_created(subscription):
    customer_id = subscription["customer"]
    subscription_id = subscription["id"]
    price_id = subscription["items"]["data"][0]["price"]["id"]
    current_period_end = datetime.fromtimestamp(subscription["current_period_end"])
    
    tier = "standard" if price_id == STRIPE_PLANNER_STANDARD_PRICE_ID else "premium"
    
    user = db.users.find_one({"planner_subscription.stripe_customer_id": customer_id})
    if not user:
        return
    
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "planner_subscription.tier": tier,
            "planner_subscription.stripe_subscription_id": subscription_id,
            "planner_subscription.current_period_end": current_period_end,
            "planner_subscription.cancel_at_period_end": False
        }}
    )
    
    template = "planner_welcome_standard" if tier == "standard" else "planner_welcome_premium"
    await send_email(
        to_email=user["email"],
        template_id=template,
        data={"name": user.get("name", "Minister"), "tier": tier.title()}
    )

async def handle_subscription_deleted(subscription):
    customer_id = subscription["customer"]
    
    user = db.users.find_one({"planner_subscription.stripe_customer_id": customer_id})
    if not user:
        return
    
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "planner_subscription.tier": "free",
            "planner_subscription.stripe_subscription_id": None,
            "planner_subscription.current_period_end": None,
            "planner_subscription.visit_requests_this_month": 0
        }}
    )
    
    await send_email(
        to_email=user["email"],
        template_id="planner_cancellation",
        data={"name": user.get("name", "Minister")}
    )

async def handle_payment_failed(invoice):
    customer_id = invoice["customer"]
    
    user = db.users.find_one({"planner_subscription.stripe_customer_id": customer_id})
    if not user:
        return
    
    await send_email(
        to_email=user["email"],
        template_id="payment_failed",
        data={"name": user.get("name", "Minister"), "amount": invoice["amount_due"] / 100}
    )

async def handle_invoice_paid(invoice):
    customer_id = invoice["customer"]
    db.payment_logs.insert_one({
        "customer_id": customer_id,
        "invoice_id": invoice["id"],
        "amount": invoice["amount_paid"],
        "paid_at": datetime.utcnow()
    })