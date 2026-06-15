from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..dependencies import get_current_user, get_db
from ..services.planner_subscription_service import PlannerSubscriptionService

router = APIRouter(prefix='/api/planner', tags=['planner_subscription'])

class SubscribeRequest(BaseModel):
    plan: str
    annual: bool = False

class CancelRequest(BaseModel):
    immediate: bool = False

@router.get('/subscription-status')
async def get_subscription_status(current_user=Depends(get_current_user), db=Depends(get_db)):
    service = PlannerSubscriptionService(db)
    sub = await service.get_user_subscription(str(current_user['_id']))
    
    tier = sub.get('tier', 'free')
    limits = {
        'free': {'visit_requests': 3, 'templates': 0, 'collaborators': 1},
        'standard': {'visit_requests': 999999, 'templates': 5, 'collaborators': 3},
        'premium': {'visit_requests': 999999, 'templates': 999999, 'collaborators': 999999},
        'denomination': {'visit_requests': 999999, 'templates': 999999, 'collaborators': 999999}
    }
    
    return {
        'tier': tier,
        'stripe_subscription_id': sub.get('stripe_subscription_id'),
        'current_period_end': sub.get('current_period_end'),
        'cancel_at_period_end': sub.get('cancel_at_period_end', False),
        'visit_requests_this_month': sub.get('visit_requests_this_month', 0),
        'visit_requests_reset_date': sub.get('visit_requests_reset_date'),
        'limits': limits.get(tier, limits['free']),
        'features': {
            'unlimited_visit_requests': service.check_feature_access(sub, 'unlimited_visit_requests'),
            'ai_guided_planning': service.check_feature_access(sub, 'ai_guided_planning'),
            'professional_pdf': service.check_feature_access(sub, 'professional_pdf'),
            'templates_create': service.check_feature_access(sub, 'templates_create'),
            'collaboration_basic': service.check_feature_access(sub, 'collaboration_basic'),
            'ai_intelligence': service.check_feature_access(sub, 'ai_intelligence'),
            'unlimited_templates': service.check_feature_access(sub, 'unlimited_templates'),
            'unlimited_collaborators': service.check_feature_access(sub, 'unlimited_collaborators'),
            'analytics': service.check_feature_access(sub, 'analytics'),
            'priority_support': service.check_feature_access(sub, 'priority_support')
        }
    }

@router.post('/subscribe')
async def subscribe(request: SubscribeRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    if request.plan not in ['standard', 'premium']:
        raise HTTPException(status_code=400, detail='Invalid plan')
    
    service = PlannerSubscriptionService(db)
    try:
        checkout_url = await service.create_subscription(
            str(current_user['_id']),
            request.plan,
            request.annual
        )
        return {'checkout_url': checkout_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Subscription error: {str(e)}')

@router.post('/cancel-subscription')
async def cancel_subscription(request: CancelRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    service = PlannerSubscriptionService(db)
    try:
        await service.cancel_subscription(str(current_user['_id']), not request.immediate)
        return {'success': True, 'message': 'Subscription cancelled' if request.immediate else 'Subscription will cancel at period end'}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Cancellation error: {str(e)}')

@router.post('/check-feature-access/{feature}')
async def check_feature_access(feature: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    service = PlannerSubscriptionService(db)
    sub = await service.get_user_subscription(str(current_user['_id']))
    has_access = service.check_feature_access(sub, feature)
    
    return {
        'has_access': has_access,
        'current_tier': sub.get('tier', 'free'),
        'required_tier': 'standard' if feature in ['unlimited_visit_requests', 'ai_guided_planning', 'professional_pdf', 'templates_create', 'collaboration_basic'] else 'premium'
    }
