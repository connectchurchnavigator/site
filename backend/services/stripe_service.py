import os
import stripe
from typing import Dict, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class StripeService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        self.price_id_standard = os.getenv('STRIPE_PRICE_ID_STANDARD')
        self.price_id_premium = os.getenv('STRIPE_PRICE_ID_PREMIUM')
    
    async def create_subscription(self, church_id: str, plan: str, domain: str, tld: str, email: str) -> Dict:
        church = await self.db.churches.find_one({'_id': church_id})
        if not church:
            raise Exception('Church not found')
        
        customer_id = church.get('stripe_customer_id')
        
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                metadata={
                    'church_id': church_id,
                    'church_name': church.get('name', ''),
                    'domain': f"{domain}.{tld}"
                }
            )
            customer_id = customer.id
            
            await self.db.churches.update_one(
                {'_id': church_id},
                {'$set': {'stripe_customer_id': customer_id}}
            )
        
        price_id = self.price_id_standard if plan == 'standard' else self.price_id_premium
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            mode='subscription',
            success_url=f"https://churchnavigator.com/sites/success?session_id={{CHECKOUT_SESSION_ID}}&church_id={church_id}",
            cancel_url=f"https://churchnavigator.com/churches/{church.get('slug')}/manage?tab=website",
            metadata={
                'church_id': church_id,
                'plan': plan,
                'domain': domain,
                'tld': tld
            }
        )
        
        await self.db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'plan': plan,
                'requested_domain': f"{domain}.{tld}",
                'stripe_session_id': session.id,
                'created_at': datetime.utcnow(),
                'hosting_status': 'pending_payment'
            }},
            upsert=True
        )
        
        return {
            'checkout_url': session.url,
            'session_id': session.id
        }
    
    async def handle_webhook(self, payload: bytes, sig_header: str) -> Dict:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
        except Exception as e:
            raise Exception(f'Webhook signature verification failed: {str(e)}')
        
        event_type = event['type']
        data = event['data']['object']
        
        if event_type == 'checkout.session.completed':
            return await self._handle_checkout_completed(data)
        elif event_type == 'customer.subscription.created':
            return await self._handle_subscription_created(data)
        elif event_type == 'customer.subscription.updated':
            return await self._handle_subscription_updated(data)
        elif event_type == 'customer.subscription.deleted':
            return await self._handle_subscription_deleted(data)
        elif event_type == 'invoice.paid':
            return await self._handle_invoice_paid(data)
        elif event_type == 'invoice.payment_failed':
            return await self._handle_payment_failed(data)
        
        return {'status': 'ignored', 'event_type': event_type}
    
    async def _handle_checkout_completed(self, session: Dict) -> Dict:
        church_id = session['metadata'].get('church_id')
        domain = session['metadata'].get('domain')
        tld = session['metadata'].get('tld')
        plan = session['metadata'].get('plan')
        subscription_id = session.get('subscription')
        
        await self.db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'stripe_subscription_id': subscription_id,
                'payment_completed_at': datetime.utcnow(),
                'hosting_status': 'payment_received'
            }}
        )
        
        return {
            'status': 'success',
            'action': 'start_domain_purchase',
            'church_id': church_id,
            'domain': domain,
            'tld': tld
        }
    
    async def _handle_subscription_created(self, subscription: Dict) -> Dict:
        customer_id = subscription['customer']
        subscription_id = subscription['id']
        
        church = await self.db.churches.find_one({'stripe_customer_id': customer_id})
        if church:
            await self.db.church_sites.update_one(
                {'church_id': str(church['_id'])},
                {'$set': {
                    'stripe_subscription_id': subscription_id,
                    'subscription_status': subscription['status'],
                    'current_period_end': datetime.fromtimestamp(subscription['current_period_end'])
                }}
            )
        
        return {'status': 'subscription_created'}
    
    async def _handle_subscription_updated(self, subscription: Dict) -> Dict:
        subscription_id = subscription['id']
        
        await self.db.church_sites.update_one(
            {'stripe_subscription_id': subscription_id},
            {'$set': {
                'subscription_status': subscription['status'],
                'current_period_end': datetime.fromtimestamp(subscription['current_period_end'])
            }}
        )
        
        return {'status': 'subscription_updated'}
    
    async def _handle_subscription_deleted(self, subscription: Dict) -> Dict:
        subscription_id = subscription['id']
        
        await self.db.church_sites.update_one(
            {'stripe_subscription_id': subscription_id},
            {'$set': {
                'subscription_status': 'cancelled',
                'cancelled_at': datetime.utcnow(),
                'hosting_status': 'suspended'
            }}
        )
        
        return {'status': 'subscription_cancelled', 'action': 'suspend_site'}
    
    async def _handle_invoice_paid(self, invoice: Dict) -> Dict:
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return {'status': 'ignored'}
        
        site = await self.db.church_sites.find_one({'stripe_subscription_id': subscription_id})
        if site and site.get('expiry_date'):
            expiry = site['expiry_date']
            if expiry < datetime.utcnow() + timedelta(days=60):
                return {
                    'status': 'success',
                    'action': 'renew_domain',
                    'church_id': site['church_id']
                }
        
        return {'status': 'invoice_paid'}
    
    async def _handle_payment_failed(self, invoice: Dict) -> Dict:
        subscription_id = invoice.get('subscription')
        customer_email = invoice.get('customer_email')
        
        if subscription_id:
            await self.db.church_sites.update_one(
                {'stripe_subscription_id': subscription_id},
                {'$set': {
                    'payment_failed_at': datetime.utcnow(),
                    'payment_status': 'failed'
                }}
            )
        
        return {
            'status': 'payment_failed',
            'action': 'send_payment_failed_email',
            'email': customer_email
        }
    
    async def cancel_subscription(self, church_id: str) -> Dict:
        site = await self.db.church_sites.find_one({'church_id': church_id})
        if not site or not site.get('stripe_subscription_id'):
            raise Exception('No active subscription found')
        
        subscription = stripe.Subscription.modify(
            site['stripe_subscription_id'],
            cancel_at_period_end=True
        )
        
        await self.db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'cancel_at_period_end': True,
                'cancellation_requested_at': datetime.utcnow()
            }}
        )
        
        return {
            'success': True,
            'message': 'Subscription will cancel at end of billing period',
            'ends_at': datetime.fromtimestamp(subscription['current_period_end']).isoformat()
        }
