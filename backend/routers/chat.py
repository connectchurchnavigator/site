from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import hashlib
import re
from motor.motor_asyncio import AsyncIOMotorClient
from anthropic import Anthropic
import os
import json

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    session_id: str

class ChatResponse(BaseModel):
    answer: str
    source: str
    suggested_actions: List[str]
    contact_prompt: bool
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

MONGO_URI = os.getenv("MONGO_URI")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client["DEV-ChurchNavigator"]
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

INTENT_PATTERNS = [
    {
        "keywords": ["service time", "when", "what time", "sunday", "morning", "evening", "worship time", "service schedule"],
        "field": "service_times",
        "template": "Services are on {service_times}",
        "applies_to": ["church"]
    },
    {
        "keywords": ["where", "location", "address", "directions", "how to get", "postcode", "find you"],
        "field": "address",
        "template": "We're located at {address_full}. {parking_info}",
        "applies_to": ["church", "event"]
    },
    {
        "keywords": ["parking", "park", "disabled access", "accessibility", "wheelchair"],
        "field": "facilities",
        "template": "{parking_info}",
        "applies_to": ["church"]
    },
    {
        "keywords": ["pastor", "leader", "who runs", "minister", "reverend", "vicar", "priest"],
        "field": "pastor_name",
        "template": "Our pastor is {pastor_name}. Learn more about them on our team page.",
        "applies_to": ["church"]
    },
    {
        "keywords": ["denomination", "type", "kind of church", "tradition", "charismatic", "pentecostal", "baptist", "anglican"],
        "field": "denomination",
        "template": "We are a {denomination} church.",
        "applies_to": ["church"]
    },
    {
        "keywords": ["kids", "children", "youth", "family", "babies", "toddlers", "creche", "nursery", "sunday school"],
        "field": "facilities",
        "template": "{kids_info}",
        "applies_to": ["church"]
    },
    {
        "keywords": ["register", "sign up", "how to join", "ticket", "book", "rsvp", "attend"],
        "field": "registration_url",
        "template": "{registration_info}",
        "applies_to": ["event"]
    },
    {
        "keywords": ["free", "cost", "price", "ticket", "donation", "fee", "how much"],
        "field": "ticket_type",
        "template": "{ticket_info}",
        "applies_to": ["event"]
    },
    {
        "keywords": ["contact", "email", "phone", "reach", "call", "get in touch", "message"],
        "field": "contact",
        "template": "You can contact us at {contact_email}{phone_info}",
        "applies_to": ["church", "event", "pastor"]
    },
    {
        "keywords": ["about", "tell me", "what is", "overview", "history", "who are you"],
        "field": "description",
        "template": "{description_short}",
        "applies_to": ["church", "event", "pastor"]
    },
    {
        "keywords": ["upcoming events", "what's on", "events", "this week", "this month", "activities"],
        "field": "events",
        "template": "{upcoming_events}",
        "applies_to": ["church"]
    },
    {
        "keywords": ["small groups", "cell groups", "home groups", "bible study", "connect groups"],
        "field": "small_groups",
        "template": "{small_groups_info}",
        "applies_to": ["church"]
    },
    {
        "keywords": ["volunteer", "help out", "serve", "get involved", "join team"],
        "field": "volunteer_info",
        "template": "{volunteer_info}",
        "applies_to": ["church", "event"]
    }
]

SUGGESTED_ACTIONS = {
    "church": ["Service times", "Find us", "Meet the pastor", "Upcoming events", "Contact directly"],
    "event": ["Register now", "What's included", "Location & parking", "Contact organiser"],
    "pastor": ["Invite to visit", "View sermons", "Contact"]
}

def normalize_message(message: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', message.lower().strip())

def hash_message(message: str) -> str:
    return hashlib.md5(normalize_message(message).encode()).hexdigest()

def detect_intent(message: str, listing_type: str):
    normalized = normalize_message(message)
    for pattern in INTENT_PATTERNS:
        if listing_type not in pattern["applies_to"]:
            continue
        for keyword in pattern["keywords"]:
            if keyword in normalized:
                return pattern
    return None

async def get_cached_response(listing_type: str, slug: str, message_hash: str):
    cache_collection = db["chat_faq_cache"]
    cached = await cache_collection.find_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": message_hash,
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
    })
    if cached:
        await cache_collection.update_one(
            {"_id": cached["_id"]},
            {"$inc": {"hit_count": 1}}
        )
        return cached
    return None

async def cache_response(listing_type: str, slug: str, message_hash: str, answer: str, source: str):
    cache_collection = db["chat_faq_cache"]
    await cache_collection.insert_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": message_hash,
        "answer": answer,
        "source": source,
        "created_at": datetime.utcnow(),
        "hit_count": 1
    })

async def check_rate_limit() -> bool:
    rate_limit_collection = db["claude_rate_limit"]
    today = datetime.utcnow().date()
    record = await rate_limit_collection.find_one({"date": today.isoformat()})
    if record and record.get("count", 0) >= 50:
        return False
    return True

async def increment_rate_limit():
    rate_limit_collection = db["claude_rate_limit"]
    today = datetime.utcnow().date()
    await rate_limit_collection.update_one(
        {"date": today.isoformat()},
        {"$inc": {"count": 1}},
        upsert=True
    )

async def get_listing_data(listing_type: str, slug: str):
    collection_map = {
        "church": "churches",
        "event": "events",
        "pastor": "pastors"
    }
    collection = db[collection_map.get(listing_type)]
    return await collection.find_one({"slug": slug})

def format_answer(intent: dict, data: dict, listing_type: str) -> str:
    if intent["field"] == "service_times" and "service_times" in data:
        return intent["template"].replace("{service_times}", data["service_times"])
    
    elif intent["field"] == "address":
        address_parts = []
        if "address_line1" in data:
            address_parts.append(data["address_line1"])
        if "city" in data:
            address_parts.append(data["city"])
        if "postcode" in data:
            address_parts.append(data["postcode"])
        address_full = ", ".join(address_parts)
        parking_info = ""
        if "facilities" in data and isinstance(data["facilities"], dict):
            if data["facilities"].get("parking"):
                parking_info = " Parking is available."
        return intent["template"].replace("{address_full}", address_full).replace("{parking_info}", parking_info)
    
    elif intent["field"] == "facilities" and "parking" in intent["keywords"]:
        if "facilities" in data and isinstance(data["facilities"], dict):
            parking = data["facilities"].get("parking", False)
            disabled = data["facilities"].get("disabled_access", False)
            info = []
            if parking:
                info.append("Parking is available")
            if disabled:
                info.append("wheelchair accessible")
            return ". ".join(info) + "." if info else "Please contact us for parking and accessibility information."
        return "Please contact us for parking and accessibility information."
    
    elif intent["field"] == "pastor_name" and "pastor_name" in data:
        return intent["template"].replace("{pastor_name}", data["pastor_name"])
    
    elif intent["field"] == "denomination" and "denomination" in data:
        return intent["template"].replace("{denomination}", data["denomination"])
    
    elif intent["field"] == "facilities" and "kids" in intent["keywords"]:
        if "facilities" in data and isinstance(data["facilities"], dict):
            kids_info = []
            if data["facilities"].get("kids_program"):
                kids_info.append("children's program")
            if data["facilities"].get("creche"):
                kids_info.append("creche")
            if data["facilities"].get("youth_group"):
                kids_info.append("youth group")
            if kids_info:
                return f"We offer {', '.join(kids_info)}."
        return "Please contact us for information about children's programs."
    
    elif intent["field"] == "registration_url":
        if "registration_url" in data and data["registration_url"]:
            return f"You can register here: {data['registration_url']}"
        elif "contact_email" in data:
            return f"Please contact us at {data['contact_email']} to register."
        return "Please contact the organiser to register."
    
    elif intent["field"] == "ticket_type":
        if listing_type == "event":
            ticket_type = data.get("ticket_type", "free")
            if ticket_type == "free":
                return "This event is free to attend."
            elif ticket_type == "paid" and "ticket_price" in data:
                return f"Tickets cost {data['ticket_price']}."
            elif ticket_type == "donation":
                return "This event is by donation."
        return "Please contact us for pricing information."
    
    elif intent["field"] == "contact":
        contact_parts = []
        if "contact_email" in data:
            contact_parts.append(data["contact_email"])
        phone_info = ""
        if "phone" in data:
            phone_info = f" or call {data['phone']}"
        email_info = contact_parts[0] if contact_parts else "the contact form on our website"
        return intent["template"].replace("{contact_email}", email_info).replace("{phone_info}", phone_info)
    
    elif intent["field"] == "description" and "description" in data:
        desc = data["description"]
        short_desc = desc[:200] + "..." if len(desc) > 200 else desc
        return f"{short_desc} Read more on our full profile."
    
    elif intent["field"] == "events":
        return "Check our events page for upcoming activities and gatherings."
    
    elif intent["field"] == "small_groups":
        return "We offer various small groups for connection and growth. Contact us to learn more."
    
    elif intent["field"] == "volunteer_info":
        if listing_type == "event" and "volunteer_roles" in data:
            return "We're looking for volunteers! Contact us to get involved."
        return "We'd love to have you serve with us! Please get in touch to learn about opportunities."
    
    return "I can help you with that. Please contact us directly for more details."

async def call_claude(message: str, data: dict, listing_type: str) -> str:
    if not anthropic_client:
        return None
    
    if not await check_rate_limit():
        return None
    
    try:
        name = data.get("name", "this church")
        data_json = json.dumps({
            k: v for k, v in data.items() 
            if k not in ["_id", "created_at", "updated_at"]
        }, default=str, indent=2)
        
        system_prompt = f"You are a helpful assistant for {name}. Answer ONLY using this information: {data_json}. If you cannot answer from this data, say so and suggest contacting them directly. Keep answers under 3 sentences."
        
        response = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=150,
            system=system_prompt,
            messages=[{"role": "user", "content": message}]
        )
        
        await increment_rate_limit()
        return response.content[0].text
    except Exception as e:
        print(f"Claude API error: {e}")
        return None

@router.post("/api/chat/{listing_type}/{slug}", response_model=ChatResponse)
async def chat_endpoint(listing_type: str, slug: str, chat_message: ChatMessage):
    if listing_type not in ["church", "event", "pastor"]:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    message = chat_message.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    message_hash = hash_message(message)
    
    cached = await get_cached_response(listing_type, slug, message_hash)
    if cached:
        return ChatResponse(
            answer=cached["answer"],
            source=cached["source"],
            suggested_actions=SUGGESTED_ACTIONS.get(listing_type, ["Contact directly"]),
            contact_prompt=False
        )
    
    data = await get_listing_data(listing_type, slug)
    if not data:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    intent = detect_intent(message, listing_type)
    
    if intent:
        answer = format_answer(intent, data, listing_type)
        await cache_response(listing_type, slug, message_hash, answer, "data")
        return ChatResponse(
            answer=answer,
            source="data",
            suggested_actions=SUGGESTED_ACTIONS.get(listing_type, ["Contact directly"]),
            contact_prompt=False
        )
    
    claude_answer = await call_claude(message, data, listing_type)
    if claude_answer:
        await cache_response(listing_type, slug, message_hash, claude_answer, "ai")
        return ChatResponse(
            answer=claude_answer,
            source="ai",
            suggested_actions=SUGGESTED_ACTIONS.get(listing_type, ["Contact directly"]),
            contact_prompt=False
        )
    
    contact_answer = f"I don't have that specific information, but you can reach {data.get('name', 'us')} directly for details!"
    return ChatResponse(
        answer=contact_answer,
        source="contact",
        suggested_actions=["Contact directly"],
        contact_prompt=True,
        contact_email=data.get("contact_email"),
        contact_phone=data.get("phone")
    )