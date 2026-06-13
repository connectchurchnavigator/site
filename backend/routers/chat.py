from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import hashlib
import re
from anthropic import Anthropic
import os
from database import get_database

router = APIRouter(prefix="/api/chat", tags=["chat"])

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

PATTERN_GROUPS = [
    {
        "patterns": [r"\b(service|worship)\s+(time|hour|schedule)\b", r"\bwhen\b.*\b(service|worship|meet|sunday|morning|evening)\b", r"\bwhat\s+time\b"],
        "field": "service_times",
        "answer_template": "Services are held {service_times}."
    },
    {
        "patterns": [r"\b(where|location|address|direction|find|parking|postcode)\b"],
        "field": "address",
        "answer_template": "We're located at {address}. {parking_info}"
    },
    {
        "patterns": [r"\b(pastor|leader|minister|reverend|vicar|priest|who\s+(runs|leads))\b"],
        "field": "pastor",
        "answer_template": "pastor_info"
    },
    {
        "patterns": [r"\b(denomination|type|kind\s+of\s+church|tradition|charismatic|pentecostal|baptist|methodist|anglican)\b"],
        "field": "denomination",
        "answer_template": "We are a {denomination} church."
    },
    {
        "patterns": [r"\b(kids|children|youth|family|babies|toddler|creche|nursery|sunday\s+school)\b"],
        "field": "facilities",
        "answer_template": "children_info"
    },
    {
        "patterns": [r"\b(register|sign\s+up|join|ticket|book|rsvp)\b"],
        "field": "registration",
        "answer_template": "registration_info"
    },
    {
        "patterns": [r"\b(free|cost|price|fee|donation|pay)\b"],
        "field": "cost",
        "answer_template": "cost_info"
    },
    {
        "patterns": [r"\b(parking|disabled|accessibility|wheelchair|ramp)\b"],
        "field": "accessibility",
        "answer_template": "accessibility_info"
    },
    {
        "patterns": [r"\b(contact|email|phone|reach|call|message|get\s+in\s+touch)\b"],
        "field": "contact",
        "answer_template": "contact_info"
    },
    {
        "patterns": [r"\b(about|tell\s+me|what\s+is|overview|history|describe)\b"],
        "field": "description",
        "answer_template": "about_info"
    },
    {
        "patterns": [r"\b(upcoming|events|what'?s\s+on|happening|this\s+(week|month))\b"],
        "field": "events",
        "answer_template": "events_info"
    },
    {
        "patterns": [r"\b(small\s+group|cell\s+group|home\s+group|bible\s+study|connect\s+group)\b"],
        "field": "small_groups",
        "answer_template": "small_groups_info"
    },
    {
        "patterns": [r"\b(volunteer|help|serve|get\s+involved|join\s+team)\b"],
        "field": "volunteer",
        "answer_template": "volunteer_info"
    }
]

def normalize_question(question: str) -> str:
    return re.sub(r'[^a-z0-9\s]', '', question.lower().strip())

def hash_question(question: str) -> str:
    return hashlib.md5(normalize_question(question).encode()).hexdigest()

def match_pattern(question: str) -> Optional[dict]:
    normalized = normalize_question(question)
    for group in PATTERN_GROUPS:
        for pattern in group["patterns"]:
            if re.search(pattern, normalized, re.IGNORECASE):
                return group
    return None

def get_suggested_actions(listing_type: str, context: dict) -> List[str]:
    if listing_type == "church":
        return ["Service times", "Find us", "Meet the pastor", "Upcoming events", "Contact directly"]
    elif listing_type == "event":
        return ["Register now", "What's included", "Location & parking", "Contact organiser"]
    elif listing_type == "pastor":
        return ["Invite to visit", "View sermons", "Contact directly"]
    else:
        return ["Learn more", "Contact directly"]

def build_answer(template: str, data: dict, listing_type: str) -> str:
    if template == "pastor_info":
        if listing_type == "church" and data.get("pastor_name"):
            pastor_slug = data.get("pastor_slug", "")
            if pastor_slug:
                return f"Our pastor is {data['pastor_name']}. [View their profile](/pastor/{pastor_slug})"
            return f"Our pastor is {data['pastor_name']}."
        return "Please contact us for information about our church leadership."
    
    elif template == "children_info":
        facilities = data.get("facilities", {})
        children_facilities = []
        if facilities.get("kids_program"):
            children_facilities.append("children's programs")
        if facilities.get("creche"):
            children_facilities.append("creche/nursery")
        if facilities.get("youth_group"):
            children_facilities.append("youth group")
        if children_facilities:
            return f"We offer {', '.join(children_facilities)} for families."
        return "Please contact us for information about children and family programs."
    
    elif template == "registration_info":
        if listing_type == "event":
            if data.get("registration_url"):
                return f"You can register here: {data['registration_url']}"
            if data.get("contact_email"):
                return f"To register, please email {data['contact_email']}"
        return "Please contact us for registration information."
    
    elif template == "cost_info":
        if listing_type == "event":
            ticket_type = data.get("ticket_type", "")
            if ticket_type == "free":
                return "This event is free to attend."
            elif ticket_type == "paid" and data.get("ticket_price"):
                return f"Tickets are £{data['ticket_price']}."
            elif ticket_type == "donation":
                return "Entry is by donation."
        return "This is free to attend — all are welcome."
    
    elif template == "accessibility_info":
        facilities = data.get("facilities", {})
        access_features = []
        if facilities.get("wheelchair_accessible"):
            access_features.append("wheelchair accessible")
        if facilities.get("disabled_parking"):
            access_features.append("disabled parking available")
        if facilities.get("hearing_loop"):
            access_features.append("hearing loop installed")
        if access_features:
            return f"We are {', '.join(access_features)}."
        parking = data.get("parking", "")
        if parking:
            return f"Parking: {parking}"
        return "Please contact us for accessibility information."
    
    elif template == "contact_info":
        contact_parts = []
        if data.get("contact_email"):
            contact_parts.append(f"Email: {data['contact_email']}")
        if data.get("phone"):
            contact_parts.append(f"Phone: {data['phone']}")
        if contact_parts:
            return "You can reach us at: " + " | ".join(contact_parts)
        return "Please visit our website for contact information."
    
    elif template == "about_info":
        description = data.get("description", "")
        if description:
            summary = description[:200]
            if len(description) > 200:
                summary += "..."
            return f"{summary} [Read more about us]"
        return "Please contact us to learn more about our church."
    
    elif template == "events_info":
        return "upcoming_events_query"
    
    elif template == "small_groups_info":
        small_groups = data.get("small_groups", [])
        if small_groups:
            return f"We have {len(small_groups)} small groups meeting. Contact us to find one near you!"
        return "Please contact us for information about small groups and bible studies."
    
    elif template == "volunteer_info":
        volunteer_info = data.get("volunteer_info", "")
        if volunteer_info:
            return volunteer_info
        if listing_type == "event" and data.get("volunteer_roles"):
            return "We're looking for volunteers! Contact us to get involved."
        return "We'd love to have you serve with us! Please contact us for volunteer opportunities."
    
    else:
        answer = template
        if "{service_times}" in answer:
            service_times = data.get("service_times", "Please contact us for service times")
            answer = answer.replace("{service_times}", service_times)
        if "{address}" in answer:
            address_parts = []
            if data.get("address_line1"):
                address_parts.append(data["address_line1"])
            if data.get("city"):
                address_parts.append(data["city"])
            if data.get("postcode"):
                address_parts.append(data["postcode"])
            address = ", ".join(address_parts) if address_parts else "Please contact us for our address"
            answer = answer.replace("{address}", address)
        if "{parking_info}" in answer:
            parking = data.get("parking", "")
            answer = answer.replace("{parking_info}", parking if parking else "")
        if "{denomination}" in answer:
            denomination = data.get("denomination", "Christian")
            answer = answer.replace("{denomination}", denomination)
        return answer.strip()

async def check_rate_limit(db) -> bool:
    today = datetime.utcnow().date()
    rate_limit_doc = await db.chat_rate_limits.find_one({"date": today.isoformat()})
    if rate_limit_doc and rate_limit_doc.get("count", 0) >= 50:
        return False
    return True

async def increment_rate_limit(db):
    today = datetime.utcnow().date()
    await db.chat_rate_limits.update_one(
        {"date": today.isoformat()},
        {"$inc": {"count": 1}, "$set": {"updated_at": datetime.utcnow()}},
        upsert=True
    )

async def call_claude_fallback(question: str, listing_data: dict, listing_type: str, db) -> Optional[str]:
    if not await check_rate_limit(db):
        return None
    
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        return None
    
    try:
        client = Anthropic(api_key=anthropic_key)
        
        church_name = listing_data.get("name", "this church")
        context_data = {k: v for k, v in listing_data.items() if k not in ["_id", "created_at", "updated_at"]}
        
        system_prompt = f"You are a helpful assistant for {church_name}. Answer ONLY using this information: {context_data}. If you cannot answer from this data, say so and suggest contacting the church directly. Keep answers under 3 sentences."
        
        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=150,
            system=system_prompt,
            messages=[{"role": "user", "content": question}]
        )
        
        await increment_rate_limit(db)
        
        if message.content and len(message.content) > 0:
            return message.content[0].text
        return None
    except Exception as e:
        print(f"Claude API error: {e}")
        return None

@router.post("/{listing_type}/{slug}", response_model=ChatResponse)
async def chat_endpoint(listing_type: str, slug: str, chat_message: ChatMessage, db=Depends(get_database)):
    if listing_type not in ["church", "event", "pastor", "listing"]:
        raise HTTPException(status_code=400, detail="Invalid listing type")
    
    collection_name = f"{listing_type}s" if listing_type != "listing" else "listings"
    listing = await db[collection_name].find_one({"slug": slug})
    
    if not listing:
        raise HTTPException(status_code=404, detail=f"{listing_type.capitalize()} not found")
    
    question = chat_message.message
    question_hash = hash_question(question)
    
    cache_entry = await db.chat_faq_cache.find_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
    })
    
    if cache_entry:
        await db.chat_faq_cache.update_one(
            {"_id": cache_entry["_id"]},
            {"$inc": {"hit_count": 1}}
        )
        return ChatResponse(
            answer=cache_entry["answer"],
            source=cache_entry["source"],
            suggested_actions=get_suggested_actions(listing_type, listing),
            contact_prompt=cache_entry.get("contact_prompt", False),
            contact_email=cache_entry.get("contact_email"),
            contact_phone=cache_entry.get("contact_phone")
        )
    
    matched_group = match_pattern(question)
    
    if matched_group:
        answer = build_answer(matched_group["answer_template"], listing, listing_type)
        
        if answer == "upcoming_events_query" and listing_type == "church":
            church_id = str(listing["_id"])
            upcoming_events = await db.events.find({
                "church_id": church_id,
                "start_date": {"$gte": datetime.utcnow()}
            }).sort("start_date", 1).limit(3).to_list(length=3)
            
            if upcoming_events:
                event_list = []
                for event in upcoming_events:
                    event_date = event.get("start_date", "").strftime("%B %d") if isinstance(event.get("start_date"), datetime) else "TBA"
                    event_list.append(f"{event.get('name', 'Event')} on {event_date}")
                answer = f"Upcoming events: {', '.join(event_list)}. [View all events]"
            else:
                answer = "No upcoming events at the moment. Check back soon or contact us!"
        
        await db.chat_faq_cache.insert_one({
            "listing_type": listing_type,
            "slug": slug,
            "question_hash": question_hash,
            "question": question,
            "answer": answer,
            "source": "data",
            "created_at": datetime.utcnow(),
            "hit_count": 0
        })
        
        return ChatResponse(
            answer=answer,
            source="data",
            suggested_actions=get_suggested_actions(listing_type, listing)
        )
    
    claude_answer = await call_claude_fallback(question, listing, listing_type, db)
    
    if claude_answer:
        await db.chat_faq_cache.insert_one({
            "listing_type": listing_type,
            "slug": slug,
            "question_hash": question_hash,
            "question": question,
            "answer": claude_answer,
            "source": "ai",
            "created_at": datetime.utcnow(),
            "hit_count": 0
        })
        
        return ChatResponse(
            answer=claude_answer,
            source="ai",
            suggested_actions=get_suggested_actions(listing_type, listing)
        )
    
    contact_answer = "I don't have that specific information, but you can reach us directly!"
    contact_email = listing.get("contact_email")
    contact_phone = listing.get("phone")
    
    await db.chat_faq_cache.insert_one({
        "listing_type": listing_type,
        "slug": slug,
        "question_hash": question_hash,
        "question": question,
        "answer": contact_answer,
        "source": "contact",
        "contact_prompt": True,
        "contact_email": contact_email,
        "contact_phone": contact_phone,
        "created_at": datetime.utcnow(),
        "hit_count": 0
    })
    
    return ChatResponse(
        answer=contact_answer,
        source="contact",
        suggested_actions=get_suggested_actions(listing_type, listing),
        contact_prompt=True,
        contact_email=contact_email,
        contact_phone=contact_phone
    )