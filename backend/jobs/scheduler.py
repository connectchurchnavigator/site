from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from services.automation_service import automation_service
from services.email_service import email_service

scheduler = AsyncIOScheduler()

async def send_weekly_digests():
    print(f"Starting weekly digest job at {datetime.utcnow()}")
    try:
        client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
        db = client[os.getenv('MONGODB_DB', 'ChurchNavigator')]
        
        churches = await db.churches.find({
            'subscription_tier': {'$in': ['standard', 'premium']},
            'owner_email': {'$exists': True, '$ne': ''}
        }).to_list(length=None)
        
        sent_count = 0
        for church in churches:
            try:
                digest = await automation_service.generate_weekly_digest(str(church['_id']))
                if digest:
                    await email_service.send_weekly_digest(
                        to=church['owner_email'],
                        church_name=church['name'],
                        stats=digest['stats'],
                        summary=digest['summary']
                    )
                    sent_count += 1
                    await asyncio.sleep(0.5)
            except Exception as e:
                print(f"Error sending digest to {church['name']}: {e}")
        
        print(f"Weekly digest job completed. Sent {sent_count} emails.")
    except Exception as e:
        print(f"Weekly digest job error: {e}")

def start_scheduler():
    scheduler.add_job(
        send_weekly_digests,
        CronTrigger(day_of_week='mon', hour=8, minute=0, timezone='UTC'),
        id='weekly_digest',
        name='Send weekly church digests',
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler started. Weekly digests will run every Monday at 08:00 UTC.")

def shutdown_scheduler():
    scheduler.shutdown()
    print("Scheduler shut down.")
