from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import hashlib
import re
from motor.motor_asyncio import AsyncIOMotorClient
from anthropic import AsyncAnthropic
import os
import json

router = APIRouter()

MONGODB_URI = os.getenv("MONGODB_URI")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
db_client = AsyncIOMotorClient(MONGODB_URI)
db = db_client["DEV-ChurchNavigator"]
anthropic = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

DAILY_CLAUDE_LIMIT = 50

class ChatRequest(BaseModel):
    message: str
    session_id: str

class ChatResponse(BaseModel):
    answer: str
    source: str
    suggested_actions: List[str]
    contact_prompt: bool
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

INTENT_PATTERNS = {
    "service_times": ["service time", "when", "what time", "sunday", "morning", "evening", "worship time", "meet"],
    "location": ["where", "location", "address", "directions", "parking", "postcode", "find you", "how to get"],
    "pastor": ["pastor", "leader", "who runs", "minister", "reverend", "priest", "vicar"],
    "denomination": ["denomination", "type", "kind of church", "tradition", "charismatic", "pentecostal", "baptist", "methodist"],
    "kids": ["kids", "children", "youth", "family", "babies", "toddlers", "creche", "nursery"],
    "register": ["register", "sign up", "how to join", "ticket", "book", "rsvp"],
    "cost": ["free", "cost", "price", "ticket", "donation", "how much"],
    "accessibility": ["disabled", "accessibility", "wheelchair", "accessible"],
    "contact": ["contact", "email", "phone", "reach", "call", "get in touch"],
    "about": ["about", "tell me", "what is", "overview", "history", "describe"],
    "events": ["upcoming events", "what's on", "events", "this week", "this month", "happening"],
    "small_groups": ["small groups", "cell groups", "home groups", "bible study", "connect groups"],
    "volunteer": ["volunteer", "help out", "serve", "get involved", "join team"]
}

def detect_intent(message: str) -> Optional[str]:
    msg_lower = message.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        if any(pattern in msg_lower for pattern in patterns):
            return intent
    return None

def hash_question(question: str) -> str:
    normalized = re.sub(r'[^a-z0-9\s]', '', question.lower()).strip()
    return hashlib.md5(normalized.encode()).hexdigest()

async def check_faq_cache(listing_type: str, slug: str, question: str) -> Optional[dict]:
    question_hash = hash_question(question)
    cache = await db.chat_faq_cache.find_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
    })
    if cache:
        await db.chat_faq_cache.update_one(
            {"_id": cache["_id"]},
            {"$inc": {"hit_count": 1}}
        )
        return {"answer": cache["answer"], "source": cache["source"]}
    return None

async def save_to_cache(listing_type: str, slug: str, question: str, answer: str, source: str):
    question_hash = hash_question(question)
    await db.chat_faq_cache.update_one(
        {"listing_type": listing_type, "slug": slug, "question_hash": question_hash},
        {"$set": {
            "listing_type": listing_type,
            "slug": slug,
            "question_hash": question_hash,
            "question": question,
            "answer": answer,
            "source": source,
            "created_at": datetime.utcnow(),
            "hit_count": 0
        }},
        upsert=True
    )

async def check_claude_rate_limit() -> bool:
    today = datetime.utcnow().date()
    rate_limit = await db.chat_rate_limits.find_one({"date": today})
    if not rate_limit:
        return True
    return rate_limit.get("count", 0) < DAILY_CLAUDE_LIMIT

async def increment_claude_usage():
    today = datetime.utcnow().date()
    await db.chat_rate_limits.update_one(
        {"date": today},
        {"$inc": {"count": 1}, "$set": {"date": today}},
        upsert=True
    )

async def generate_data_answer(intent: str, listing_type: str, data: dict) -> Optional[str]:
    if intent == "service_times" and listing_type == "church":
        times = data.get("service_times", [])
        if times:
            formatted = ", ".join([f"{t.get('day', '')} at {t.get('time', '')}" for t in times if t.get('day') and t.get('time')])
            return f"Services are held on {formatted}." if formatted else None
    
    elif intent == "location" and listing_type == "church":
        address = data.get("address", {})
        street = address.get("street", "")
        city = address.get("city", "")
        postcode = address.get("postcode", "")
        parking = data.get("facilities", {}).get("parking", False)
        parking_info = " Free parking available." if parking else ""
        if street or city:
            return f"We're located at {street}, {city} {postcode}.{parking_info}"
    
    elif intent == "pastor" and listing_type == "church":
        pastor = data.get("pastor_name")
        if pastor:
            pastor_slug = data.get("pastor_slug")
            if pastor_slug:
                return f"Our pastor is {pastor}. You can learn more about them at /pastor/{pastor_slug}"
            return f"Our pastor is {pastor}."
    
    elif intent == "denomination" and listing_type == "church":
        denom = data.get("denomination")
        if denom:
            return f"We are a {denom} church."
    
    elif intent == "kids" and listing_type == "church":
        facilities = data.get("facilities", {})
        kids_program = facilities.get("kids_program", False)
        creche = facilities.get("creche", False)
        if kids_program or creche:
            programs = []
            if kids_program:
                programs.append("children's programs")
            if creche:
                programs.append("crèche facilities")
            return f"Yes! We offer {' and '.join(programs)} for families."
    
    elif intent == "register" and listing_type == "event":
        reg_url = data.get("registration_url")
        contact_email = data.get("contact_email")
        if reg_url:
            return f"You can register at {reg_url}"
        elif contact_email:
            return f"Please contact {contact_email} to register."
    
    elif intent == "cost" and listing_type == "event":
        ticket_type = data.get("ticket_type")
        ticket_price = data.get("ticket_price")
        if ticket_type == "free":
            return "This event is free to attend!"
        elif ticket_price:
            return f"Tickets are £{ticket_price}."
    
    elif intent == "accessibility":
        facilities = data.get("facilities", {})
        wheelchair = facilities.get("wheelchair_accessible", False)
        if wheelchair:
            return "Yes, we are wheelchair accessible."
    
    elif intent == "contact":
        email = data.get("contact_email")
        phone = data.get("phone")
        parts = []
        if email:
            parts.append(f"Email: {email}")
        if phone:
            parts.append(f"Phone: {phone}")
        if parts:
            return " | ".join(parts)
    
    elif intent == "about":
        desc = data.get("description", "")
        if desc:
            preview = desc[:200] + "..." if len(desc) > 200 else desc
            return f"{preview} Read more on the full page."
    
    elif intent == "events" and listing_type == "church":
        church_id = data.get("_id")
        if church_id:
            events = await db.events.find({
                "church_id": str(church_id),
                "date": {"$gte": datetime.utcnow()}
            }).sort("date", 1).limit(3).to_list(3)
            if events:
                event_list = ", ".join([e.get("title", "") for e in events if e.get("title")])
                return f"Upcoming events: {event_list}. See the full events calendar on our page."
    
    return None

def get_suggested_actions(listing_type: str, intent: str) -> List[str]:
    if listing_type == "church":
        return ["Service times", "Find us", "Meet the pastor", "Upcoming events", "Contact directly"]
    elif listing_type == "event":
        return ["Register now", "What's included", "Location & parking", "Contact organiser"]
    elif listing_type == "pastor":
        return ["Invite to visit", "View sermons", "Contact"]
    return ["Learn more", "Contact directly"]

async def call_claude_fallback(listing_type: str, data: dict, question: str) -> Optional[str]:
    if not anthropic:
        return None
    
    if not await check_claude_rate_limit():
        return None
    
    name = data.get("name") or data.get("title") or "this listing"
    data_json = json.dumps({
        k: v for k, v in data.items() 
        if k not in ["_id", "created_at", "updated_at", "slug"]
    }, default=str, indent=2)
    
    system_prompt = f"""You are a helpful assistant for {name}. Answer ONLY using this information:

{data_json}

If you cannot answer from this data, say so and suggest contacting directly. Keep answers under 3 sentences."""
    
    try:
        message = await anthropic.messages.create(
            model="claude-haiku-4-5",
            max_tokens=150,
            system=system_prompt,
            messages=[{"role": "user", "content": question}]
        )
        await increment_claude_usage()
        return message.content[0].text
    except Exception as e:
        print(f"Claude API error: {e}")
        return None

@router.post("/api/chat/{listing_type}/{slug}", response_model=ChatResponse)
async def chat_endpoint(listing_type: str, slug: str, request: ChatRequest):
    if listing_type not in ["church", "event", "pastor"]:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_map = {
        "church": "churches",
        "event": "events",
        "pastor": "pastors"
    }
    
    listing = await db[collection_map[listing_type]].find_one({"slug": slug})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    cached = await check_faq_cache(listing_type, slug, request.message)
    if cached:
        return ChatResponse(
            answer=cached["answer"],
            source=cached["source"],
            suggested_actions=get_suggested_actions(listing_type, None),
            contact_prompt=False
        )
    
    intent = detect_intent(request.message)
    data_answer = None
    
    if intent:
        data_answer = await generate_data_answer(intent, listing_type, listing)
    
    if data_answer:
        await save_to_cache(listing_type, slug, request.message, data_answer, "data")
        return ChatResponse(
            answer=data_answer,
            source="data",
            suggested_actions=get_suggested_actions(listing_type, intent),
            contact_prompt=False
        )
    
    claude_answer = await call_claude_fallback(listing_type, listing, request.message)
    if claude_answer:
        await save_to_cache(listing_type, slug, request.message, claude_answer, "ai")
        return ChatResponse(
            answer=claude_answer,
            source="ai",
            suggested_actions=get_suggested_actions(listing_type, intent),
            contact_prompt=False
        )
    
    contact_email = listing.get("contact_email")
    contact_phone = listing.get("phone")
    name = listing.get("name") or listing.get("title")
    
    return ChatResponse(
        answer=f"I don't have that information, but you can reach {name} directly!",
        source="contact",
        suggested_actions=["Contact directly"],
        contact_prompt=True,
        contact_email=contact_email,
        contact_phone=contact_phone
    )