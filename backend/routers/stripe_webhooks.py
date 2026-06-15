from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from datetime import datetime, timedelta
import stripe
import os
from typing import Dict
from database import get_database
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stripe", tags=["stripe"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

async def send_email(to_email: str, template: str, data: Dict):
    """Send email using Resend - implement based on existing email system"""
    # This should match your existing email sending implementation
    pass

async def handle_payment_failed(subscription_id: str, customer_id: str, attempt_count: int):
    """Handle failed payment with grace period system"""
    db = get_database()
    
    # Get subscription details
    subscription = db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
    if not subscription:
        logger.error(f"Subscription {subscription_id} not found")
        return
    
    user = db.users.find_one({"_id": ObjectId(subscription["user_id"])})
    if not user:
        logger.error(f"User {subscription['user_id']} not found")
        return
    
    failure_record = {
        "subscription_id": subscription_id,
        "user_id": subscription["user_id"],
        "failure_date": datetime.utcnow(),
        "attempt_count": attempt_count,
        "grace_period_end": datetime.utcnow() + timedelta(days=7),
        "final_deadline": datetime.utcnow() + timedelta(days=37),
        "status": "grace_period"
    }
    
    existing = db.payment_failures.find_one({"subscription_id": subscription_id, "status": {"$ne": "resolved"}})
    if existing:
        db.payment_failures.update_one(
            {"_id": existing["_id"]},
            {"$set": {"attempt_count": attempt_count, "last_attempt": datetime.utcnow()}}
        )
    else:
        db.payment_failures.insert_one(failure_record)
    
    days_since_first_failure = 0
    if existing:
        days_since_first_failure = (datetime.utcnow() - existing["failure_date"]).days
    
    if days_since_first_failure == 0:
        await send_email(user["email"], "payment_failed", {
            "user_name": user.get("name", "there"),
            "plan_name": subscription.get("plan_name", "your plan"),
            "amount": subscription.get("amount", 900) / 100,
            "update_url": f"https://churchnavigator.com/dashboard/billing"
        })
        logger.info(f"Sent initial payment failure email to {user['email']}")
    
    elif days_since_first_failure == 3:
        await send_email(user["email"], "payment_reminder_3days", {
            "user_name": user.get("name", "there"),
            "days_remaining": 4,
            "update_url": f"https://churchnavigator.com/dashboard/billing"
        })
        logger.info(f"Sent 3-day reminder to {user['email']}")
    
    elif days_since_first_failure >= 7:
        await suspend_church_website(subscription["user_id"])
        await send_email(user["email"], "website_suspended", {
            "user_name": user.get("name", "there"),
            "restore_url": f"https://churchnavigator.com/dashboard/billing"
        })
        db.payment_failures.update_one(
            {"subscription_id": subscription_id},
            {"$set": {"status": "suspended"}}
        )
        logger.info(f"Suspended website for user {subscription['user_id']}")
    
    elif days_since_first_failure == 30:
        await send_email(user["email"], "final_warning", {
            "user_name": user.get("name", "there"),
            "days_remaining": 7,
            "update_url": f"https://churchnavigator.com/dashboard/billing"
        })
        logger.info(f"Sent final warning to {user['email']}")
    
    elif days_since_first_failure >= 37:
        await release_church_domain(subscription["user_id"])
        await send_email(user["email"], "website_closed", {
            "user_name": user.get("name", "there"),
            "resubscribe_url": f"https://churchnavigator.com/pricing"
        })
        db.payment_failures.update_one(
            {"subscription_id": subscription_id},
            {"$set": {"status": "closed"}}
        )
        logger.info(f"Released domain and closed website for user {subscription['user_id']}")

async def suspend_church_website(user_id: str):
    """Suspend church website but keep domain registered"""
    db = get_database()
    result = db.church_websites.update_one(
        {"user_id": user_id},
        {"$set": {
            "hosting_status": "suspended",
            "suspended_at": datetime.utcnow(),
            "suspension_page_active": True
        }}
    )
    logger.info(f"Suspended website for user {user_id}: {result.modified_count} updated")

async def release_church_domain(user_id: str):
    """Release domain and delete website data"""
    db = get_database()
    website = db.church_websites.find_one({"user_id": user_id})
    
    if website and website.get("domain"):
        # TODO: Call Namecheap API to NOT renew domain
        logger.info(f"Released domain {website['domain']} for user {user_id}")
    
    db.church_websites.update_one(
        {"user_id": user_id},
        {"$set": {
            "hosting_status": "cancelled",
            "cancelled_at": datetime.utcnow(),
            "html_content": None,
            "suspension_page_active": False
        }}
    )

async def restore_church_website(user_id: str):
    """Restore suspended website after payment received"""
    db = get_database()
    result = db.church_websites.update_one(
        {"user_id": user_id},
        {"$set": {
            "hosting_status": "active",
            "restored_at": datetime.utcnow(),
            "suspension_page_active": False,
            "suspended_at": None
        }}
    )
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        await send_email(user["email"], "website_restored", {
            "user_name": user.get("name", "there"),
            "dashboard_url": "https://churchnavigator.com/dashboard"
        })
    
    db.payment_failures.update_many(
        {"user_id": user_id, "status": {"$ne": "resolved"}},
        {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}}
    )
    
    logger.info(f"Restored website for user {user_id}: {result.modified_count} updated")

@router.post("/webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event["type"]
    data = event["data"]["object"]
    
    logger.info(f"Received Stripe event: {event_type}")
    
    db = get_database()
    
    if event_type == "customer.subscription.created":
        subscription_data = {
            "user_id": data.get("metadata", {}).get("user_id"),
            "stripe_customer_id": data["customer"],
            "stripe_subscription_id": data["id"],
            "stripe_price_id": data["items"]["data"][0]["price"]["id"],
            "status": data["status"],
            "current_period_start": datetime.fromtimestamp(data["current_period_start"]),
            "current_period_end": datetime.fromtimestamp(data["current_period_end"]),
            "trial_end": datetime.fromtimestamp(data["trial_end"]) if data.get("trial_end") else None,
            "created_at": datetime.utcnow()
        }
        db.subscriptions.insert_one(subscription_data)
        logger.info(f"Created subscription record for {data['id']}")
    
    elif event_type == "customer.subscription.updated":
        db.subscriptions.update_one(
            {"stripe_subscription_id": data["id"]},
            {"$set": {
                "status": data["status"],
                "current_period_start": datetime.fromtimestamp(data["current_period_start"]),
                "current_period_end": datetime.fromtimestamp(data["current_period_end"]),
                "updated_at": datetime.utcnow()
            }}
        )
        logger.info(f"Updated subscription {data['id']}")
    
    elif event_type == "customer.subscription.deleted":
        subscription = db.subscriptions.find_one({"stripe_subscription_id": data["id"]})
        if subscription:
            db.subscriptions.update_one(
                {"_id": subscription["_id"]},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow()
                }}
            )
            background_tasks.add_task(suspend_church_website, subscription["user_id"])
            logger.info(f"Cancelled subscription {data['id']}")
    
    elif event_type == "invoice.paid":
        subscription_id = data.get("subscription")
        if subscription_id:
            subscription = db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
            if subscription:
                background_tasks.add_task(restore_church_website, subscription["user_id"])
        logger.info(f"Invoice paid for subscription {subscription_id}")
    
    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")
        attempt_count = data.get("attempt_count", 1)
        
        if subscription_id:
            background_tasks.add_task(
                handle_payment_failed,
                subscription_id,
                customer_id,
                attempt_count
            )
        logger.warning(f"Payment failed for subscription {subscription_id}, attempt {attempt_count}")
    
    elif event_type == "customer.subscription.trial_will_end":
        subscription_id = data["id"]
        subscription = db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
        if subscription:
            user = db.users.find_one({"_id": ObjectId(subscription["user_id"])})
            if user:
                background_tasks.add_task(
                    send_email,
                    user["email"],
                    "trial_ending",
                    {
                        "user_name": user.get("name", "there"),
                        "trial_end_date": datetime.fromtimestamp(data["trial_end"]).strftime("%B %d, %Y"),
                        "billing_url": "https://churchnavigator.com/dashboard/billing"
                    }
                )
        logger.info(f"Trial ending soon for subscription {subscription_id}")
    
    return {"status": "success"}

@router.get("/suspension-page/{domain}")
async def get_suspension_page(domain: str):
    """Generate suspension page HTML for a suspended church website"""
    db = get_database()
    website = db.church_websites.find_one({"domain": domain})
    
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    
    church = db.churches.find_one({"_id": ObjectId(website["church_id"])})
    church_name = church.get("name", "This Church") if church else "This Church"
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{church_name} - Temporarily Paused</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .container {{
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }}
        h1 {{ font-size: 32px; color: #333; margin-bottom: 20px; }}
        .emoji {{ font-size: 64px; margin-bottom: 20px; }}
        p {{ color: #666; line-height: 1.8; margin-bottom: 15px; font-size: 18px; }}
        .info {{ background: #f7f7f7; padding: 20px; border-radius: 10px; margin: 30px 0; }}
        .info strong {{ color: #333; display: block; margin-bottom: 10px; }}
        a {{ color: #667eea; text-decoration: none; font-weight: 600; }}
        a:hover {{ text-decoration: underline; }}
        .button {{
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            margin-top: 20px;
            font-weight: 600;
            transition: transform 0.2s;
        }}
        .button:hover {{
            transform: translateY(-2px);
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🙏</div>
        <h1>This church website is temporarily paused</h1>
        
        <p>If you're visiting <strong>{church_name}</strong>:</p>
        
        <div class="info">
            <strong>Find them on ChurchNavigator:</strong>
            <a href="https://churchnavigator.com/churches/{church.get('slug', '')}" target="_blank">View {church_name} →</a>
        </div>
        
        {f'''<div class="info">
            <strong>Contact them directly:</strong><br>
            {church.get('phone', 'N/A')} | {church.get('email', 'N/A')}
        </div>''' if church and (church.get('phone') or church.get('email')) else ''}
        
        <p style="margin-top: 40px;">If you're the church owner:</p>
        <a href="https://churchnavigator.com/login" class="button">Restore Your Website</a>
        
        <p style="margin-top: 40px; font-size: 14px; color: #999;">
            Questions? Contact us at <a href="mailto:support@churchnavigator.com">support@churchnavigator.com</a>
        </p>
        
        <a href="https://churchnavigator.com" style="display: block; margin-top: 30px; color: #999; font-size: 14px;">
            Search for other churches near you →
        </a>
    </div>
</body>
</html>"""
    
    return {"html": html}
