from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.services.planner_subscription_service import PlannerSubscriptionService
from backend.dependencies import get_database
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def reset_monthly_visit_limits():
    try:
        db = await get_database()
        service = PlannerSubscriptionService(db)
        await service.reset_monthly_limits()
        logger.info("Monthly visit request limits reset successfully")
    except Exception as e:
        logger.error(f"Error resetting monthly limits: {str(e)}")

def start_scheduler():
    scheduler.add_job(
        reset_monthly_visit_limits,
        'cron',
        day=1,
        hour=0,
        minute=0,
        id='reset_monthly_limits'
    )
    scheduler.start()
    logger.info("Monthly reset scheduler started")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Monthly reset scheduler stopped")
