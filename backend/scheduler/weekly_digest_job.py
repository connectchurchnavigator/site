from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
import asyncio
from services.ai_automation_service import AIAutomationService
from services.email_service import EmailService

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "DEV-ChurchNavigator")

scheduler = AsyncIOScheduler()

async def send_weekly_digests():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    ai_service = AIAutomationService(db)
    email_service = EmailService()
    
    try:
        print(f"[{datetime.utcnow()}] Starting weekly digest job...")
        
        churches = await db.churches.find({
            "subscription_tier": {"$in": ["standard", "premium"]},
            "owner_email": {"$exists": True, "$ne": ""}
        }).to_list(None)
        
        print(f"Found {len(churches)} eligible churches for weekly digest")
        
        sent_count = 0
        failed_count = 0
        
        for church in churches:
            try:
                church_id = str(church["_id"])
                digest = await ai_service.generate_weekly_digest(church_id)
                
                if digest:
                    email_sent = await email_service.send_weekly_analytics(
                        to_email=church["owner_email"],
                        church_name=church["name"],
                        stats=digest["stats"],
                        digest_text=digest["digest"]
                    )
                    
                    if email_sent:
                        sent_count += 1
                        await db.digest_history.insert_one(digest)
                    else:
                        failed_count += 1
                
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Error processing church {church.get('name')}: {e}")
                failed_count += 1
        
        print(f"[{datetime.utcnow()}] Weekly digest job complete. Sent: {sent_count}, Failed: {failed_count}")
    except Exception as e:
        print(f"Fatal error in weekly digest job: {e}")
    finally:
        client.close()

def start_scheduler():
    scheduler.add_job(
        send_weekly_digests,
        CronTrigger(day_of_week='mon', hour=8, minute=0, timezone='UTC'),
        id='weekly_digest',
        name='Weekly AI Digest',
        replace_existing=True
    )
    scheduler.start()
    print("Scheduler started: Weekly digest will run every Monday at 08:00 UTC")

def stop_scheduler():
    scheduler.shutdown()
