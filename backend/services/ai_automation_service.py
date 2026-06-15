from anthropic import Anthropic
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from services.email_service import send_email
from database import db
from bson import ObjectId

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

class AIAutomationService:
    @staticmethod
    async def generate_weekly_digest(church_id: str) -> Dict:
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        if not church or church.get("subscription_tier") not in ["standard", "premium"]:
            return {"success": False, "reason": "Not eligible"}
        
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        views = await db.analytics.count_documents({
            "church_id": church_id,
            "event_type": "page_view",
            "created_at": {"$gte": seven_days_ago}
        })
        
        new_followers = await db.followers.count_documents({
            "church_id": church_id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        event_registrations = await db.event_registrations.count_documents({
            "church_id": church_id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        new_reviews = await db.reviews.count_documents({
            "church_id": church_id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        checkins = await db.visitor_checkins.count_documents({
            "church_id": church_id,
            "created_at": {"$gte": seven_days_ago}
        })
        
        stats_summary = f"Views: {views}, New followers: {new_followers}, Event registrations: {event_registrations}, Reviews: {new_reviews}, Visitor check-ins: {checkins}"
        
        try:
            message = anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": f"Write a 3-sentence weekly summary for a church pastor. This week: {stats_summary}. Include one encouragement and one specific suggestion. Be warm and pastoral."
                }]
            )
            
            digest_text = message.content[0].text
            
            owner_email = church.get("owner_email") or church.get("contact_email")
            if owner_email:
                await send_email(
                    to_email=owner_email,
                    subject=f"Weekly Update for {church.get('name')}",
                    template="weekly_analytics",
                    context={
                        "church_name": church.get("name"),
                        "digest": digest_text,
                        "views": views,
                        "followers": new_followers,
                        "registrations": event_registrations,
                        "reviews": new_reviews,
                        "checkins": checkins
                    }
                )
            
            await db.weekly_digests.insert_one({
                "church_id": church_id,
                "digest": digest_text,
                "stats": {
                    "views": views,
                    "followers": new_followers,
                    "registrations": event_registrations,
                    "reviews": new_reviews,
                    "checkins": checkins
                },
                "sent_to": owner_email,
                "created_at": datetime.utcnow()
            })
            
            return {"success": True, "church_id": church_id, "email": owner_email}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def enrich_new_listing(church_id: str) -> Dict:
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        if not church:
            return {"success": False, "reason": "Church not found"}
        
        description = church.get("description", "")
        needs_description = len(description.strip()) < 50
        needs_tags = not church.get("tags") or len(church.get("tags", [])) == 0
        
        updates = {}
        
        if needs_description:
            try:
                prompt = f"""Write a welcoming 100-word church description in first person ("We are...").
                
Church name: {church.get('name')}
Denomination: {church.get('denomination', 'Christian')}
City: {church.get('city', '')}
Ministries: {', '.join(church.get('ministries', []))}
Services: {church.get('service_times', '')}
                
Make it warm, inviting, and describe what makes this church community special."""
                
                message = anthropic_client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=250,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                draft_description = message.content[0].text
                updates["draft_description"] = draft_description
                updates["ai_generated_description"] = True
            except Exception as e:
                updates["enrichment_error"] = str(e)
        
        if needs_tags:
            try:
                prompt = f"""Generate 5-10 relevant tags/keywords for this church. Return ONLY comma-separated tags, no explanation.
                
Church: {church.get('name')}
Denomination: {church.get('denomination', 'Christian')}
Ministries: {', '.join(church.get('ministries', []))}"""
                
                message = anthropic_client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=100,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                tags_text = message.content[0].text
                tags = [tag.strip() for tag in tags_text.split(',')]
                updates["tags"] = tags[:10]
            except Exception as e:
                if "enrichment_error" in updates:
                    updates["enrichment_error"] += f" | Tags: {str(e)}"
                else:
                    updates["enrichment_error"] = f"Tags: {str(e)}"
        
        if updates:
            updates["enriched_at"] = datetime.utcnow()
            await db.churches.update_one(
                {"_id": ObjectId(church_id)},
                {"$set": updates}
            )
        
        return {"success": True, "updates": list(updates.keys())}
    
    @staticmethod
    async def get_event_recommendations(user_id: str, limit: int = 5) -> List[Dict]:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return []
        
        user_location = user.get("city", "")
        followed_churches = await db.followers.find(
            {"user_id": user_id}
        ).distinct("church_id")
        
        attended_events = await db.event_registrations.find(
            {"user_id": user_id}
        ).distinct("event_id")
        
        user_denomination = user.get("denomination_preference", "")
        
        now = datetime.utcnow()
        upcoming_events = []
        
        async for event in db.events.find({
            "start_date": {"$gte": now},
            "status": "published",
            "_id": {"$nin": [ObjectId(eid) for eid in attended_events if ObjectId.is_valid(eid)]}
        }).limit(100):
            score = 0
            
            church = await db.churches.find_one({"_id": ObjectId(event["church_id"])})
            if not church:
                continue
            
            if event["church_id"] in followed_churches:
                score += 5
            
            if user_denomination and church.get("denomination") == user_denomination:
                score += 3
            
            if user_location and church.get("city") == user_location:
                score += 2
            
            days_until = (event["start_date"] - now).days
            if days_until <= 7:
                score += 2
            elif days_until <= 14:
                score += 1
            
            upcoming_events.append({
                "event": event,
                "church": church,
                "score": score
            })
        
        upcoming_events.sort(key=lambda x: x["score"], reverse=True)
        
        return [
            {
                "event_id": str(item["event"]["_id"]),
                "title": item["event"]["title"],
                "church_name": item["church"]["name"],
                "start_date": item["event"]["start_date"].isoformat(),
                "score": item["score"]
            }
            for item in upcoming_events[:limit]
        ]
    
    @staticmethod
    async def generate_newcomer_followup(visitor_id: str, church_id: str) -> Dict:
        visitor = await db.visitors.find_one({"_id": ObjectId(visitor_id)})
        church = await db.churches.find_one({"_id": ObjectId(church_id)})
        
        if not visitor or not church:
            return {"success": False, "reason": "Visitor or church not found"}
        
        if visitor.get("total_visits", 0) != 1:
            return {"success": False, "reason": "Not a first-time visitor"}
        
        try:
            prompt = f"""Write a warm, personal follow-up message for {visitor.get('name', 'our visitor')} who just visited {church.get('name')} for the first time. Keep it under 3 sentences, warm and not pushy. Sign it from the pastoral team."""
            
            message = anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            
            followup_message = message.content[0].text
            
            followup_doc = {
                "church_id": church_id,
                "visitor_id": visitor_id,
                "visitor_name": visitor.get("name"),
                "visitor_email": visitor.get("email"),
                "message": followup_message,
                "status": "pending",
                "generated_at": datetime.utcnow(),
                "sent_at": None
            }
            
            result = await db.followup_queue.insert_one(followup_doc)
            
            return {
                "success": True,
                "followup_id": str(result.inserted_id),
                "message": followup_message
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

ai_service = AIAutomationService()