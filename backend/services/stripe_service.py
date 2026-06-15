import stripe
import os
from typing import Dict, Optional
from datetime import datetime

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class StripeService:
    def __init__(self):
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        self.price_id_standard = os.getenv('STRIPE_PRICE_ID_STANDARD')
        self.price_id_premium = os.getenv('STRIPE_PRICE_ID_PREMIUM')
    
    async def create_or_get_customer(self, church_id: str, email: str, church_name: str) -> str:
        customers = stripe.Customer.list(email=email, limit=1)
        
        if customers.data:
            return customers.data[0].id
        
        customer = stripe.Customer.create(
            email=email,
            name=church_name,
            metadata={'church_id': church_id}
        )
        return customer.id
    
    async def create_checkout_session(self, church_id: str, email: str, church_name: str,
                                      plan: str, domain: str, success_url: str, cancel_url: str) -> Dict:
        customer_id = await self.create_or_get_customer(church_id, email, church_name)
        
        price_id = self.price_id_standard if plan == 'standard' else self.price_id_premium
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'church_id': church_id,
                'domain': domain,
                'plan': plan
            },
            subscription_data={
                'metadata': {
                    'church_id': church_id,
                    'domain': domain,
                    'plan': plan
                }
            }
        )
        
        return {
            'session_id': session.id,
            'checkout_url': session.url,
            'customer_id': customer_id
        }
    
    async def cancel_subscription(self, subscription_id: str) -> Dict:
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        return {
            'cancelled': True,
            'subscription_id': subscription_id,
            'cancel_at': datetime.fromtimestamp(subscription.cancel_at).isoformat()
        }
    
    async def get_subscription(self, subscription_id: str) -> Dict:
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_end': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    
    def construct_webhook_event(self, payload: bytes, sig_header: str):
        return stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)

stripe_service = StripeService()