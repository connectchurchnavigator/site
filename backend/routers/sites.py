from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

from database import db
from services.domain_service import domain_service
from services.stripe_service import stripe_service
from services.site_generator import site_generator
from dependencies import get_current_user

router = APIRouter(prefix='/api/sites', tags=['sites'])

RAILWAY_IP = os.getenv('RAILWAY_IP', '0.0.0.0')

class DomainCheckRequest(BaseModel):
    domain: str
    tld: str = 'co.uk'

class SubscribeRequest(BaseModel):
    church_id: str
    plan: str
    domain: str
    tld: str
    template: str = 'modern'

class ContactFormRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str

@router.get('/domain/check')
async def check_domain(domain: str, tld: str = 'co.uk'):
    try:
        result = await domain_service.check_availability(domain, tld)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/subscribe')
async def create_subscription(request: SubscribeRequest, current_user = Depends(get_current_user)):
    church = await db.churches.find_one({'_id': request.church_id})
    if not church:
        raise HTTPException(status_code=404, detail='Church not found')
    
    if church.get('owner_id') != current_user['uid']:
        raise HTTPException(status_code=403, detail='Not authorized')
    
    try:
        domain_check = await domain_service.check_availability(request.domain, request.tld)
        if not domain_check['available']:
            raise HTTPException(status_code=400, detail='Domain not available')
        
        checkout = await stripe_service.create_checkout_session(
            church_id=request.church_id,
            email=current_user.get('email'),
            church_name=church['name'],
            plan=request.plan,
            domain=f"{request.domain}.{request.tld}",
            success_url=f"https://churchnavigator.com/sites/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"https://churchnavigator.com/churches/{church['slug']}/manage?tab=website"
        )
        
        await db.church_sites.update_one(
            {'church_id': request.church_id},
            {'$set': {
                'church_id': request.church_id,
                'domain': f"{request.domain}.{request.tld}",
                'tld': request.tld,
                'plan': request.plan,
                'template': request.template,
                'stripe_customer_id': checkout['customer_id'],
                'status': 'pending_payment',
                'created_at': datetime.utcnow()
            }},
            upsert=True
        )
        
        return {'checkout_url': checkout['checkout_url'], 'session_id': checkout['session_id']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def process_site_creation(church_id: str, domain: str, tld: str, template: str):
    try:
        church = await db.churches.find_one({'_id': church_id})
        if not church:
            return
        
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {'build_status': 'purchasing_domain'}}
        )
        
        domain_result = await domain_service.purchase_domain(domain, tld)
        
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'domain_id': domain_result['domain_id'],
                'expiry_date': domain_result['expiry_date'],
                'build_status': 'configuring_dns'
            }}
        )
        
        await domain_service.configure_dns(domain, tld, RAILWAY_IP)
        
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {'build_status': 'generating_pages'}}
        )
        
        pages = await site_generator.generate_site(church, template)
        
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'pages': pages,
                'build_status': 'live',
                'hosting_status': 'active',
                'activated_at': datetime.utcnow()
            }}
        )
        
        await db.churches.update_one(
            {'_id': church_id},
            {'$set': {'has_site': True, 'site_domain': f"{domain}.{tld}"}}
        )
        
    except Exception as e:
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {'build_status': 'failed', 'build_error': str(e)}}
        )

@router.post('/stripe/webhook')
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks, stripe_signature: str = Header(None)):
    payload = await request.body()
    
    try:
        event = stripe_service.construct_webhook_event(payload, stripe_signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        church_id = session['metadata']['church_id']
        domain = session['metadata']['domain']
        template = session['metadata'].get('template', 'modern')
        
        domain_parts = domain.split('.')
        domain_name = domain_parts[0]
        tld = '.'.join(domain_parts[1:])
        
        await db.church_sites.update_one(
            {'church_id': church_id},
            {'$set': {
                'stripe_subscription_id': session.get('subscription'),
                'status': 'active',
                'payment_confirmed_at': datetime.utcnow()
            }}
        )
        
        background_tasks.add_task(process_site_creation, church_id, domain_name, tld, template)
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        await db.church_sites.update_one(
            {'stripe_subscription_id': subscription['id']},
            {'$set': {'hosting_status': 'suspended', 'suspended_at': datetime.utcnow()}}
        )
    
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        subscription_id = invoice.get('subscription')
        await db.church_sites.update_one(
            {'stripe_subscription_id': subscription_id},
            {'$set': {'payment_status': 'failed', 'payment_failed_at': datetime.utcnow()}}
        )
    
    return {'received': True}

@router.get('/status/{church_slug}')
async def get_site_status(church_slug: str):
    church = await db.churches.find_one({'slug': church_slug})
    if not church:
        raise HTTPException(status_code=404, detail='Church not found')
    
    site = await db.church_sites.find_one({'church_id': str(church['_id'])})
    if not site:
        return {'has_site': False}
    
    return {
        'has_site': True,
        'domain': site.get('domain'),
        'status': site.get('hosting_status'),
        'build_status': site.get('build_status'),
        'plan': site.get('plan'),
        'activated_at': site.get('activated_at'),
        'expiry_date': site.get('expiry_date')
    }

@router.post('/regenerate/{church_slug}')
async def regenerate_site(church_slug: str, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
    church = await db.churches.find_one({'slug': church_slug})
    if not church or church.get('owner_id') != current_user['uid']:
        raise HTTPException(status_code=403, detail='Not authorized')
    
    site = await db.church_sites.find_one({'church_id': str(church['_id'])})
    if not site:
        raise HTTPException(status_code=404, detail='Site not found')
    
    async def regenerate():
        pages = await site_generator.generate_site(church, site.get('template', 'modern'))
        await db.church_sites.update_one(
            {'church_id': str(church['_id'])},
            {'$set': {'pages': pages, 'last_updated': datetime.utcnow()}}
        )
    
    background_tasks.add_task(regenerate)
    return {'message': 'Site regeneration started'}

@router.post('/{church_slug}/contact')
async def submit_contact_form(church_slug: str, form: ContactFormRequest):
    church = await db.churches.find_one({'slug': church_slug})
    if not church:
        raise HTTPException(status_code=404, detail='Church not found')
    
    await db.site_contacts.insert_one({
        'church_id': str(church['_id']),
        'name': form.name,
        'email': form.email,
        'subject': form.subject,
        'message': form.message,
        'submitted_at': datetime.utcnow()
    })
    
    return {'message': 'Contact form submitted successfully'}