from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
from services.automation_service import automation_service

router = APIRouter(prefix='/api/visitors', tags=['visitors'])

client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('MONGODB_DB', 'ChurchNavigator')]

class VisitorCheckIn(BaseModel):
    church_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    journey_stage: str = 'first_visit'
    notes: Optional[str] = None

class VisitorUpdate(BaseModel):
    journey_stage: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

@router.post('/check-in')
async def check_in_visitor(data: VisitorCheckIn):
    try:
        existing = None
        if data.email:
            existing = await db.visitors.find_one({
                'church_id': data.church_id,
                'email': data.email
            })
        
        if existing:
            total_visits = existing.get('total_visits', 0) + 1
            await db.visitors.update_one(
                {'_id': existing['_id']},
                {
                    '$set': {
                        'last_visit': datetime.utcnow(),
                        'journey_stage': data.journey_stage,
                        'total_visits': total_visits
                    },
                    '$push': {
                        'visit_history': {
                            'date': datetime.utcnow(),
                            'notes': data.notes
                        }
                    }
                }
            )
            visitor_id = str(existing['_id'])
        else:
            visitor_doc = {
                'church_id': data.church_id,
                'name': data.name,
                'email': data.email,
                'phone': data.phone,
                'journey_stage': data.journey_stage,
                'first_visit': datetime.utcnow(),
                'last_visit': datetime.utcnow(),
                'total_visits': 1,
                'visit_history': [{
                    'date': datetime.utcnow(),
                    'notes': data.notes
                }],
                'tags': [],
                'notes': data.notes or ''
            }
            result = await db.visitors.insert_one(visitor_doc)
            visitor_id = str(result.inserted_id)
            
            if data.journey_stage == 'first_visit':
                await automation_service.generate_newcomer_followup(visitor_id, data.church_id)
        
        return {'success': True, 'visitor_id': visitor_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/church/{church_id}')
async def get_church_visitors(church_id: str, current_user: dict = Depends(get_current_user)):
    visitors = await db.visitors.find({'church_id': church_id}).sort('last_visit', -1).to_list(length=100)
    for v in visitors:
        v['_id'] = str(v['_id'])
    return {'visitors': visitors}

@router.put('/{visitor_id}')
async def update_visitor(visitor_id: str, data: VisitorUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in data.dict(exclude_unset=True).items()}
    if update_fields:
        await db.visitors.update_one(
            {'_id': ObjectId(visitor_id)},
            {'$set': update_fields}
        )
    return {'success': True}

@router.get('/{visitor_id}')
async def get_visitor(visitor_id: str, current_user: dict = Depends(get_current_user)):
    visitor = await db.visitors.find_one({'_id': ObjectId(visitor_id)})
    if not visitor:
        raise HTTPException(status_code=404, detail='Visitor not found')
    visitor['_id'] = str(visitor['_id'])
    return visitor
