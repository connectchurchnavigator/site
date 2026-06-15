from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from services.ai_automation_service import ai_service
from database import db
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def run_weekly_digest_job():
    logger.info("Starting weekly digest job")
    try:
        churches = await db.churches.find({
            "subscription_tier": {"$in": ["standard", "premium"]},
            "status": "active"
        }).to_list(length=None)
        
        success_count = 0
        error_count = 0
        
        for church in churches:
            church_id = str(church["_id"])
            result = await ai_service.generate_weekly_digest(church_id)
            if result.get("success"):
                success_count += 1
            else:
                error_count += 1
                logger.error(f"Failed digest for {church_id}: {result.get('reason')}")
        
        logger.info(f"Weekly digest job complete. Success: {success_count}, Errors: {error_count}")
    except Exception as e:
        logger.error(f"Weekly digest job failed: {str(e)}")

def start_scheduler():
    scheduler.add_job(
        run_weekly_digest_job,
        trigger=CronTrigger(day_of_week='mon', hour=8, minute=0),
        id='weekly_digest',
        name='Weekly AI Digest',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started. Weekly digest job scheduled for Monday 8:00 AM UTC.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler stopped.")