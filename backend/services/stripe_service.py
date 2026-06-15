import os
import stripe
from typing import Dict, Optional
from datetime import datetime

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class StripeService:
    def __init__(self, db):
        self.db = db
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        self.price_standard = os.getenv('STRIPE_PRICE_ID_STANDARD')
        self.price_premium = os.getenv('STRIPE_PRICE_ID_PREMIUM')
    
    async def create_subscription(self, church_id: str, plan: str, domain: str, email: str) -> Dict:
        try:
            church = await self.db.churches.find_one({'_id': church_id})
            if not church:
                return {'success': False, 'error': 'Church not found'}
            
            customer_id = church.get('stripe_customer_id')
            
            if not customer_id:
                customer = stripe.Customer.create(
                    email=email,
                    metadata={'church_id': church_id, 'domain': domain}
                )
                customer_id = customer.id
                
                await self.db.churches.update_one(
                    {'_id': church_id},
                    {'$set': {'stripe_customer_id': customer_id}}
                )
            
            price_id = self.price_standard if plan == 'standard' else self.price_premium
            
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1
                }],
                mode='subscription',
                success_url=f"https://churchnavigator.com/sites/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"https://churchnavigator.com/sites/setup?church_id={church_id}",
                metadata={
                    'church_id': church_id,
                    'domain': domain,
                    'plan': plan
                }
            )
            
            await self.db.church_sites.update_one(
                {'church_id': church_id},
                {'$set': {
                    'checkout_session_id': checkout_session.id,
                    'plan': plan,
                    'domain': domain,
                    'payment_status': 'pending'
                }},
                upsert=True
            )
            
            return {
                'success': True,
                'checkout_url': checkout_session.url,
                'session_id': checkout_session.id
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def handle_webhook(self, payload: bytes, sig_header: str) -> Dict:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
        except ValueError:
            return {'success': False, 'error': 'Invalid payload'}
        except stripe.error.SignatureVerificationError:
            return {'success': False, 'error': 'Invalid signature'}
        
        event_type = event['type']
        data = event['data']['object']
        
        if event_type == 'checkout.session.completed':
            await self._handle_checkout_completed(data)
        elif event_type == 'customer.subscription.created':
            await self._handle_subscription_created(data)
        elif event_type == 'customer.subscription.updated':
            await self._handle_subscription_updated(data)
        elif event_type == 'customer.subscription.deleted':
            await self._handle_subscription_deleted(data)
        elif event_type == 'invoice.paid':
            await self._handle_invoice_paid(data)
        elif event_type == 'invoice.payment_failed':
            await self._handle_payment_failed(data)
        
        return {'success': True, 'event_type': event_type}
    
    async def _handle_checkout_completed(self, session):
        church_id = session['metadata'].get('church_id')
        domain = session['metadata'].get('domain')
        plan = session['metadata'].get('plan')
        subscription_id = session.get('subscription')
        
        await self.db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'payment_status': 'paid',
                'subscription_id': subscription_id,
                'activated_at': datetime.now(),
                'plan': plan,
                'domain': domain
            }}
        )
        
        from .domain_service import get_domain_service
        from .site_generator import get_site_generator
        
        domain_service = get_domain_service(self.db)
        site_generator = get_site_generator(self.db)
        
        domain_parts = domain.split('.')
        base_domain = domain_parts[0]
        tld = '.'.join(domain_parts[1:])
        
        purchase_result = await domain_service.purchase_domain(church_id, base_domain, tld)
        
        if purchase_result.get('success'):
            await domain_service.configure_dns(domain)
            
            church = await self.db.churches.find_one({'_id': church_id})
            if church:
                await site_generator.generate_site(church['slug'], church)
    
    async def _handle_subscription_created(self, subscription):
        customer_id = subscription['customer']
        subscription_id = subscription['id']
        
        await self.db.church_sites.update_one(
            {'stripe_customer_id': customer_id},
            {'$set': {
                'subscription_id': subscription_id,
                'subscription_status': 'active'
            }}
        )
    
    async def _handle_subscription_updated(self, subscription):
        subscription_id = subscription['id']
        status = subscription['status']
        
        await self.db.church_sites.update_one(
            {'subscription_id': subscription_id},
            {'$set': {'subscription_status': status}}
        )
    
    async def _handle_subscription_deleted(self, subscription):
        subscription_id = subscription['id']
        
        await self.db.church_sites.update_one(
            {'subscription_id': subscription_id},
            {'$set': {
                'subscription_status': 'cancelled',
                'hosting_status': 'suspended',
                'suspended_at': datetime.now()
            }}
        )
    
    async def _handle_invoice_paid(self, invoice):
        subscription_id = invoice.get('subscription')
        
        site = await self.db.church_sites.find_one({'subscription_id': subscription_id})
        if site:
            domain_info = site.get('domain_info', {})
            expiry = domain_info.get('expiry_date')
            
            if expiry:
                from datetime import timedelta
                if isinstance(expiry, str):
                    expiry = datetime.fromisoformat(expiry)
                
                days_until_expiry = (expiry - datetime.now()).days
                
                if days_until_expiry <= 30:
                    from .domain_service import get_domain_service
                    domain_service = get_domain_service(self.db)
                    await domain_service._auto_renew_domain(site)
    
    async def _handle_payment_failed(self, invoice):
        customer_id = invoice['customer']
        
        church = await self.db.churches.find_one({'stripe_customer_id': customer_id})
        if church:
            pass
    
    async def cancel_subscription(self, church_id: str) -> Dict:
        try:
            site = await self.db.church_sites.find_one({'church_id': church_id})
            if not site or not site.get('subscription_id'):
                return {'success': False, 'error': 'No active subscription'}
            
            subscription = stripe.Subscription.modify(
                site['subscription_id'],
                cancel_at_period_end=True
            )
            
            await self.db.church_sites.update_one(
                {'church_id': church_id},
                {'$set': {'cancel_at_period_end': True}}
            )
            
            return {'success': True, 'ends_at': subscription['current_period_end']}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

stripe_service = None

def get_stripe_service(db):
    global stripe_service
    if stripe_service is None:
        stripe_service = StripeService(db)
    return stripe_service