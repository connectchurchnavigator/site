from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from typing import Optional
from ..database import get_database
from ..services.domain_service import get_domain_service
from ..services.stripe_service import get_stripe_service
from ..services.site_generator import get_site_generator
from datetime import datetime

router = APIRouter(prefix="/api/sites", tags=["sites"])

class DomainCheckRequest(BaseModel):
    domain: str
    tld: str = "co.uk"

class SubscribeRequest(BaseModel):
    church_id: str
    plan: str
    domain: str
    tld: str
    email: str

@router.get("/domain/check")
async def check_domain(domain: str, tld: str = "co.uk", db=Depends(get_database)):
    domain_service = get_domain_service(db)
    result = await domain_service.check_availability(domain, tld)
    return result

@router.post("/subscribe")
async def create_subscription(request: SubscribeRequest, db=Depends(get_database)):
    stripe_service = get_stripe_service(db)
    full_domain = f"{request.domain}.{request.tld}"
    result = await stripe_service.create_subscription(
        request.church_id,
        request.plan,
        full_domain,
        request.email
    )
    return result

@router.post("/domain/purchase")
async def purchase_domain(church_id: str, domain: str, tld: str, db=Depends(get_database)):
    domain_service = get_domain_service(db)
    result = await domain_service.purchase_domain(church_id, domain, tld)
    return result

@router.post("/domain/configure-dns")
async def configure_dns(domain: str, db=Depends(get_database)):
    domain_service = get_domain_service(db)
    result = await domain_service.configure_dns(domain)
    return result

@router.get("/domain/verify/{church_slug}")
async def verify_domain(church_slug: str, db=Depends(get_database)):
    domain_service = get_domain_service(db)
    result = await domain_service.verify_domain(church_slug)
    return result

@router.post("/generate/{church_slug}")
async def generate_site(church_slug: str, db=Depends(get_database)):
    site_generator = get_site_generator(db)
    result = await site_generator.generate_site(church_slug)
    return result

@router.get("/status/{church_slug}")
async def get_site_status(church_slug: str, db=Depends(get_database)):
    site = await db.church_sites.find_one({'church_slug': church_slug})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    return {
        'domain': site.get('domain'),
        'hosting_status': site.get('hosting_status'),
        'generation_status': site.get('generation_status', {}),
        'verified': site.get('verified', False),
        'plan': site.get('plan'),
        'subscription_status': site.get('subscription_status')
    }

@router.post("/cancel/{church_id}")
async def cancel_subscription(church_id: str, db=Depends(get_database)):
    stripe_service = get_stripe_service(db)
    result = await stripe_service.cancel_subscription(church_id)
    return result

@router.post("/regenerate/{church_slug}")
async def regenerate_site(church_slug: str, db=Depends(get_database)):
    site_generator = get_site_generator(db)
    result = await site_generator.generate_site(church_slug)
    return result