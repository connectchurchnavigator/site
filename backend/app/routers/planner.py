from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from bson import ObjectId
import anthropic
import os
import secrets
import base64
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import qrcode
import math

router = APIRouter(prefix="/api/planner", tags=["planner"])

from ..database import db
from ..auth import get_current_user
from ..email_service import send_email

class TripMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class TripBasics(BaseModel):
    duration_days: Optional[int] = None
    arrival_date: Optional[str] = None
    regions: Optional[List[str]] = None
    ministry_focus: Optional[List[str]] = None
    services_per_day: Optional[int] = None
    budget_gbp: Optional[float] = None
    congregation_size: Optional[str] = None
    specific_churches: Optional[List[str]] = None

class ShareRequest(BaseModel):
    email: str
    role: str
    message: Optional[str] = None

class ChatMessage(BaseModel):
    message: str

class StatusUpdate(BaseModel):
    visit_id: str
    status: str

@router.post("/new")
async def create_trip(user: dict = Depends(get_current_user)):
    trip = {
        "user_id": user["user_id"],
        "status": "planning",
        "conversation": [],
        "basics": {},
        "visits": [],
        "analysis": None,
        "collaborators": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.ministry_trips.insert_one(trip)
    return {"trip_id": str(result.inserted_id)}

@router.post("/{trip_id}/conversation")
async def add_conversation(trip_id: str, msg: TripMessage, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    msg_data = {"role": msg.role, "content": msg.content, "timestamp": datetime.utcnow()}
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"conversation": msg_data}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    conversation = trip.get("conversation", []) + [msg_data]
    
    if msg.role == "user":
        ai_response = await generate_ai_response(conversation, trip.get("basics", {}))
        ai_msg = {"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow()}
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$push": {"conversation": ai_msg}}
        )
        return {"response": ai_response, "complete": check_if_complete(conversation)}
    
    return {"response": None, "complete": False}

async def generate_ai_response(conversation: List[Dict], basics: Dict) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    system_prompt = """You are an AI trip planning assistant for ChurchNavigator.
Guide ministers through planning UK ministry trips step-by-step.
Ask ONE question at a time in a warm, helpful tone.

Sequence:
1. Trip duration and arrival date
2. Cities/regions to visit
3. Ministry focus (preaching/healing/youth/training/evangelism)
4. Services per day preference (recommend max 2)
5. Travel budget
6. Congregation size preference
7. Specific churches or AI recommendation

After all answers, say: "Perfect! I have everything I need. Analyzing 29,000+ UK churches to find your best matches..."""
    
    messages = [{"role": m["role"], "content": m["content"]} for m in conversation]
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=system_prompt,
        messages=messages
    )
    
    return response.content[0].text

def check_if_complete(conversation: List[Dict]) -> bool:
    questions_asked = sum(1 for m in conversation if m["role"] == "assistant")
    return questions_asked >= 7

@router.post("/{trip_id}/basics")
async def save_basics(trip_id: str, basics: TripBasics, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"basics": basics.dict(exclude_unset=True), "updated_at": datetime.utcnow()}}
    )
    
    recommendations = await generate_church_recommendations(basics)
    
    return {"success": True, "recommendations": recommendations}

async def generate_church_recommendations(basics: TripBasics) -> List[Dict]:
    query = {"status": "active"}
    if basics.regions:
        query["$or"] = [{"city": {"$in": basics.regions}}, {"county": {"$in": basics.regions}}]
    
    churches = await db.churches.find(query).limit(50).to_list(50)
    
    scored = []
    for church in churches:
        score = 50
        if basics.ministry_focus:
            if any(f.lower() in church.get("description", "").lower() for f in basics.ministry_focus):
                score += 20
        
        size = church.get("congregation_size", 100)
        if basics.congregation_size == "Small" and size < 100:
            score += 15
        elif basics.congregation_size == "Medium" and 100 <= size <= 500:
            score += 15
        elif basics.congregation_size == "Large" and size > 500:
            score += 15
        
        if church.get("verified"):
            score += 10
        if church.get("images"):
            score += 5
        
        scored.append({
            "church_id": str(church["_id"]),
            "name": church["name"],
            "city": church["city"],
            "congregation_size": size,
            "score": score,
            "address": church.get("address", ""),
            "pastor": church.get("leader_name", "")
        })
    
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:15]

@router.post("/{trip_id}/full-analysis")
async def analyze_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    visits = trip.get("visits", [])
    if not visits:
        raise HTTPException(status_code=400, detail="No visits added yet")
    
    cost_analysis = calculate_cost_analysis(visits, trip.get("basics", {}))
    time_analysis = calculate_time_analysis(visits, trip.get("basics", {}))
    impact_analysis = calculate_impact_analysis(visits)
    risk_analysis = calculate_risk_analysis(visits, trip)
    recommendations = await generate_recommendations(visits, trip, cost_analysis, time_analysis, impact_analysis, risk_analysis)
    
    overall_score = (
        cost_analysis["score"] * 0.25 +
        time_analysis["score"] * 0.20 +
        impact_analysis["score"] * 0.25 +
        (100 - risk_analysis["risk_score"]) * 0.15 +
        85 * 0.15
    )
    
    analysis = {
        "cost": cost_analysis,
        "time": time_analysis,
        "impact": impact_analysis,
        "risk": risk_analysis,
        "recommendations": recommendations,
        "overall_score": round(overall_score, 1),
        "generated_at": datetime.utcnow()
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"analysis": analysis, "updated_at": datetime.utcnow()}}
    )
    
    return analysis

def calculate_cost_analysis(visits: List[Dict], basics: Dict) -> Dict:
    travel_costs = {"London-Birmingham": 65, "London-Manchester": 85, "Birmingham-Manchester": 45, "base": 35}
    total_travel = sum(travel_costs.get(f"{v.get('city', 'base')}-{visits[i+1].get('city', 'base')}", 35) for i, v in enumerate(visits[:-1]))
    total_travel += travel_costs["base"] * 2
    
    nights = basics.get("duration_days", 7) - 1
    host_offers = sum(1 for v in visits if v.get("accommodation_offered"))
    hotel_nights = max(0, nights - host_offers)
    hotel_cost = hotel_nights * 55
    potential_saving = host_offers * 55
    
    meal_cost = basics.get("duration_days", 7) * 25
    meals_offered = sum(1 for v in visits if v.get("meals_offered"))
    meal_saving = meals_offered * 15
    
    honorarium = sum(v.get("congregation_size", 100) * 0.5 for v in visits)
    honorarium = min(honorarium, len(visits) * 200)
    
    total_costs = total_travel + hotel_cost + meal_cost
    net = honorarium - total_costs
    
    score = min(100, max(0, 50 + (net / 10)))
    
    return {
        "travel": {"total": round(total_travel, 2), "per_visit": round(total_travel / len(visits), 2)},
        "accommodation": {"nights": nights, "cost": hotel_cost, "host_offers": host_offers, "saving": potential_saving},
        "food": {"total": meal_cost, "saving": meal_saving},
        "honorarium": {"total": round(honorarium, 2)},
        "net": {"costs": round(total_costs, 2), "income": round(honorarium, 2), "net": round(net, 2)},
        "score": round(score, 1)
    }

def calculate_time_analysis(visits: List[Dict], basics: Dict) -> Dict:
    travel_times = {"London-Birmingham": 2.0, "London-Manchester": 3.0, "Birmingham-Manchester": 1.5, "base": 1.0}
    total_travel_hours = sum(travel_times.get(f"{v.get('city', 'base')}-{visits[i+1].get('city', 'base')}", 1.0) for i, v in enumerate(visits[:-1]))
    total_ministry_hours = len(visits) * 2.5
    ratio = total_ministry_hours / max(total_travel_hours, 1)
    
    score = min(100, ratio * 40)
    
    return {
        "travel_hours": round(total_travel_hours, 1),
        "ministry_hours": round(total_ministry_hours, 1),
        "ratio": round(ratio, 2),
        "score": round(score, 1)
    }

def calculate_impact_analysis(visits: List[Dict]) -> Dict:
    total_reach = sum(v.get("congregation_size", 100) for v in visits)
    avg_size = total_reach / len(visits) if visits else 0
    score = min(100, (total_reach / 100) + (avg_size / 10))
    
    return {
        "total_reach": total_reach,
        "average_size": round(avg_size, 1),
        "score": round(score, 1)
    }

def calculate_risk_analysis(visits: List[Dict], trip: Dict) -> Dict:
    risks = []
    risk_score = 0
    
    unconfirmed = sum(1 for v in visits if not v.get("confirmed"))
    if unconfirmed > 0:
        risks.append({"risk": f"{unconfirmed} visits not confirmed", "severity": "medium", "mitigation": "Send reminder emails"})
        risk_score += unconfirmed * 10
    
    if not trip.get("basics", {}).get("budget_gbp"):
        risks.append({"risk": "No budget set", "severity": "low", "mitigation": "Estimate costs first"})
        risk_score += 5
    
    return {"risks": risks, "risk_score": min(risk_score, 100), "level": "LOW" if risk_score < 30 else "MEDIUM" if risk_score < 60 else "HIGH"}

async def generate_recommendations(visits, trip, cost, time, impact, risk) -> List[str]:
    recs = []
    
    if cost["accommodation"]["host_offers"] > 0:
        recs.append(f"Accept accommodation from {cost['accommodation']['host_offers']} churches to save GBP {cost['accommodation']['saving']}")
    
    if time["ratio"] < 1.5:
        recs.append("Consider reducing travel time by grouping visits by region")
    
    unconfirmed = [v for v in visits if not v.get("confirmed")]
    if unconfirmed:
        recs.append(f"Confirm {len(unconfirmed)} pending visits within 48 hours")
    
    if cost["net"]["net"] < 0:
        recs.append("Trip is currently loss-making. Consider reducing hotel nights or adding one more visit.")
    
    small_churches = [v for v in visits if v.get("congregation_size", 0) < 50]
    if small_churches:
        recs.append(f"Consider replacing smallest church ({small_churches[0].get('name')}) with larger congregation for better impact")
    
    return recs[:5]

@router.get("/{trip_id}/export/pdf")
async def export_pdf(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#7c3aed'), alignment=TA_CENTER, spaceAfter=30)
    story.append(Paragraph("Ministry Trip Itinerary", title_style))
    story.append(Paragraph(f"Prepared for: {user.get('name', 'Minister')}", styles['Normal']))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%d %B %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    basics = trip.get("basics", {})
    overview_data = [
        ["Duration", f"{basics.get('duration_days', 'N/A')} days"],
        ["Regions", ", ".join(basics.get('regions', []))],
        ["Total Visits", str(len(trip.get('visits', [])))],
        ["Ministry Focus", ", ".join(basics.get('ministry_focus', []))]
    ]
    overview_table = Table(overview_data, colWidths=[2*inch, 4*inch])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold')
    ]))
    story.append(overview_table)
    story.append(PageBreak())
    
    story.append(Paragraph("Daily Schedule", styles['Heading2']))
    for idx, visit in enumerate(trip.get('visits', []), 1):
        story.append(Paragraph(f"Visit {idx}: {visit.get('church_name', 'Church')}", styles['Heading3']))
        visit_data = [
            ["Church", visit.get('church_name', 'N/A')],
            ["Address", visit.get('address', 'N/A')],
            ["Date/Time", visit.get('date', 'N/A')],
            ["Pastor", visit.get('pastor', 'N/A')],
            ["Congregation", str(visit.get('congregation_size', 'N/A'))]
        ]
        visit_table = Table(visit_data, colWidths=[1.5*inch, 4.5*inch])
        visit_table.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 1, colors.grey)]))
        story.append(visit_table)
        story.append(Spacer(1, 0.2*inch))
    
    story.append(PageBreak())
    story.append(Paragraph("Contact Directory", styles['Heading2']))
    contact_data = [["Church", "Pastor", "Phone", "Email"]]
    for visit in trip.get('visits', []):
        contact_data.append([visit.get('church_name', ''), visit.get('pastor', ''), visit.get('phone', ''), visit.get('email', '')])
    contact_table = Table(contact_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 2*inch])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    story.append(contact_table)
    
    doc.build(story)
    buffer.seek(0)
    
    return Response(content=buffer.read(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=trip_{trip_id}.pdf"})

@router.post("/{trip_id}/share")
async def share_trip(trip_id: str, share_req: ShareRequest, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["user_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    invite_token = secrets.token_urlsafe(32)
    collaborator = {
        "email": share_req.email,
        "role": share_req.role,
        "invite_token": invite_token,
        "invited_at": datetime.utcnow(),
        "accepted_at": None,
        "last_viewed_at": None
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"collaborators": collaborator}}
    )
    
    invite_link = f"https://churchnavigator.com/planner/join/{trip_id}/{invite_token}"
    await send_email(
        to_email=share_req.email,
        subject="You've been invited to collaborate on a ministry trip",
        body=f"""You have been invited to collaborate on a ministry trip.

Role: {share_req.role}
Message: {share_req.message or 'No message'}

Click here to join: {invite_link}

ChurchNavigator Team"""
    )
    
    return {"success": True, "invite_link": invite_link}

@router.get("/{trip_id}/board")
async def get_board(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    is_collaborator = trip["user_id"] == user["user_id"] or any(c["email"] == user.get("email") for c in trip.get("collaborators", []))
    if not is_collaborator:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.trip_messages.find({"trip_id": trip_id}).sort("sent_at", -1).limit(50).to_list(50)
    
    return {
        "trip": {
            "_id": str(trip["_id"]),
            "status": trip["status"],
            "visits": trip.get("visits", []),
            "basics": trip.get("basics", {}),
            "analysis": trip.get("analysis"),
            "collaborators": trip.get("collaborators", [])
        },
        "messages": [{**m, "_id": str(m["_id"])} for m in messages]
    }

@router.post("/{trip_id}/chat")
async def send_chat(trip_id: str, chat_msg: ChatMessage, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    message = {
        "trip_id": trip_id,
        "sender_id": user["user_id"],
        "sender_name": user.get("name", "User"),
        "sender_role": "owner" if trip["user_id"] == user["user_id"] else "collaborator",
        "message": chat_msg.message,
        "sent_at": datetime.utcnow(),
        "read_by": []
    }
    
    await db.trip_messages.insert_one(message)
    return {"success": True, "message_id": str(message["_id"])}

@router.post("/{trip_id}/status")
async def update_status(trip_id: str, status_update: StatusUpdate, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id), "visits.id": status_update.visit_id},
        {"$set": {"visits.$.status": status_update.status, "visits.$.status_updated_at": datetime.utcnow()}}
    )
    
    activity = {
        "trip_id": trip_id,
        "user_id": user["user_id"],
        "action": f"Updated visit status to {status_update.status}",
        "timestamp": datetime.utcnow()
    }
    await db.trip_activities.insert_one(activity)
    
    return {"success": True}

@router.get("/{trip_id}/checklist")
async def get_checklist(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    visits = trip.get("visits", [])
    unconfirmed = sum(1 for v in visits if not v.get("confirmed"))
    
    checklist = {
        "pre_trip": [
            {"task": f"Confirm {unconfirmed} remaining visits", "completed": unconfirmed == 0},
            {"task": "Book advance train tickets", "completed": False},
            {"task": "Prepare sermon materials", "completed": False},
            {"task": "Share itinerary with team", "completed": len(trip.get("collaborators", [])) > 0}
        ],
        "during_trip": [
            {"task": "Send thank you after each visit", "completed": False},
            {"task": "Collect contact details", "completed": False}
        ],
        "post_trip": [
            {"task": "Send follow-up emails", "completed": False},
            {"task": "Write trip report", "completed": False}
        ]
    }
    
    return checklist