from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import anthropic
import os
from database import get_database
from bson import ObjectId
import re

router = APIRouter(prefix="/api/listing", tags=["listing"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

class GuidedSessionStart(BaseModel):
    user_id: Optional[str] = None

class GuidedStepSubmit(BaseModel):
    session_id: str
    step: int
    answer: Any

class GuidedPublish(BaseModel):
    session_id: str

def parse_with_claude(prompt: str, user_input: str) -> Dict[str, Any]:
    if not client:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"{prompt}\n\nUser input: {user_input}\n\nRespond with valid JSON only."
            }]
        )
        
        response_text = message.content[0].text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        import json
        return json.loads(response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {str(e)}")

@router.post("/guided/session")
async def start_guided_session(data: GuidedSessionStart):
    db = get_database()
    
    session = {
        "user_id": data.user_id,
        "created_at": datetime.utcnow(),
        "current_step": 1,
        "data": {},
        "completed": False
    }
    
    result = db.guided_sessions.insert_one(session)
    session_id = str(result.inserted_id)
    
    return {
        "session_id": session_id,
        "step": 1,
        "question": "What's your church name?",
        "type": "text",
        "placeholder": "e.g., Grace Community Church"
    }

@router.post("/guided/step")
async def submit_guided_step(data: GuidedStepSubmit):
    db = get_database()
    
    try:
        session = db.guided_sessions.find_one({"_id": ObjectId(data.session_id)})
    except:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["completed"]:
        raise HTTPException(status_code=400, detail="Session already completed")
    
    session_data = session.get("data", {})
    
    if data.step == 1:
        session_data["name"] = data.answer
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 2}}
        )
        return {
            "session_id": data.session_id,
            "step": 2,
            "question": "Where are you based? (city or postcode)",
            "type": "text",
            "placeholder": "e.g., London or SW1A 1AA"
        }
    
    elif data.step == 2:
        location_input = data.answer
        
        parsed = parse_with_claude(
            "Parse this UK location into city and postcode. Return JSON: {\"city\": \"name\", \"postcode\": \"code or null\", \"found\": true/false}",
            location_input
        )
        
        session_data["city"] = parsed.get("city", location_input)
        session_data["postcode"] = parsed.get("postcode")
        session_data["location_raw"] = location_input
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 3}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 3,
            "question": "What denomination or type of church are you?",
            "type": "select",
            "options": [
                "Pentecostal",
                "Baptist",
                "Anglican",
                "Non-denominational",
                "Catholic",
                "Methodist",
                "Presbyterian",
                "Evangelical",
                "Charismatic",
                "Other"
            ]
        }
    
    elif data.step == 3:
        session_data["denomination"] = data.answer
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 4}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 4,
            "question": "When do you meet? (you can add multiple services)",
            "type": "service_times",
            "placeholder": "e.g., Sundays 10am to 12pm"
        }
    
    elif data.step == 4:
        service_times = data.answer
        
        if isinstance(service_times, str):
            parsed = parse_with_claude(
                "Parse service times into array of objects. Return JSON: [{\"day\": \"Monday/Tuesday/etc\", \"start_time\": \"HH:MM AM/PM\", \"end_time\": \"HH:MM AM/PM\"}]",
                service_times
            )
            service_times = parsed if isinstance(parsed, list) else []
        
        session_data["service_times"] = service_times
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 5}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 5,
            "question": "What's the best way for people to contact you?",
            "type": "contact",
            "fields": ["phone", "email", "website"]
        }
    
    elif data.step == 5:
        session_data["phone"] = data.answer.get("phone", "")
        session_data["email"] = data.answer.get("email", "")
        session_data["website"] = data.answer.get("website", "")
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 6}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 6,
            "question": "Add a cover photo to make your listing stand out",
            "type": "image",
            "optional": True
        }
    
    elif data.step == 6:
        if data.answer:
            session_data["cover_image"] = data.answer
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 7}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 7,
            "question": "Who is your senior pastor?",
            "type": "text",
            "placeholder": "e.g., Rev John Smith",
            "optional": True
        }
    
    elif data.step == 7:
        if data.answer:
            session_data["pastor_name"] = data.answer
        
        ai_description = ""
        if client:
            try:
                prompt = f"""Write a warm, welcoming 2-paragraph description for this church:

Name: {session_data.get('name', '')}
Location: {session_data.get('city', '')}
Denomination: {session_data.get('denomination', '')}
Service times: {session_data.get('service_times', [])}
Pastor: {session_data.get('pastor_name', 'our pastoral team')}

Make it inviting and focus on community. Return only the description text, no JSON."""
                
                message = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                ai_description = message.content[0].text.strip()
            except:
                ai_description = f"{session_data.get('name', 'Our church')} is a {session_data.get('denomination', '')} church located in {session_data.get('city', '')}. We welcome everyone to join us for worship and fellowship."
        else:
            ai_description = f"{session_data.get('name', 'Our church')} is a {session_data.get('denomination', '')} church located in {session_data.get('city', '')}. We welcome everyone to join us for worship and fellowship."
        
        session_data["description"] = ai_description
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data, "current_step": 8}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 8,
            "question": "Review your listing",
            "type": "preview",
            "data": session_data,
            "ai_description": ai_description
        }
    
    elif data.step == 8:
        if data.answer.get("edit_description"):
            session_data["description"] = data.answer["edit_description"]
        
        db.guided_sessions.update_one(
            {"_id": ObjectId(data.session_id)},
            {"$set": {"data": session_data}}
        )
        
        return {
            "session_id": data.session_id,
            "step": 8,
            "question": "Ready to publish?",
            "type": "ready",
            "data": session_data
        }
    
    raise HTTPException(status_code=400, detail="Invalid step")

@router.post("/guided/publish")
async def publish_guided_listing(data: GuidedPublish):
    db = get_database()
    
    try:
        session = db.guided_sessions.find_one({"_id": ObjectId(data.session_id)})
    except:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["completed"]:
        raise HTTPException(status_code=400, detail="Session already published")
    
    session_data = session.get("data", {})
    
    church_listing = {
        "name": session_data.get("name", ""),
        "city": session_data.get("city", ""),
        "postcode": session_data.get("postcode", ""),
        "denomination": session_data.get("denomination", ""),
        "description": session_data.get("description", ""),
        "service_times": session_data.get("service_times", []),
        "phone": session_data.get("phone", ""),
        "email": session_data.get("email", ""),
        "website": session_data.get("website", ""),
        "cover_image": session_data.get("cover_image", ""),
        "pastor_name": session_data.get("pastor_name", ""),
        "created_at": datetime.utcnow(),
        "status": "active",
        "verified": False,
        "source": "guided_listing",
        "slug": re.sub(r'[^a-z0-9]+', '-', session_data.get("name", "").lower()).strip('-')
    }
    
    result = db.churches.insert_one(church_listing)
    church_id = str(result.inserted_id)
    
    db.guided_sessions.update_one(
        {"_id": ObjectId(data.session_id)},
        {"$set": {"completed": True, "church_id": church_id, "published_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "church_id": church_id,
        "slug": church_listing["slug"],
        "message": "Your church listing is now live!"
    }

@router.get("/guided/session/{session_id}")
async def get_guided_session(session_id: str):
    db = get_database()
    
    try:
        session = db.guided_sessions.find_one({"_id": ObjectId(session_id)})
    except:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": str(session["_id"]),
        "current_step": session.get("current_step", 1),
        "data": session.get("data", {}),
        "completed": session.get("completed", False)
    }