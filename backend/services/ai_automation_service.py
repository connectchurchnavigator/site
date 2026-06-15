from anthropic import Anthropic
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

class AIAutomationService:
    def __init__(self, db):
        self.db = db
        self.anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-3-haiku-20240307"
    
    async def generate_weekly_digest(self, church_id: str) -> Optional[Dict]:
        try:
            church = await self.db.churches.find_one({"_id": ObjectId(church_id)})
            if not church or church.get("subscription_tier") not in ["standard", "premium"]:
                return None
            
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            
            analytics = await self.db.analytics.find({
                "church_id": church_id,
                "date": {"$gte": seven_days_ago}
            }).to_list(None)
            
            total_views = sum(a.get("views", 0) for a in analytics)
            
            followers = await self.db.followers.count_documents({
                "church_id": church_id,
                "followed_at": {"$gte": seven_days_ago}
            })
            
            event_registrations = await self.db.event_registrations.count_documents({
                "church_id": church_id,
                "registered_at": {"$gte": seven_days_ago}
            })
            
            reviews = await self.db.reviews.count_documents({
                "church_id": church_id,
                "created_at": {"$gte": seven_days_ago}
            })
            
            visitor_checkins = await self.db.visitor_checkins.count_documents({
                "church_id": church_id,
                "checked_in_at": {"$gte": seven_days_ago}
            })
            
            stats = {
                "views": total_views,
                "new_followers": followers,
                "event_registrations": event_registrations,
                "new_reviews": reviews,
                "visitor_checkins": visitor_checkins
            }
            
            prompt = f"""Write a 3-sentence weekly summary for a church pastor. This week: {stats['views']} profile views, {stats['new_followers']} new followers, {stats['event_registrations']} event registrations, {stats['new_reviews']} reviews, {stats['visitor_checkins']} visitor check-ins. Include one encouragement and one specific suggestion."""
            
            message = self.anthropic.messages.create(
                model=self.model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            
            digest_text = message.content[0].text
            
            return {
                "church_id": church_id,
                "church_name": church.get("name"),
                "stats": stats,
                "digest": digest_text,
                "generated_at": datetime.utcnow()
            }
        except Exception as e:
            print(f"Error generating digest for {church_id}: {e}")
            return None
    
    async def enrich_new_listing(self, church_id: str) -> Dict:
        try:
            church = await self.db.churches.find_one({"_id": ObjectId(church_id)})
            if not church:
                return {"success": False, "error": "Church not found"}
            
            enriched = {"description_generated": False, "tags_generated": False}
            
            description = church.get("description", "")
            if not description or len(description) < 50:
                prompt = f"""Write a welcoming 100-word description in first person ('We are...') for this church listing:
                
Name: {church.get('name')}
Denomination: {church.get('denomination', 'Christian')}
City: {church.get('city')}
Ministries: {', '.join(church.get('ministries', []))}
Service times: {church.get('service_times', 'Sunday services')}
                
Make it warm, inclusive, and inviting to newcomers."""
                
                message = self.anthropic.messages.create(
                    model=self.model,
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                draft_description = message.content[0].text
                
                await self.db.churches.update_one(
                    {"_id": ObjectId(church_id)},
                    {"$set": {
                        "draft_description": draft_description,
                        "ai_generated_description": True,
                        "description_needs_review": True
                    }}
                )
                enriched["description_generated"] = True
            
            tags = church.get("tags", [])
            if not tags or len(tags) < 3:
                denomination = church.get("denomination", "Christian")
                ministries = church.get("ministries", [])
                city = church.get("city", "")
                
                auto_tags = [denomination.lower()]
                for ministry in ministries[:5]:
                    auto_tags.append(ministry.lower().replace(" ", "-"))
                if city:
                    auto_tags.append(city.lower())
                auto_tags.append("family-friendly")
                auto_tags.append("community-church")
                
                auto_tags = list(set(auto_tags))[:10]
                
                await self.db.churches.update_one(
                    {"_id": ObjectId(church_id)},
                    {"$set": {"tags": auto_tags, "tags_ai_generated": True}}
                )
                enriched["tags_generated"] = True
            
            return {"success": True, "enriched": enriched}
        except Exception as e:
            print(f"Error enriching listing {church_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_event_recommendations(self, user_id: str, limit: int = 5) -> List[Dict]:
        try:
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return []
            
            user_location = user.get("city", "")
            user_denomination = user.get("denomination_preference", "")
            
            followed_churches = await self.db.followers.find(
                {"user_id": user_id}
            ).to_list(None)
            followed_church_ids = [f["church_id"] for f in followed_churches]
            
            attended_events = await self.db.event_registrations.find(
                {"user_id": user_id}
            ).to_list(None)
            attended_event_ids = [str(e["event_id"]) for e in attended_events]
            
            pipeline = [
                {
                    "$match": {
                        "start_date": {"$gte": datetime.utcnow()},
                        "_id": {"$nin": [ObjectId(eid) for eid in attended_event_ids if ObjectId.is_valid(eid)]}
                    }
                },
                {
                    "$lookup": {
                        "from": "churches",
                        "localField": "church_id",
                        "foreignField": "_id",
                        "as": "church"
                    }
                },
                {"$unwind": "$church"},
                {
                    "$addFields": {
                        "score": {
                            "$add": [
                                {"$cond": [{"$in": ["$church_id", followed_church_ids]}, 5, 0]},
                                {"$cond": [{"$eq": ["$church.denomination", user_denomination]}, 3, 0]},
                                {"$cond": [{"$eq": ["$church.city", user_location]}, 2, 0]},
                                {"$divide": [{"$subtract": ["$start_date", datetime.utcnow()]}, 86400000]}
                            ]
                        }
                    }
                },
                {"$sort": {"score": -1}},
                {"$limit": limit},
                {
                    "$project": {
                        "_id": 1,
                        "title": 1,
                        "description": 1,
                        "start_date": 1,
                        "church_name": "$church.name",
                        "church_id": "$church._id",
                        "city": "$church.city",
                        "score": 1
                    }
                }
            ]
            
            recommendations = await self.db.events.aggregate(pipeline).to_list(None)
            
            for rec in recommendations:
                rec["_id"] = str(rec["_id"])
                rec["church_id"] = str(rec["church_id"])
            
            return recommendations
        except Exception as e:
            print(f"Error getting recommendations for {user_id}: {e}")
            return []
    
    async def generate_newcomer_followup(self, church_id: str, visitor_id: str, visitor_name: str) -> Optional[str]:
        try:
            church = await self.db.churches.find_one({"_id": ObjectId(church_id)})
            if not church:
                return None
            
            church_name = church.get("name")
            
            prompt = f"""Write a warm, personal follow-up message for {visitor_name} who just visited {church_name} for the first time. Keep it under 3 sentences, warm and not pushy. Sign it from 'The {church_name} Team'."""
            
            message = self.anthropic.messages.create(
                model=self.model,
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            
            followup_text = message.content[0].text
            
            await self.db.followup_queue.insert_one({
                "church_id": church_id,
                "visitor_id": visitor_id,
                "visitor_name": visitor_name,
                "message": followup_text,
                "generated_at": datetime.utcnow(),
                "status": "pending",
                "sent_at": None
            })
            
            return followup_text
        except Exception as e:
            print(f"Error generating followup for visitor {visitor_id}: {e}")
            return None
