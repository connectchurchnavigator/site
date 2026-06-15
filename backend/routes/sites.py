from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Header
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os

from services.domain_service import DomainService
from services.stripe_service import StripeService
from services.site_generator import SiteGenerator
from database import db

router = APIRouter(prefix="/api/sites", tags=["sites"])

domain_service = DomainService(db)
stripe_service = StripeService(db)
site_generator = SiteGenerator(db)

SIGNATURE_HTML = '''
<div style="background:linear-gradient(135deg,#1e0a4a,#3b1f8c);padding:20px 40px;text-align:center;border-top:3px solid #7c3aed;margin-top:60px">
  <a href="https://churchnavigator.com?ref=sites&utm_source={domain}&utm_medium=footer_badge&utm_campaign=church_sites&utm_content={church_slug}" target="_blank" rel="dofollow" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;padding:12px 24px;background:rgba(124,58,237,.2);border:1px solid rgba(167,139,250,.4);border-radius:14px;backdrop-filter:blur(10px)">
    <span style="font-size:28px">⛪</span>
    <div style="text-align:left">
      <div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:.02em">Built with ChurchNavigator</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:2px">Discover 30,000+ UK churches • churchnavigator.com</div>
    </div>
    <div style="margin-left:8px;font-size:11px;color:#a78bfa;font-weight:700;background:rgba(124,58,237,.3);padding:4px 10px;border-radius:8px">FREE DIRECTORY -></div>
  </a>
  <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.3)">Is this your church? <a href="https://churchnavigator.com/churches/{church_slug}?ref=sites_claim&utm_source={domain}&utm_medium=footer_claim" style="color:rgba(167,139,250,.7);text-decoration:none">Manage your listing on ChurchNavigator</a></div>
</div>
'''

def inject_signature(html: str, church_slug: str, domain: str) -> str:
    meta_signature = f'''<link rel="canonical" href="https://churchnavigator.com/churches/{church_slug}"/>
<meta name="generator" content="ChurchNavigator Sites"/>'''
    html = html.replace('</head>', meta_signature + '</head>', 1)
    html = html.replace('</body>', SIGNATURE_HTML.format(church_slug=church_slug, domain=domain) + '</body>', 1)
    return html

class DomainCheckRequest(BaseModel):
    domain: str
    tld: str = 'co.uk'

class SubscribeRequest(BaseModel):
    church_id: str
    plan: str
    domain: str
    tld: str
    email: str
    template: str = 'modern'

class DomainPurchaseRequest(BaseModel):
    church_id: str
    domain: str
    tld: str
    years: int = 1

@router.get('/domain/check')
async def check_domain_availability(domain: str, tld: str = 'co.uk'):
    try:
        result = await domain_service.check_availability(domain, tld)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/subscribe')
async def create_subscription(request: SubscribeRequest):
    try:
        result = await stripe_service.create_subscription(
            church_id=request.church_id,
            plan=request.plan,
            domain=request.domain,
            tld=request.tld,
            email=request.email
        )
        
        await db.church_sites.update_one(
            {'church_id': request.church_id},
            {'$set': {'template': request.template}},
            upsert=True
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/domain/purchase')
async def purchase_domain(request: DomainPurchaseRequest, background_tasks: BackgroundTasks):
    try:
        result = await domain_service.purchase_domain(
            church_id=request.church_id,
            domain=request.domain,
            tld=request.tld,
            years=request.years
        )
        
        background_tasks.add_task(
            domain_service.configure_dns,
            request.church_id,
            result['domain']
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/domain/configure-dns')
async def configure_dns(church_id: str, domain: str):
    try:
        result = await domain_service.configure_dns(church_id, domain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/domain/verify/{church_slug}')
async def verify_domain(church_slug: str):
    try:
        result = await domain_service.verify_domain(church_slug)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/generate/{church_slug}')
async def generate_site(church_slug: str, template: str = 'modern', background_tasks: BackgroundTasks = None):
    try:
        if background_tasks:
            background_tasks.add_task(site_generator.generate_site, church_slug, template)
            return {'status': 'generating', 'message': 'Site generation started'}
        else:
            result = await site_generator.generate_site(church_slug, template)
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/status/{church_slug}')
async def get_site_status(church_slug: str):
    try:
        site = await db.church_sites.find_one({'church_slug': church_slug})
        if not site:
            return {'exists': False}
        
        return {
            'exists': True,
            'domain': site.get('domain', ''),
            'hosting_status': site.get('hosting_status', 'unknown'),
            'plan': site.get('plan', ''),
            'generation_status': site.get('generation_status', {}),
            'subscription_status': site.get('subscription_status', ''),
            'expiry_date': site.get('expiry_date', ''),
            'pages': list(site.get('pages', {}).keys())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/cancel')
async def cancel_subscription(church_id: str):
    try:
        result = await stripe_service.cancel_subscription(church_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/stripe/webhook')
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks, stripe_signature: str = Header(None)):
    try:
        payload = await request.body()
        result = await stripe_service.handle_webhook(payload, stripe_signature)
        
        if result.get('action') == 'start_domain_purchase':
            background_tasks.add_task(
                domain_service.purchase_domain,
                result['church_id'],
                result['domain'].split('.')[0],
                '.'.join(result['domain'].split('.')[1:]),
                1
            )
        elif result.get('action') == 'renew_domain':
            background_tasks.add_task(
                domain_service.renew_domain,
                result['church_id'],
                1
            )
        
        return {'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/{church_slug}/contact')
async def handle_contact_form(church_slug: str, request: Request):
    try:
        data = await request.json()
        church = await db.churches.find_one({'slug': church_slug})
        if not church:
            raise HTTPException(status_code=404, detail='Church not found')
        
        await db.contact_submissions.insert_one({
            'church_id': str(church['_id']),
            'church_slug': church_slug,
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'subject': data.get('subject', ''),
            'message': data.get('message', ''),
            'submitted_at': datetime.utcnow()
        })
        
        return {'success': True, 'message': 'Message sent successfully'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
