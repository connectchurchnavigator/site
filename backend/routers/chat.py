from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import hashlib
import re
import os
import anthropic

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

MONGO_URI = os.getenv("MONGODB_URI")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MAX_CLAUDE_CALLS_PER_DAY = 50

async def get_db():
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = "DEV-ChurchNavigator" if os.getenv("ENVIRONMENT") == "dev" else "ChurchNavigator"
    return client[db_name]

PATTERNS = [
    {
        "keywords": ["service", "time", "when", "sunday", "morning", "evening", "worship", "what time"],
        "field": "service_times",
        "template": "service_times"
    },
    {
        "keywords": ["where", "location", "address", "directions", "postcode", "find"],
        "field": "address",
        "template": "location"
    },
    {
        "keywords": ["parking", "park", "car park"],
        "field": "parking",
        "template": "parking"
    },
    {
        "keywords": ["pastor", "leader", "minister", "reverend", "priest", "who runs", "vicar"],
        "field": "pastor_name",
        "template": "pastor"
    },
    {
        "keywords": ["denomination", "type", "kind", "tradition", "charismatic", "pentecostal", "baptist", "methodist"],
        "field": "denomination",
        "template": "denomination"
    },
    {
        "keywords": ["kids", "children", "youth", "family", "babies", "toddlers", "creche", "nursery"],
        "field": "facilities",
        "template": "kids"
    },
    {
        "keywords": ["register", "sign up", "join", "ticket", "book", "rsvp"],
        "field": "registration",
        "template": "registration"
    },
    {
        "keywords": ["free", "cost", "price", "donation", "ticket price", "how much"],
        "field": "ticket",
        "template": "ticket"
    },
    {
        "keywords": ["disabled", "accessibility", "wheelchair", "accessible"],
        "field": "facilities",
        "template": "accessibility"
    },
    {
        "keywords": ["contact", "email", "phone", "reach", "call", "get in touch"],
        "field": "contact",
        "template": "contact"
    },
    {
        "keywords": ["about", "tell me", "what is", "overview", "history", "describe"],
        "field": "description",
        "template": "about"
    },
    {
        "keywords": ["events", "upcoming", "what's on", "this week", "this month"],
        "field": "events",
        "template": "events"
    },
    {
        "keywords": ["small group", "cell group", "home group", "bible study"],
        "field": "small_groups",
        "template": "small_groups"
    },
    {
        "keywords": ["volunteer", "help", "serve", "get involved"],
        "field": "volunteer",
        "template": "volunteer"
    }
]

def normalize_message(message: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', message.lower().strip())

def hash_question(question: str) -> str:
    return hashlib.md5(normalize_message(question).encode()).hexdigest()

def detect_intent(message: str) -> Optional[dict]:
    normalized = normalize_message(message)
    for pattern in PATTERNS:
        if any(keyword in normalized for keyword in pattern["keywords"]):
            return pattern
    return None

def generate_answer(listing_type: str, listing_data: dict, intent: dict) -> str:
    template = intent["template"]
    
    if template == "service_times":
        times = listing_data.get("service_times", [])
        if times:
            return f"Services are held on {', '.join([f\"{t.get('day')} at {t.get('time')}\" for t in times])}."
        return "Service times are not currently listed. Please contact the church directly."
    
    elif template == "location":
        address = listing_data.get("address", {})
        street = address.get("street", "")
        city = address.get("city", "")
        postcode = address.get("postcode", "")
        if street or city:
            return f"We're located at {street}, {city} {postcode}. You can find us on the map on our page."
        return "Address details are available on the church page."
    
    elif template == "parking":
        parking = listing_data.get("parking", "")
        if parking:
            return f"Parking: {parking}"
        return "Please check the church page for parking information or contact them directly."
    
    elif template == "pastor":
        pastor_name = listing_data.get("pastor_name", "")
        pastor_slug = listing_data.get("pastor_slug", "")
        if pastor_name:
            if pastor_slug:
                return f"Our pastor is {pastor_name}. You can learn more about them on their profile page."
            return f"Our pastor is {pastor_name}."
        return "Pastor information is available on the church page."
    
    elif template == "denomination":
        denom = listing_data.get("denomination", "")
        if denom:
            return f"We are a {denom} church."
        return "Denomination information is available on the church page."
    
    elif template == "kids":
        facilities = listing_data.get("facilities", {})
        kids_info = []
        if facilities.get("kids_program"):
            kids_info.append("children's programs")
        if facilities.get("creche"):
            kids_info.append("crèche facilities")
        if facilities.get("youth_group"):
            kids_info.append("youth groups")
        if kids_info:
            return f"We offer {', '.join(kids_info)}. Check our page for more details."
        return "Please contact the church for information about children and youth programs."
    
    elif template == "registration":
        if listing_type == "event":
            reg_url = listing_data.get("registration_url", "")
            if reg_url:
                return f"You can register at: {reg_url}"
            return "Registration details are available on the event page."
        contact = listing_data.get("contact_email", "")
        if contact:
            return f"To join us, please reach out at {contact}."
        return "Contact information is available on the church page."
    
    elif template == "ticket":
        if listing_type == "event":
            ticket_type = listing_data.get("ticket_type", "")
            ticket_price = listing_data.get("ticket_price", "")
            if ticket_type == "free":
                return "This event is free to attend!"
            elif ticket_price:
                return f"Tickets are {ticket_price}."
        return "Pricing information is available on the event page."
    
    elif template == "accessibility":
        facilities = listing_data.get("facilities", {})
        accessible = facilities.get("wheelchair_accessible", False)
        if accessible:
            return "Our venue is wheelchair accessible."
        return "Please contact us for specific accessibility requirements."
    
    elif template == "contact":
        return None
    
    elif template == "about":
        description = listing_data.get("description", "")
        if description:
            truncated = description[:200]
            if len(description) > 200:
                truncated += "..."
            return f"{truncated} Read more on our page."
        return "Full details are available on our page."
    
    elif template == "events":
        return None
    
    elif template == "small_groups":
        groups = listing_data.get("small_groups", [])
        if groups:
            return f"We have {len(groups)} small group(s) meeting. Check our page for details."
        return "Contact us for information about small groups and Bible studies."
    
    elif template == "volunteer":
        if listing_type == "event":
            return "Contact the event organizer for volunteer opportunities."
        volunteer_info = listing_data.get("volunteer_info", "")
        if volunteer_info:
            return volunteer_info
        return "We'd love to have you serve with us! Please contact us for volunteer opportunities."
    
    return None

def get_suggested_actions(listing_type: str, listing_data: dict) -> List[str]:
    if listing_type == "church":
        return ["Service times", "Find us", "Meet the pastor", "Contact directly"]
    elif listing_type == "event":
        actions = ["What's included", "Location & parking"]
        if listing_data.get("registration_url"):
            actions.insert(0, "Register now")
        actions.append("Contact organizer")
        return actions
    elif listing_type == "pastor":
        return ["Invite to visit", "View sermons", "Contact"]
    return ["Learn more", "Contact directly"]

async def check_claude_rate_limit(db) -> bool:
    today = datetime.utcnow().date()
    rate_limit_doc = await db.claude_rate_limit.find_one({"date": today.isoformat()})
    if not rate_limit_doc:
        return True
    return rate_limit_doc.get("count", 0) < MAX_CLAUDE_CALLS_PER_DAY

async def increment_claude_count(db):
    today = datetime.utcnow().date()
    await db.claude_rate_limit.update_one(
        {"date": today.isoformat()},
        {"$inc": {"count": 1}},
        upsert=True
    )

async def call_claude_fallback(listing_data: dict, message: str, db) -> str:
    if not ANTHROPIC_API_KEY:
        return None
    
    if not await check_claude_rate_limit(db):
        return None
    
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        church_name = listing_data.get("name", "this church")
        
        system_prompt = f"You are a helpful assistant for {church_name}. Answer ONLY using this information: {str(listing_data)}. If you cannot answer from this data, say so and suggest contacting the church directly. Keep answers under 3 sentences."
        
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=200,
            system=system_prompt,
            messages=[{"role": "user", "content": message}]
        )
        
        await increment_claude_count(db)
        return response.content[0].text
    except Exception as e:
        print(f"Claude API error: {e}")
        return None

@router.post("/api/chat/{listing_type}/{slug}", response_model=ChatResponse)
async def chat_endpoint(listing_type: str, slug: str, chat_msg: ChatMessage, db=Depends(get_db)):
    if listing_type not in ["church", "event", "pastor"]:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_map = {
        "church": "churches",
        "event": "events",
        "pastor": "pastors"
    }
    
    collection = db[collection_map[listing_type]]
    listing = await collection.find_one({"slug": slug})
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    question_hash = hash_question(chat_msg.message)
    
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
        return ChatResponse(
            answer=cache["answer"],
            source=cache["source"],
            suggested_actions=get_suggested_actions(listing_type, listing),
            contact_prompt=cache.get("contact_prompt", False),
            contact_email=listing.get("contact_email"),
            contact_phone=listing.get("phone")
        )
    
    intent = detect_intent(chat_msg.message)
    
    if intent:
        if intent["template"] == "contact":
            answer = "Here's how to reach us:"
            await db.chat_faq_cache.insert_one({
                "listing_type": listing_type,
                "slug": slug,
                "question_hash": question_hash,
                "answer": answer,
                "source": "contact",
                "contact_prompt": True,
                "created_at": datetime.utcnow(),
                "hit_count": 1
            })
            return ChatResponse(
                answer=answer,
                source="contact",
                suggested_actions=get_suggested_actions(listing_type, listing),
                contact_prompt=True,
                contact_email=listing.get("contact_email"),
                contact_phone=listing.get("phone")
            )
        
        elif intent["template"] == "events" and listing_type == "church":
            church_id = str(listing["_id"])
            upcoming_events = await db.events.find({
                "church_id": church_id,
                "date": {"$gte": datetime.utcnow()}
            }).sort("date", 1).limit(3).to_list(3)
            
            if upcoming_events:
                event_list = ", ".join([e.get("name", "Event") for e in upcoming_events])
                answer = f"Upcoming events: {event_list}. Check our page for full details."
            else:
                answer = "No upcoming events are currently scheduled. Check back soon!"
            
            await db.chat_faq_cache.insert_one({
                "listing_type": listing_type,
                "slug": slug,
                "question_hash": question_hash,
                "answer": answer,
                "source": "data",
                "created_at": datetime.utcnow(),
                "hit_count": 1
            })
            return ChatResponse(
                answer=answer,
                source="data",
                suggested_actions=get_suggested_actions(listing_type, listing),
                contact_prompt=False
            )
        
        else:
            answer = generate_answer(listing_type, listing, intent)
            if answer:
                await db.chat_faq_cache.insert_one({
                    "listing_type": listing_type,
                    "slug": slug,
                    "question_hash": question_hash,
                    "answer": answer,
                    "source": "data",
                    "created_at": datetime.utcnow(),
                    "hit_count": 1
                })
                return ChatResponse(
                    answer=answer,
                    source="data",
                    suggested_actions=get_suggested_actions(listing_type, listing),
                    contact_prompt=False
                )
    
    claude_answer = await call_claude_fallback(listing, chat_msg.message, db)
    
    if claude_answer:
        await db.chat_faq_cache.insert_one({
            "listing_type": listing_type,
            "slug": slug,
            "question_hash": question_hash,
            "answer": claude_answer,
            "source": "ai",
            "created_at": datetime.utcnow(),
            "hit_count": 1
        })
        return ChatResponse(
            answer=claude_answer,
            source="ai",
            suggested_actions=get_suggested_actions(listing_type, listing),
            contact_prompt=False
        )
    
    fallback_answer = f"I don't have that information, but you can reach {listing.get('name', 'us')} directly!"
    await db.chat_faq_cache.insert_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "answer": fallback_answer,
        "source": "contact",
        "contact_prompt": True,
        "created_at": datetime.utcnow(),
        "hit_count": 1
    })
    return ChatResponse(
        answer=fallback_answer,
        source="contact",
        suggested_actions=get_suggested_actions(listing_type, listing),
        contact_prompt=True,
        contact_email=listing.get("contact_email"),
        contact_phone=listing.get("phone")
    )