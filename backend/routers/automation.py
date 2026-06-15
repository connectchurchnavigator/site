from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from bson import ObjectId
from services.automation_service import automation_service
from services.email_service import email_service
from auth import get_current_user
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix='/api/automation', tags=['automation'])

client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB', 'ChurchNavigator')]

@router.get('/recommendations/events/{user_id}')
async def get_event_recommendations(user_id: str, limit: int = 5):
    recommendations = await automation_service.get_event_recommendations(user_id, limit)
    return {'recommendations': recommendations}

@router.post('/enrich-church/{church_id}')
async def enrich_church_listing(church_id: str, current_user: dict = Depends(get_current_user)):
    enrichments = await automation_service.enrich_church_listing(church_id)
    return enrichments

@router.get('/followup-queue/{church_id}')
async def get_followup_queue(church_id: str, current_user: dict = Depends(get_current_user)):
    followups = await db.followup_queue.find({
        'church_id': church_id,
        'status': 'pending'
    }).sort('generated_at', -1).to_list(length=50)
    
    for f in followups:
        f['_id'] = str(f['_id'])
    
    return {'followups': followups}

@router.post('/followup-queue/{followup_id}/send')
async def send_followup(followup_id: str, current_user: dict = Depends(get_current_user)):
    followup = await db.followup_queue.find_one({'_id': ObjectId(followup_id)})
    if not followup:
        raise HTTPException(status_code=404, detail='Followup not found')
    
    visitor = await db.visitors.find_one({'_id': ObjectId(followup['visitor_id'])})
    church = await db.churches.find_one({'_id': ObjectId(followup['church_id'])})
    
    if not visitor or not visitor.get('email'):
        raise HTTPException(status_code=400, detail='Visitor email not found')
    
    success = await email_service.send_followup_message(
        to=visitor['email'],
        visitor_name=visitor['name'],
        church_name=church['name'],
        message=followup['message']
    )
    
    if success:
        from datetime import datetime
        await db.followup_queue.update_one(
            {'_id': ObjectId(followup_id)},
            {'$set': {'status': 'sent', 'sent_at': datetime.utcnow()}}
        )
        return {'success': True}
    else:
        raise HTTPException(status_code=500, detail='Failed to send email')

@router.post('/followup-queue/{followup_id}/dismiss')
async def dismiss_followup(followup_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime
    await db.followup_queue.update_one(
        {'_id': ObjectId(followup_id)},
        {'$set': {'status': 'dismissed', 'dismissed_at': datetime.utcnow()}}
    )
    return {'success': True}

@router.put('/followup-queue/{followup_id}')
async def update_followup_message(followup_id: str, message: str, current_user: dict = Depends(get_current_user)):
    await db.followup_queue.update_one(
        {'_id': ObjectId(followup_id)},
        {'$set': {'message': message}}
    )
    return {'success': True}
