from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, time
import httpx
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..database import get_database
from anthropic import Anthropic
import asyncio

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_API_URL = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

class WhatsAppMessage(BaseModel):
    to: str
    message: str
    template_name: Optional[str] = None
    template_params: Optional[List[str]] = None

class BroadcastRequest(BaseModel):
    church_id: str
    message: str
    template_name: Optional[str] = None
    template_params: Optional[List[str]] = None

class DevotionalSchedule(BaseModel):
    church_id: str
    enabled: bool
    send_time: str
    language: str = "en"

class WelcomeMessageRequest(BaseModel):
    church_id: str
    visitor_phone: str
    visitor_name: str

async def send_whatsapp_message(to: str, message: str, template_name: str = None, template_params: List[str] = None) -> dict:
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    
    if template_name:
        payload = {
            "messaging_product": "whatsapp",
            "to": to.replace("+", "").replace(" ", ""),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": p} for p in (template_params or [])]
                    }
                ]
            }
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": to.replace("+", "").replace(" ", ""),
            "type": "text",
            "text": {"body": message}
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(WHATSAPP_API_URL, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"WhatsApp API error: {str(e)}")

@router.post("/send")
async def send_message(msg: WhatsAppMessage, db: AsyncIOMotorDatabase = Depends(get_database)):
    result = await send_whatsapp_message(msg.to, msg.message, msg.template_name, msg.template_params)
    
    await db.whatsapp_messages.insert_one({
        "to": msg.to,
        "message": msg.message,
        "template_name": msg.template_name,
        "sent_at": datetime.utcnow(),
        "whatsapp_message_id": result.get("messages", [{}])[0].get("id"),
        "status": "sent"
    })
    
    return {"success": True, "message_id": result.get("messages", [{}])[0].get("id")}

@router.post("/broadcast/{church_id}")
async def broadcast_message(church_id: str, request: BroadcastRequest, background_tasks: BackgroundTasks, db: AsyncIOMotorDatabase = Depends(get_database)):
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    followers = await db.follows.find({
        "church_id": church_id,
        "whatsapp_opted_in": True,
        "phone": {"$exists": True, "$ne": ""}
    }).to_list(None)
    
    if not followers:
        return {"success": True, "sent_count": 0, "message": "No opted-in followers with phone numbers"}
    
    sent_count = 0
    failed_count = 0
    
    for follower in followers:
        try:
            await send_whatsapp_message(
                follower["phone"],
                request.message,
                request.template_name,
                request.template_params
            )
            sent_count += 1
            await db.whatsapp_broadcasts.insert_one({
                "church_id": church_id,
                "follower_id": follower.get("user_id"),
                "phone": follower["phone"],
                "message": request.message,
                "sent_at": datetime.utcnow(),
                "status": "sent"
            })
        except Exception as e:
            failed_count += 1
            await db.whatsapp_broadcasts.insert_one({
                "church_id": church_id,
                "follower_id": follower.get("user_id"),
                "phone": follower["phone"],
                "message": request.message,
                "sent_at": datetime.utcnow(),
                "status": "failed",
                "error": str(e)
            })
        await asyncio.sleep(0.5)
    
    return {"success": True, "sent_count": sent_count, "failed_count": failed_count}

async def generate_devotional(church_name: str, language: str = "en") -> str:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    
    prompt = f"""Generate a daily devotional message for {church_name}.

Include:
1. A Bible verse (reference + text)
2. A 2-sentence reflection on the verse
3. A short prayer (1-2 sentences)

Keep it concise (max 150 words total). Language: {language}.
Format:
📖 [Verse Reference]
[Verse text]

💭 [Reflection]

🙏 [Prayer]"""
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return message.content[0].text

@router.post("/devotional/schedule")
async def schedule_devotional(schedule: DevotionalSchedule, db: AsyncIOMotorDatabase = Depends(get_database)):
    church = await db.churches.find_one({"_id": ObjectId(schedule.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one(
        {"_id": ObjectId(schedule.church_id)},
        {"$set": {
            "devotional_settings": {
                "enabled": schedule.enabled,
                "send_time": schedule.send_time,
                "language": schedule.language,
                "updated_at": datetime.utcnow()
            }
        }}
    )
    
    return {"success": True, "message": "Devotional schedule updated"}

@router.post("/devotional/send/{church_id}")
async def send_devotional(church_id: str, background_tasks: BackgroundTasks, db: AsyncIOMotorDatabase = Depends(get_database)):
    church = await db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    settings = church.get("devotional_settings", {})
    if not settings.get("enabled"):
        return {"success": False, "message": "Devotional not enabled for this church"}
    
    devotional_text = await generate_devotional(church["name"], settings.get("language", "en"))
    
    header = f"🙏 {church['name']}\n\n"
    full_message = header + devotional_text
    
    followers = await db.follows.find({
        "church_id": church_id,
        "whatsapp_opted_in": True,
        "phone": {"$exists": True, "$ne": ""}
    }).to_list(None)
    
    sent_count = 0
    for follower in followers:
        try:
            await send_whatsapp_message(follower["phone"], full_message)
            sent_count += 1
            await db.devotional_sends.insert_one({
                "church_id": church_id,
                "follower_id": follower.get("user_id"),
                "phone": follower["phone"],
                "message": full_message,
                "sent_at": datetime.utcnow(),
                "status": "sent"
            })
        except:
            pass
        await asyncio.sleep(0.5)
    
    return {"success": True, "sent_count": sent_count}

@router.post("/welcome")
async def send_welcome_message(request: WelcomeMessageRequest, db: AsyncIOMotorDatabase = Depends(get_database)):
    church = await db.churches.find_one({"_id": ObjectId(request.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    pastor_name = church.get("pastor_name", "the team")
    service_time = church.get("service_times", [{}])[0].get("time", "soon")
    
    message = f"""Welcome to {church['name']}! 🙏

We're so glad you're here, {request.visitor_name}!

Your pastor {pastor_name} looks forward to meeting you. Service starts at {service_time}.

See you soon!"""
    
    result = await send_whatsapp_message(request.visitor_phone, message)
    
    await db.whatsapp_welcome.insert_one({
        "church_id": request.church_id,
        "visitor_name": request.visitor_name,
        "visitor_phone": request.visitor_phone,
        "message": message,
        "sent_at": datetime.utcnow(),
        "whatsapp_message_id": result.get("messages", [{}])[0].get("id")
    })
    
    return {"success": True}

@router.get("/stats/{church_id}")
async def get_whatsapp_stats(church_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    total_broadcasts = await db.whatsapp_broadcasts.count_documents({"church_id": church_id})
    successful_sends = await db.whatsapp_broadcasts.count_documents({"church_id": church_id, "status": "sent"})
    failed_sends = await db.whatsapp_broadcasts.count_documents({"church_id": church_id, "status": "failed"})
    
    total_devotionals = await db.devotional_sends.count_documents({"church_id": church_id})
    
    opted_in_followers = await db.follows.count_documents({
        "church_id": church_id,
        "whatsapp_opted_in": True
    })
    
    recent_broadcasts = await db.whatsapp_broadcasts.find(
        {"church_id": church_id}
    ).sort("sent_at", -1).limit(10).to_list(10)
    
    return {
        "total_broadcasts": total_broadcasts,
        "successful_sends": successful_sends,
        "failed_sends": failed_sends,
        "total_devotionals": total_devotionals,
        "opted_in_followers": opted_in_followers,
        "recent_broadcasts": [
            {
                "phone": b["phone"],
                "status": b["status"],
                "sent_at": b["sent_at"].isoformat(),
                "message_preview": b["message"][:50] + "..."
            }
            for b in recent_broadcasts
        ]
    }
