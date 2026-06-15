from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from app.database import db
from app.services.ai_planner_service import ai_planner_service
from app.services.email_service import email_service
from bson import ObjectId
import asyncio

scheduler = AsyncIOScheduler()

async def check_pre_visit_briefings():
    now = datetime.utcnow()
    cutoff = now + timedelta(hours=48)
    
    visits_cursor = db.planner_visits.find({
        "scheduled_datetime": {"$gte": now, "$lte": cutoff},
        "status": "confirmed",
        "briefing_sent": {"$ne": True}
    })
    
    visits = await visits_cursor.to_list(length=100)
    
    for visit in visits:
        try:
            church = await db.churches.find_one({"_id": ObjectId(visit["church_id"])})
            if not church:
                continue
            
            church["_id"] = str(church["_id"])
            visit["_id"] = str(visit["_id"])
            
            briefing = await ai_planner_service.generate_briefing(str(visit["_id"]), church, visit)
            
            minister = await db.users.find_one({"_id": ObjectId(visit["minister_id"])})
            if minister and minister.get("email"):
                await email_service.send_email(
                    to_email=minister["email"],
                    subject=f"Pre-Visit Briefing: {church['name']}",
                    template="pre_visit_briefing",
                    context={
                        "minister_name": minister.get("name", "Minister"),
                        "church_name": church["name"],
                        "visit_date": visit["scheduled_datetime"].strftime("%A, %d %B %Y at %I:%M %p"),
                        "briefing": briefing
                    }
                )
            
            await db.planner_visits.update_one(
                {"_id": visit["_id"]},
                {"$set": {"briefing": briefing, "briefing_sent": True, "briefing_sent_at": datetime.utcnow()}}
            )
        except Exception as e:
            print(f"Error generating briefing for visit {visit.get('_id')}: {e}")

async def check_post_visit_debriefs():
    now = datetime.utcnow()
    cutoff_start = now - timedelta(hours=4)
    cutoff_end = now - timedelta(hours=3)
    
    visits_cursor = db.planner_visits.find({
        "scheduled_datetime": {"$gte": cutoff_start, "$lte": cutoff_end},
        "status": "confirmed",
        "debrief_generated": {"$ne": True}
    })
    
    visits = await visits_cursor.to_list(length=100)
    
    for visit in visits:
        try:
            visit["_id"] = str(visit["_id"])
            if "church_id" in visit:
                visit["church_id"] = str(visit["church_id"])
            
            church_feedback = visit.get("church_feedback")
            debrief = await ai_planner_service.generate_debrief(str(visit["_id"]), visit, church_feedback)
            
            await db.planner_visits.update_one(
                {"_id": ObjectId(visit["_id"])},
                {"$set": {"debrief": debrief, "debrief_generated": True, "debrief_generated_at": datetime.utcnow()}}
            )
        except Exception as e:
            print(f"Error generating debrief for visit {visit.get('_id')}: {e}")

def start_planner_jobs():
    scheduler.add_job(check_pre_visit_briefings, 'cron', hour=9, minute=0, id='pre_visit_briefings')
    scheduler.add_job(check_post_visit_debriefs, 'cron', hour='*/2', minute=0, id='post_visit_debriefs')
    scheduler.start()