import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import anthropic
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import asyncio

class AutomationService:
    def __init__(self):
        self.client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
        self.db = self.client[os.getenv('MONGODB_DB', 'ChurchNavigator')]
        self.claude = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

    async def generate_weekly_digest(self, church_id: str) -> Optional[Dict]:
        try:
            church = await self.db.churches.find_one({'_id': ObjectId(church_id)})
            if not church or church.get('subscription_tier') not in ['standard', 'premium']:
                return None

            last_week = datetime.utcnow() - timedelta(days=7)
            
            views_count = await self.db.analytics.count_documents({
                'church_id': church_id,
                'event_type': 'view',
                'timestamp': {'$gte': last_week}
            })
            
            new_followers = await self.db.followers.count_documents({
                'church_id': church_id,
                'created_at': {'$gte': last_week}
            })
            
            event_registrations = await self.db.event_registrations.count_documents({
                'church_id': church_id,
                'created_at': {'$gte': last_week}
            })
            
            new_reviews = await self.db.reviews.count_documents({
                'church_id': church_id,
                'created_at': {'$gte': last_week}
            })
            
            checkins = await self.db.visitors.count_documents({
                'church_id': church_id,
                'last_visit': {'$gte': last_week}
            })

            stats_text = f"Views: {views_count}, New followers: {new_followers}, Event registrations: {event_registrations}, New reviews: {new_reviews}, Check-ins: {checkins}"

            message = self.claude.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": f"Write a 3-sentence weekly summary for a church pastor. This week: {stats_text}. Include one encouragement and one specific suggestion. Be warm and supportive."
                }]
            )

            summary = message.content[0].text

            return {
                'church_id': church_id,
                'church_name': church.get('name'),
                'stats': {
                    'views': views_count,
                    'followers': new_followers,
                    'registrations': event_registrations,
                    'reviews': new_reviews,
                    'checkins': checkins
                },
                'summary': summary,
                'week_ending': datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error generating digest for {church_id}: {e}")
            return None

    async def enrich_church_listing(self, church_id: str) -> Dict:
        try:
            church = await self.db.churches.find_one({'_id': ObjectId(church_id)})
            if not church:
                return {'error': 'Church not found'}

            enrichments = {}
            description = church.get('description', '')
            
            if not description or len(description) < 50:
                prompt = f"""Write a welcoming 100-word description for this church listing:
Name: {church.get('name')}
Denomination: {church.get('denomination', 'Christian')}
City: {church.get('city')}
Ministries: {', '.join(church.get('ministries', []))}
Services: {church.get('service_times', 'Sunday services')}

Write in first person ('We are...'), warm and inviting tone."""

                message = self.claude.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}]
                )

                enrichments['draft_description'] = message.content[0].text
                enrichments['ai_generated_description'] = True

            tags = church.get('tags', [])
            if len(tags) < 3:
                tag_prompt = f"""Generate 8 relevant tags/keywords for this church:
Name: {church.get('name')}
Denomination: {church.get('denomination', 'Christian')}
Ministries: {', '.join(church.get('ministries', []))}

Return only comma-separated tags, no explanations."""

                message = self.claude.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=100,
                    messages=[{"role": "user", "content": tag_prompt}]
                )

                suggested_tags = [t.strip() for t in message.content[0].text.split(',')]
                enrichments['suggested_tags'] = suggested_tags[:10]

            if enrichments:
                await self.db.churches.update_one(
                    {'_id': ObjectId(church_id)},
                    {'$set': enrichments}
                )

            return enrichments
        except Exception as e:
            print(f"Error enriching church {church_id}: {e}")
            return {'error': str(e)}

    async def get_event_recommendations(self, user_id: str, limit: int = 5) -> List[Dict]:
        try:
            user = await self.db.users.find_one({'_id': ObjectId(user_id)})
            if not user:
                return []

            followed_churches = user.get('followed_churches', [])
            user_location = user.get('city', '')
            user_denomination = user.get('preferred_denomination', '')

            now = datetime.utcnow()
            pipeline = [
                {'$match': {
                    'start_date': {'$gte': now},
                    'status': 'published'
                }},
                {'$lookup': {
                    'from': 'churches',
                    'localField': 'church_id',
                    'foreignField': '_id',
                    'as': 'church'
                }},
                {'$unwind': '$church'},
                {'$addFields': {
                    'score': {
                        '$add': [
                            {'$cond': [{'$in': ['$church_id', followed_churches]}, 5, 0]},
                            {'$cond': [{'$eq': ['$church.city', user_location]}, 2, 0]},
                            {'$cond': [{'$eq': ['$church.denomination', user_denomination]}, 3, 0]},
                            {'$divide': [{'$subtract': [now, '$start_date']}, -86400000]}
                        ]
                    }
                }},
                {'$sort': {'score': -1}},
                {'$limit': limit},
                {'$project': {
                    'title': 1,
                    'description': 1,
                    'start_date': 1,
                    'church_name': '$church.name',
                    'church_id': 1,
                    'image': 1,
                    'score': 1
                }}
            ]

            recommendations = await self.db.events.aggregate(pipeline).to_list(length=limit)
            for rec in recommendations:
                rec['_id'] = str(rec['_id'])
                rec['church_id'] = str(rec['church_id'])
            return recommendations
        except Exception as e:
            print(f"Error getting recommendations for {user_id}: {e}")
            return []

    async def generate_newcomer_followup(self, visitor_id: str, church_id: str) -> Optional[Dict]:
        try:
            visitor = await self.db.visitors.find_one({'_id': ObjectId(visitor_id)})
            church = await self.db.churches.find_one({'_id': ObjectId(church_id)})
            
            if not visitor or not church:
                return None

            if visitor.get('total_visits', 0) != 1:
                return None

            prompt = f"""Write a warm, personal follow-up message for {visitor.get('name')} who just visited {church.get('name')} for the first time. Keep it under 3 sentences, warm and not pushy. Sign it from the pastoral team."""

            message = self.claude.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )

            followup_message = message.content[0].text

            followup_doc = {
                'church_id': church_id,
                'visitor_id': visitor_id,
                'visitor_name': visitor.get('name'),
                'message': followup_message,
                'generated_at': datetime.utcnow(),
                'status': 'pending',
                'sent_at': None
            }

            result = await self.db.followup_queue.insert_one(followup_doc)
            followup_doc['_id'] = str(result.inserted_id)

            return followup_doc
        except Exception as e:
            print(f"Error generating followup for visitor {visitor_id}: {e}")
            return None

automation_service = AutomationService()
