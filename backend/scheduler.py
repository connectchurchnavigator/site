from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from .database import db

scheduler = AsyncIOScheduler()

async def reset_free_tier_visit_requests():
    """Reset visit request counters for free tier users on the 1st of each month"""
    next_reset = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)
    next_reset = next_reset.replace(day=1)
    
    result = db.users.update_many(
        {"planner_subscription.tier": "free"},
        {"$set": {
            "planner_subscription.visit_requests_this_month": 0,
            "planner_subscription.visit_requests_reset_date": next_reset
        }}
    )
    
    print(f"Reset visit requests for {result.modified_count} free tier users")

def start_scheduler():
    scheduler.add_job(
        reset_free_tier_visit_requests,
        'cron',
        day=1,
        hour=0,
        minute=0,
        id='reset_visit_requests'
    )
    scheduler.start()
    print("Scheduler started: Monthly visit request reset enabled")