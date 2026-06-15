from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import hashlib
import re
import os
from anthropic import Anthropic
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/chat", tags=["chat"])

MONGODB_URL = os.getenv("MONGODB_URL")
db_client = AsyncIOMotorClient(MONGODB_URL)
db = db_client["DEV-ChurchNavigator"]

anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_CLAUDE_CALLS_PER_DAY = 50
CACHE_TTL_DAYS = 7

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    session_id: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    answer: str
    source: str
    suggested_actions: List[str]
    contact_prompt: bool = False
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

INTENT_PATTERNS = {
    "service_times": {
        "keywords": ["service", "time", "when", "sunday", "morning", "evening", "worship", "meet", "gathering"],
        "fields": ["service_times", "sunday_service", "weekday_services"]
    },
    "location": {
        "keywords": ["where", "location", "address", "directions", "parking", "postcode", "find", "map", "how to get"],
        "fields": ["address", "city", "postcode", "parking", "directions"]
    },
    "pastor": {
        "keywords": ["pastor", "leader", "minister", "reverend", "priest", "vicar", "who runs", "who leads"],
        "fields": ["pastor_name", "pastor_id", "leadership"]
    },
    "denomination": {
        "keywords": ["denomination", "type", "kind", "tradition", "charismatic", "pentecostal", "baptist", "methodist", "catholic", "anglican"],
        "fields": ["denomination", "tradition", "affiliation"]
    },
    "kids": {
        "keywords": ["kids", "children", "youth", "family", "babies", "toddlers", "creche", "nursery", "sunday school"],
        "fields": ["facilities", "kids_program", "youth_ministry", "childrens_ministry"]
    },
    "registration": {
        "keywords": ["register", "sign up", "join", "ticket", "book", "rsvp", "attend"],
        "fields": ["registration_url", "signup_link", "contact_email"]
    },
    "cost": {
        "keywords": ["free", "cost", "price", "ticket", "donation", "fee", "pay", "charge"],
        "fields": ["ticket_type", "ticket_price", "cost", "free_event"]
    },
    "accessibility": {
        "keywords": ["disabled", "accessibility", "wheelchair", "accessible", "access"],
        "fields": ["facilities", "accessibility", "wheelchair_access"]
    },
    "contact": {
        "keywords": ["contact", "email", "phone", "reach", "call", "message", "get in touch"],
        "fields": ["contact_email", "phone", "website"]
    },
    "about": {
        "keywords": ["about", "tell me", "what is", "overview", "history", "story", "mission", "vision"],
        "fields": ["description", "about", "mission", "vision", "history"]
    },
    "events": {
        "keywords": ["events", "what's on", "upcoming", "next", "this week", "this month", "happening"],
        "fields": ["events"]
    },
    "small_groups": {
        "keywords": ["small group", "cell group", "home group", "bible study", "connect group", "life group"],
        "fields": ["small_groups", "groups"]
    },
    "volunteer": {
        "keywords": ["volunteer", "help", "serve", "get involved", "join team", "participate"],
        "fields": ["volunteer_info", "opportunities", "serving"]
    }
}

SUGGESTED_ACTIONS = {
    "church": ["Service times", "Find us", "Meet the pastor", "Upcoming events", "Contact directly"],
    "event": ["Register now", "What's included", "Location & parking", "Contact organiser"],
    "pastor": ["Invite to visit", "View sermons", "Contact"],
    "default": ["Learn more", "Get directions", "Contact directly"]
}

def normalize_text(text: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', text.lower().strip())

def hash_question(question: str) -> str:
    normalized = normalize_text(question)
    return hashlib.md5(normalized.encode()).hexdigest()

def detect_intent(message: str) -> Optional[str]:
    normalized = normalize_text(message)
    words = normalized.split()
    
    scores = {}
    for intent, config in INTENT_PATTERNS.items():
        score = sum(1 for keyword in config["keywords"] if keyword in normalized)
        if score > 0:
            scores[intent] = score
    
    if scores:
        return max(scores, key=scores.get)
    return None

def build_answer_from_data(intent: str, data: Dict[str, Any], listing_type: str) -> Optional[str]:
    if intent == "service_times":
        if "service_times" in data and data["service_times"]:
            times = data["service_times"]
            if isinstance(times, str):
                return f"Services are {times}"
            elif isinstance(times, dict):
                parts = [f"{day}: {time}" for day, time in times.items()]
                return f"Services are {', '.join(parts)}"
        elif "sunday_service" in data:
            return f"Sunday service is at {data['sunday_service']}"
        return None
    
    elif intent == "location":
        parts = []
        if "address" in data:
            parts.append(f"We're located at {data['address']}")
        if "city" in data:
            parts[-1] = parts[-1] + f", {data['city']}"
        if "postcode" in data:
            parts[-1] = parts[-1] + f" {data['postcode']}"
        if "parking" in data and data["parking"]:
            parts.append(f"Parking: {data['parking']}")
        return ". ".join(parts) if parts else None
    
    elif intent == "pastor":
        if "pastor_name" in data and data["pastor_name"]:
            name = data["pastor_name"]
            if "pastor_id" in data:
                return f"Our pastor is {name}. Click here to learn more about them."
            return f"Our pastor is {name}."
        return None
    
    elif intent == "denomination":
        if "denomination" in data:
            return f"We are a {data['denomination']} church."
        return None
    
    elif intent == "kids":
        facilities = data.get("facilities", {})
        if isinstance(facilities, dict):
            kids_info = []
            if facilities.get("kids_program"):
                kids_info.append("children's programs")
            if facilities.get("creche"):
                kids_info.append("creche")
            if facilities.get("youth_ministry"):
                kids_info.append("youth ministry")
            if kids_info:
                return f"We offer {', '.join(kids_info)} for families."
        return None
    
    elif intent == "registration":
        if listing_type == "event":
            if "registration_url" in data:
                return f"You can register here: {data['registration_url']}"
        if "contact_email" in data:
            return f"To register or learn more, contact us at {data['contact_email']}"
        return None
    
    elif intent == "cost":
        if "ticket_type" in data:
            if data["ticket_type"] == "free":
                return "This event is free to attend!"
            elif "ticket_price" in data:
                return f"Tickets are {data['ticket_price']}"
        return None
    
    elif intent == "accessibility":
        facilities = data.get("facilities", {})
        if isinstance(facilities, dict) and facilities.get("wheelchair_access"):
            return "We have wheelchair access and accessible facilities."
        return None
    
    elif intent == "contact":
        parts = []
        if "contact_email" in data:
            parts.append(f"Email: {data['contact_email']}")
        if "phone" in data:
            parts.append(f"Phone: {data['phone']}")
        if "website" in data:
            parts.append(f"Website: {data['website']}")
        return " | ".join(parts) if parts else None
    
    elif intent == "about":
        if "description" in data and data["description"]:
            desc = data["description"]
            if len(desc) > 200:
                return desc[:200] + "... Read more on our page."
            return desc
        return None
    
    return None

async def get_cached_answer(listing_type: str, slug: str, question_hash: str) -> Optional[Dict[str, Any]]:
    cache = await db.chat_faq_cache.find_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=CACHE_TTL_DAYS)}
    })
    
    if cache:
        await db.chat_faq_cache.update_one(
            {"_id": cache["_id"]},
            {"$inc": {"hit_count": 1}}
        )
        return {
            "answer": cache["answer"],
            "source": cache["source"]
        }
    return None

async def cache_answer(listing_type: str, slug: str, question_hash: str, answer: str, source: str):
    await db.chat_faq_cache.insert_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "answer": answer,
        "source": source,
        "created_at": datetime.utcnow(),
        "hit_count": 0
    })

async def check_claude_rate_limit() -> bool:
    today = datetime.utcnow().date()
    count_doc = await db.claude_rate_limit.find_one({"date": today})
    
    if not count_doc:
        await db.claude_rate_limit.insert_one({"date": today, "count": 0})
        return True
    
    return count_doc["count"] < MAX_CLAUDE_CALLS_PER_DAY

async def increment_claude_usage():
    today = datetime.utcnow().date()
    await db.claude_rate_limit.update_one(
        {"date": today},
        {"$inc": {"count": 1}},
        upsert=True
    )

async def call_claude_fallback(message: str, listing_data: Dict[str, Any], listing_name: str) -> str:
    system_prompt = f"""You are a helpful assistant for {listing_name}. 
Answer ONLY using this information: {listing_data}.
If you cannot answer from this data, say so and suggest contacting directly.
Keep answers under 3 sentences."""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=150,
            system=system_prompt,
            messages=[{"role": "user", "content": message}]
        )
        return response.content[0].text
    except Exception as e:
        return f"I couldn't process that question. Please contact {listing_name} directly for assistance."

@router.post("/{listing_type}/{slug}", response_model=ChatResponse)
async def chat_endpoint(listing_type: str, slug: str, message: ChatMessage):
    if listing_type not in ["church", "event", "pastor"]:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_name = f"{listing_type}es" if listing_type in ["church"] else f"{listing_type}s"
    listing = await db[collection_name].find_one({"slug": slug})
    
    if not listing:
        raise HTTPException(status_code=404, detail=f"{listing_type.capitalize()} not found")
    
    question_hash = hash_question(message.message)
    
    cached = await get_cached_answer(listing_type, slug, question_hash)
    if cached:
        return ChatResponse(
            answer=cached["answer"],
            source=cached["source"],
            suggested_actions=SUGGESTED_ACTIONS.get(listing_type, SUGGESTED_ACTIONS["default"]),
            contact_prompt=False
        )
    
    intent = detect_intent(message.message)
    
    if intent:
        answer = build_answer_from_data(intent, listing, listing_type)
        if answer:
            await cache_answer(listing_type, slug, question_hash, answer, "data")
            return ChatResponse(
                answer=answer,
                source="data",
                suggested_actions=SUGGESTED_ACTIONS.get(listing_type, SUGGESTED_ACTIONS["default"]),
                contact_prompt=False
            )
    
    can_use_claude = await check_claude_rate_limit()
    
    if can_use_claude:
        listing_name = listing.get("name", listing.get("title", "this organization"))
        claude_answer = await call_claude_fallback(message.message, dict(listing), listing_name)
        
        await increment_claude_usage()
        await cache_answer(listing_type, slug, question_hash, claude_answer, "ai")
        
        return ChatResponse(
            answer=claude_answer,
            source="ai",
            suggested_actions=SUGGESTED_ACTIONS.get(listing_type, SUGGESTED_ACTIONS["default"]),
            contact_prompt=False
        )
    
    contact_answer = f"I don't have that specific information, but you can reach {listing.get('name', 'us')} directly!"
    return ChatResponse(
        answer=contact_answer,
        source="contact",
        suggested_actions=["Contact directly"],
        contact_prompt=True,
        contact_email=listing.get("contact_email"),
        contact_phone=listing.get("phone")
    )