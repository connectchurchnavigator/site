from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..dependencies import get_current_user, get_db
from ..services.planner_subscription_service import PlannerSubscriptionService
from ..services.email_service import EmailService

router = APIRouter(prefix='/api/planner/visit-requests', tags=['planner_visit_requests'])

class VisitRequestCreate(BaseModel):
    trip_id: str
    church_id: str
    preferred_date: str
    preferred_time: str
    duration_minutes: int
    message: Optional[str] = None
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None

class VisitRequestUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None

@router.post('/')
async def create_visit_request(request: VisitRequestCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    subscription_service = PlannerSubscriptionService(db)
    
    can_send, error_msg = await subscription_service.can_send_visit_request(str(current_user['_id']))
    if not can_send:
        raise HTTPException(
            status_code=402,
            detail={
                'message': error_msg,
                'upgrade_required': True,
                'current_tier': 'free',
                'required_tier': 'standard'
            }
        )
    
    trip = await db.planner_trips.find_one({'_id': ObjectId(request.trip_id), 'user_id': str(current_user['_id'])})
    if not trip:
        raise HTTPException(status_code=404, detail='Trip not found')
    
    church = await db.churches.find_one({'_id': ObjectId(request.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail='Church not found')
    
    visit_request = {
        'trip_id': request.trip_id,
        'church_id': request.church_id,
        'user_id': str(current_user['_id']),
        'preferred_date': request.preferred_date,
        'preferred_time': request.preferred_time,
        'duration_minutes': request.duration_minutes,
        'message': request.message,
        'contact_name': request.contact_name,
        'contact_email': request.contact_email,
        'contact_phone': request.contact_phone,
        'status': 'pending',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow()
    }
    
    result = await db.planner_visit_requests.insert_one(visit_request)
    
    await subscription_service.increment_visit_request(str(current_user['_id']))
    
    email_service = EmailService()
    church_email = church.get('email')
    if church_email:
        await email_service.send_email(
            to_email=church_email,
            template_id=25,
            template_data={
                'church_name': church.get('name'),
                'minister_name': current_user.get('name'),
                'preferred_date': request.preferred_date,
                'preferred_time': request.preferred_time,
                'duration': request.duration_minutes,
                'message': request.message or 'No additional message',
                'contact_name': request.contact_name,
                'contact_email': request.contact_email,
                'contact_phone': request.contact_phone or 'Not provided'
            }
        )
    
    visit_request['_id'] = str(result.inserted_id)
    return visit_request

@router.get('/')
async def get_visit_requests(trip_id: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = {'user_id': str(current_user['_id'])}
    if trip_id:
        query['trip_id'] = trip_id
    
    requests = await db.planner_visit_requests.find(query).sort('created_at', -1).to_list(length=100)
    
    for req in requests:
        req['_id'] = str(req['_id'])
        church = await db.churches.find_one({'_id': ObjectId(req['church_id'])})
        if church:
            req['church'] = {
                '_id': str(church['_id']),
                'name': church.get('name'),
                'denomination': church.get('denomination'),
                'postcode': church.get('postcode')
            }
    
    return requests

@router.patch('/{request_id}')
async def update_visit_request(request_id: str, update: VisitRequestUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    visit_request = await db.planner_visit_requests.find_one({'_id': ObjectId(request_id)})
    if not visit_request:
        raise HTTPException(status_code=404, detail='Visit request not found')
    
    if visit_request['user_id'] != str(current_user['_id']):
        raise HTTPException(status_code=403, detail='Not authorized')
    
    update_data = {'status': update.status, 'updated_at': datetime.utcnow()}
    if update.admin_notes:
        update_data['admin_notes'] = update.admin_notes
    
    await db.planner_visit_requests.update_one(
        {'_id': ObjectId(request_id)},
        {'$set': update_data}
    )
    
    return {'success': True}

@router.delete('/{request_id}')
async def delete_visit_request(request_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    visit_request = await db.planner_visit_requests.find_one({'_id': ObjectId(request_id)})
    if not visit_request:
        raise HTTPException(status_code=404, detail='Visit request not found')
    
    if visit_request['user_id'] != str(current_user['_id']):
        raise HTTPException(status_code=403, detail='Not authorized')
    
    await db.planner_visit_requests.delete_one({'_id': ObjectId(request_id)})
    return {'success': True}
