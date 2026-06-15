from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from .stripe_service import StripeService
import os

class PlannerSubscriptionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users
        self.stripe = StripeService()
        self.standard_price_id = os.getenv('STRIPE_PLANNER_STANDARD_PRICE_ID')
        self.premium_price_id = os.getenv('STRIPE_PLANNER_PREMIUM_PRICE_ID')
        self.standard_annual_price_id = os.getenv('STRIPE_PLANNER_STANDARD_ANNUAL_PRICE_ID')
        self.premium_annual_price_id = os.getenv('STRIPE_PLANNER_PREMIUM_ANNUAL_PRICE_ID')

    async def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        user = await self.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            raise ValueError('User not found')
        
        sub = user.get('planner_subscription', {
            'tier': 'free',
            'visit_requests_this_month': 0,
            'visit_requests_reset_date': datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)
        })
        
        if sub.get('visit_requests_reset_date') and sub['visit_requests_reset_date'] < datetime.utcnow():
            next_reset = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)
            next_reset = next_reset.replace(day=1)
            await self.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {
                    'planner_subscription.visit_requests_this_month': 0,
                    'planner_subscription.visit_requests_reset_date': next_reset
                }}
            )
            sub['visit_requests_this_month'] = 0
            sub['visit_requests_reset_date'] = next_reset
        
        return sub

    async def can_send_visit_request(self, user_id: str) -> tuple[bool, Optional[str]]:
        sub = await self.get_user_subscription(user_id)
        tier = sub.get('tier', 'free')
        
        if tier in ['standard', 'premium', 'denomination']:
            return True, None
        
        count = sub.get('visit_requests_this_month', 0)
        if count >= 3:
            reset_date = sub.get('visit_requests_reset_date', datetime.utcnow())
            days_until_reset = (reset_date - datetime.utcnow()).days
            return False, f'Free tier limit reached. Upgrade or wait {days_until_reset} days.'
        
        return True, None

    async def increment_visit_request(self, user_id: str):
        sub = await self.get_user_subscription(user_id)
        if sub.get('tier', 'free') == 'free':
            await self.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$inc': {'planner_subscription.visit_requests_this_month': 1}}
            )

    async def create_subscription(self, user_id: str, plan: str, annual: bool = False) -> str:
        user = await self.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            raise ValueError('User not found')
        
        email = user.get('email')
        if not email:
            raise ValueError('User email required')
        
        if plan == 'standard':
            price_id = self.standard_annual_price_id if annual else self.standard_price_id
        elif plan == 'premium':
            price_id = self.premium_annual_price_id if annual else self.premium_price_id
        else:
            raise ValueError('Invalid plan')
        
        stripe_customer_id = user.get('planner_subscription', {}).get('stripe_customer_id')
        if not stripe_customer_id:
            customer = await self.stripe.create_customer(email, user.get('name', ''))
            stripe_customer_id = customer.id
            await self.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {'planner_subscription.stripe_customer_id': stripe_customer_id}}
            )
        
        checkout_url = await self.stripe.create_subscription_checkout(
            stripe_customer_id,
            price_id,
            f'{os.getenv("FRONTEND_URL")}/planner/subscription/success',
            f'{os.getenv("FRONTEND_URL")}/planner/pricing',
            {'user_id': user_id, 'plan': plan}
        )
        
        return checkout_url

    async def cancel_subscription(self, user_id: str, at_period_end: bool = True):
        user = await self.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            raise ValueError('User not found')
        
        sub_id = user.get('planner_subscription', {}).get('stripe_subscription_id')
        if not sub_id:
            raise ValueError('No active subscription')
        
        await self.stripe.cancel_subscription(sub_id, at_period_end)
        
        if at_period_end:
            await self.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {'planner_subscription.cancel_at_period_end': True}}
            )
        else:
            await self.users.update_one(
                {'_id': ObjectId(user_id)},
                {'$set': {
                    'planner_subscription.tier': 'free',
                    'planner_subscription.stripe_subscription_id': None,
                    'planner_subscription.cancel_at_period_end': False,
                    'planner_subscription.current_period_end': None
                }}
            )

    async def handle_subscription_created(self, subscription):
        customer_id = subscription.customer
        user = await self.users.find_one({'planner_subscription.stripe_customer_id': customer_id})
        if not user:
            return
        
        price_id = subscription['items']['data'][0]['price']['id']
        
        if price_id in [self.standard_price_id, self.standard_annual_price_id]:
            tier = 'standard'
        elif price_id in [self.premium_price_id, self.premium_annual_price_id]:
            tier = 'premium'
        else:
            tier = 'free'
        
        await self.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'planner_subscription.tier': tier,
                'planner_subscription.stripe_subscription_id': subscription.id,
                'planner_subscription.current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'planner_subscription.cancel_at_period_end': False
            }}
        )

    async def handle_subscription_deleted(self, subscription):
        await self.users.update_one(
            {'planner_subscription.stripe_subscription_id': subscription.id},
            {'$set': {
                'planner_subscription.tier': 'free',
                'planner_subscription.stripe_subscription_id': None,
                'planner_subscription.current_period_end': None,
                'planner_subscription.cancel_at_period_end': False,
                'planner_subscription.visit_requests_this_month': 0
            }}
        )

    async def handle_subscription_updated(self, subscription):
        await self.users.update_one(
            {'planner_subscription.stripe_subscription_id': subscription.id},
            {'$set': {
                'planner_subscription.current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'planner_subscription.cancel_at_period_end': subscription.cancel_at_period_end
            }}
        )

    async def reset_monthly_limits(self):
        await self.users.update_many(
            {'planner_subscription.tier': 'free'},
            {'$set': {
                'planner_subscription.visit_requests_this_month': 0,
                'planner_subscription.visit_requests_reset_date': datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)
            }}
        )

    def check_feature_access(self, subscription: Dict[str, Any], feature: str) -> bool:
        tier = subscription.get('tier', 'free')
        
        feature_matrix = {
            'unlimited_visit_requests': ['standard', 'premium', 'denomination'],
            'ai_guided_planning': ['standard', 'premium', 'denomination'],
            'professional_pdf': ['standard', 'premium', 'denomination'],
            'templates_create': ['standard', 'premium', 'denomination'],
            'collaboration_basic': ['standard', 'premium', 'denomination'],
            'ai_intelligence': ['premium', 'denomination'],
            'unlimited_templates': ['premium', 'denomination'],
            'unlimited_collaborators': ['premium', 'denomination'],
            'analytics': ['premium', 'denomination'],
            'priority_support': ['premium', 'denomination']
        }
        
        return tier in feature_matrix.get(feature, [])
