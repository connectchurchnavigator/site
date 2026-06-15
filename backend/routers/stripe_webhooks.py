from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from datetime import datetime, timedelta
import stripe
import os
import resend
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
resend.api_key = os.environ.get("RESEND_API_KEY")
mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = mongo_client.ChurchNavigator

GRACE_PERIOD_DAYS = {
    "first_warning": 0,
    "second_warning": 3,
    "suspension": 7,
    "final_warning": 30,
    "cancellation": 37
}

async def send_email(to: str, template: str, data: dict):
    templates = {
        "payment_failed": {
            "subject": "Payment Failed - Update Your Card",
            "html": f"""
            <h2>Payment Failed</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>Your recent payment for ChurchNavigator Sites failed.</p>
            <p>Please update your payment method to keep your website live:</p>
            <p><a href="https://churchnavigator.com/dashboard/billing">Update Payment Method</a></p>
            <p>Your website will remain live for 7 days while you update your payment.</p>
            """
        },
        "payment_reminder": {
            "subject": "Reminder: Update Your Payment - 4 Days Until Suspension",
            "html": f"""
            <h2>Payment Reminder</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>Your payment is still outstanding. Your website will be suspended in 4 days if payment is not received.</p>
            <p><a href="https://churchnavigator.com/dashboard/billing">Update Payment Now</a></p>
            """
        },
        "site_suspended": {
            "subject": "Website Suspended - Payment Required",
            "html": f"""
            <h2>Website Suspended</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>Your church website has been temporarily suspended due to non-payment.</p>
            <p>Update your payment to restore your website immediately:</p>
            <p><a href="https://churchnavigator.com/dashboard/billing">Restore Website</a></p>
            <p>Your domain is safe for 30 more days.</p>
            """
        },
        "final_warning": {
            "subject": "Final Warning - Domain Will Be Released in 7 Days",
            "html": f"""
            <h2>Final Warning</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>This is your final warning. Your domain will be released in 7 days if payment is not received.</p>
            <p><a href="https://churchnavigator.com/dashboard/billing">Restore Now</a></p>
            """
        },
        "site_cancelled": {
            "subject": "Website Closed",
            "html": f"""
            <h2>Website Closed</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>Your church website has been closed and your domain released.</p>
            <p>You can create a new website anytime at ChurchNavigator.com</p>
            """
        },
        "site_restored": {
            "subject": "Welcome Back! Your Website Is Live",
            "html": f"""
            <h2>Welcome Back!</h2>
            <p>Hi {data.get('church_name', 'there')},</p>
            <p>Your payment has been received and your website is live again.</p>
            <p><a href="https://{data.get('domain', 'churchnavigator.com')}">View Your Website</a></p>
            """
        }
    }
    
    template_data = templates.get(template)
    if not template_data:
        return
    
    try:
        resend.Emails.send({
            "from": "ChurchNavigator <noreply@churchnavigator.com>",
            "to": [to],
            "subject": template_data["subject"],
            "html": template_data["html"]
        })
    except Exception as e:
        print(f"Email send error: {str(e)}")

async def handle_payment_failed(subscription_id: str, invoice_id: str):
    sub = await db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
    if not sub or sub.get("product_type") != "sites":
        return
    
    church = await db.churches.find_one({"_id": sub["church_id"]})
    if not church:
        return
    
    user = await db.users.find_one({"_id": sub["user_id"]})
    if not user:
        return
    
    failed_at = datetime.utcnow()
    await db.subscriptions.update_one(
        {"_id": sub["_id"]},
        {"$set": {
            "payment_failed_at": failed_at,
            "grace_period_status": "first_warning"
        }}
    )
    
    await send_email(
        user["email"],
        "payment_failed",
        {"church_name": church["name"]}
    )

async def handle_payment_restored(subscription_id: str):
    sub = await db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
    if not sub or sub.get("product_type") != "sites":
        return
    
    church = await db.churches.find_one({"_id": sub["church_id"]})
    if not church:
        return
    
    user = await db.users.find_one({"_id": sub["user_id"]})
    if not user:
        return
    
    await db.subscriptions.update_one(
        {"_id": sub["_id"]},
        {"$unset": {"payment_failed_at": "", "grace_period_status": ""}}
    )
    
    await db.churches.update_one(
        {"_id": church["_id"]},
        {"$set": {"hosting_status": "active"}}
    )
    
    await send_email(
        user["email"],
        "site_restored",
        {"church_name": church["name"], "domain": church.get("custom_domain", "")}
    )

async def handle_subscription_deleted(subscription_id: str):
    sub = await db.subscriptions.find_one({"stripe_subscription_id": subscription_id})
    if not sub:
        return
    
    await db.subscriptions.update_one(
        {"_id": sub["_id"]},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.utcnow()
        }}
    )
    
    if sub.get("product_type") == "sites":
        church = await db.churches.find_one({"_id": sub["church_id"]})
        user = await db.users.find_one({"_id": sub["user_id"]})
        
        if church and user:
            await db.churches.update_one(
                {"_id": church["_id"]},
                {"$set": {"hosting_status": "pending_cancellation"}}
            )

@router.post("/webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
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
    
    if event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        invoice_id = data.get("id")
        background_tasks.add_task(handle_payment_failed, subscription_id, invoice_id)
        
    elif event_type == "invoice.paid":
        subscription_id = data.get("subscription")
        background_tasks.add_task(handle_payment_restored, subscription_id)
        
    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        background_tasks.add_task(handle_subscription_deleted, subscription_id)
    
    return {"status": "success"}
