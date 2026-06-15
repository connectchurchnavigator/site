from fastapi import APIRouter, HTTPException, Depends, Body, Query
from fastapi.responses import StreamingResponse, Response
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import anthropic
import os
import secrets
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas
import qrcode
import base64
from ..database import db
from ..models import MinistryTrip, TripMessage, TripCollaborator, TripVisit, TripAnalysis, ChatMessage
from ..auth import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])
claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

TRAVEL_COSTS = {
    ("London", "Birmingham"): {"train": 65, "fuel": 35, "time_hours": 2.5},
    ("London", "Manchester"): {"train": 85, "fuel": 45, "time_hours": 3.0},
    ("Birmingham", "Manchester"): {"train": 45, "fuel": 25, "time_hours": 1.5},
    ("London", "Leeds"): {"train": 75, "fuel": 40, "time_hours": 2.8},
    ("London", "Bristol"): {"train": 55, "fuel": 30, "time_hours": 2.0},
}

@router.post("/trips")
async def create_trip(user=Depends(get_current_user)):
    trip = {
        "user_id": str(user["_id"]),
        "status": "planning",
        "trip_details": {},
        "conversation": [],
        "visits": [],
        "collaborators": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "share_token": secrets.token_urlsafe(16)
    }
    result = await db.ministry_trips.insert_one(trip)
    trip["_id"] = result.inserted_id
    return {"trip_id": str(result.inserted_id), "share_token": trip["share_token"]}

@router.post("/trips/{trip_id}/conversation")
async def add_message(trip_id: str, message: str = Body(..., embed=True), user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_msg = {"role": "user", "content": message, "timestamp": datetime.utcnow()}
    conversation = trip.get("conversation", [])
    conversation.append(user_msg)
    
    system_prompt = """You are an expert UK ministry trip planner. Guide the minister through planning their trip step by step.
Ask clear questions, make helpful suggestions, and be warm and encouraging.
When you have enough information (days, cities, focus, budget, church preferences), summarize the plan and say 'READY_TO_ANALYZE'."""
    
    claude_messages = [{"role": m["role"], "content": m["content"]} for m in conversation if m["role"] in ["user", "assistant"]]
    
    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=claude_messages
    )
    
    ai_response = response.content[0].text
    ai_msg = {"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow()}
    conversation.append(ai_msg)
    
    update_data = {"conversation": conversation, "updated_at": datetime.utcnow()}
    
    if "READY_TO_ANALYZE" in ai_response:
        trip_details = await extract_trip_details(conversation)
        update_data["trip_details"] = trip_details
        update_data["status"] = "ready_for_analysis"
    
    await db.ministry_trips.update_one({"_id": ObjectId(trip_id)}, {"$set": update_data})
    
    return {"response": ai_response, "status": update_data.get("status", "planning")}

async def extract_trip_details(conversation: List[Dict]) -> Dict:
    full_convo = "\n".join([f"{m['role']}: {m['content']}" for m in conversation])
    prompt = f"""Extract structured trip details from this conversation:
{full_convo}

Return JSON with: days, start_date (YYYY-MM-DD if mentioned), cities, ministry_focus, services_per_day, budget, congregation_preference.
If info not mentioned, use null."""
    
    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )
    
    import json
    try:
        return json.loads(response.content[0].text)
    except:
        return {"days": 7, "cities": ["London", "Birmingham"], "ministry_focus": "preaching"}

@router.post("/trips/{trip_id}/recommend-churches")
async def recommend_churches(trip_id: str, user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    details = trip.get("trip_details", {})
    cities = details.get("cities", [])
    size_pref = details.get("congregation_preference", "medium")
    
    size_filter = {}
    if size_pref == "small":
        size_filter = {"congregation_size": {"$lt": 100}}
    elif size_pref == "medium":
        size_filter = {"congregation_size": {"$gte": 100, "$lte": 500}}
    elif size_pref == "large":
        size_filter = {"congregation_size": {"$gt": 500}}
    
    query = {"city": {"$in": cities}} if cities else {}
    if size_filter:
        query.update(size_filter)
    
    churches = await db.churches.find(query).limit(20).to_list(20)
    
    recommendations = []
    for church in churches:
        recommendations.append({
            "church_id": str(church["_id"]),
            "name": church.get("name"),
            "city": church.get("city"),
            "congregation_size": church.get("congregation_size", 0),
            "denomination": church.get("denomination"),
            "pastor_name": church.get("pastor_name"),
            "contact_email": church.get("email"),
            "contact_phone": church.get("phone"),
            "impact_score": min(100, church.get("congregation_size", 50) // 5)
        })
    
    recommendations.sort(key=lambda x: x["impact_score"], reverse=True)
    return {"recommendations": recommendations[:10]}

@router.post("/trips/{trip_id}/visits")
async def add_visit(trip_id: str, visit: Dict = Body(...), user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    visit_obj = {
        "church_id": visit["church_id"],
        "church_name": visit["church_name"],
        "service_time": datetime.fromisoformat(visit["service_time"]),
        "service_type": visit.get("service_type", "Sunday Service"),
        "confirmed": False,
        "status": "pending",
        "estimated_attendance": visit.get("estimated_attendance", 100),
        "estimated_honorarium": visit.get("estimated_honorarium", 100),
        "contact_email": visit.get("contact_email"),
        "contact_phone": visit.get("contact_phone")
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"visits": visit_obj}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    return {"success": True}

@router.post("/trips/{trip_id}/full-analysis")
async def full_analysis(trip_id: str, user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    visits = trip.get("visits", [])
    details = trip.get("trip_details", {})
    
    cost_analysis = calculate_cost_analysis(visits, details)
    time_analysis = calculate_time_analysis(visits, details)
    impact_analysis = calculate_impact_analysis(visits)
    risk_analysis = calculate_risk_analysis(visits, cost_analysis)
    
    recommendations = await generate_recommendations(trip_id, visits, cost_analysis, time_analysis, impact_analysis, risk_analysis)
    
    overall_score = int(
        (cost_analysis["cost_efficiency"] * 0.25) +
        (time_analysis["efficiency_score"] * 0.20) +
        (impact_analysis["impact_score"] * 0.30) +
        ((100 - risk_analysis["risk_score"]) * 0.15) +
        (90 * 0.10)
    )
    
    analysis = {
        "cost_analysis": cost_analysis,
        "time_analysis": time_analysis,
        "impact_analysis": impact_analysis,
        "risk_analysis": risk_analysis,
        "recommendations": recommendations,
        "overall_score": overall_score,
        "generated_at": datetime.utcnow()
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"analysis": analysis, "updated_at": datetime.utcnow()}}
    )
    
    return analysis

def calculate_cost_analysis(visits: List[Dict], details: Dict) -> Dict:
    total_travel = 0
    cities = []
    for v in visits:
        city = v.get("church_name", "").split(",")[-1].strip() if "," in v.get("church_name", "") else "London"
        cities.append(city)
    
    for i in range(len(cities) - 1):
        route = (cities[i], cities[i+1])
        if route in TRAVEL_COSTS:
            total_travel += TRAVEL_COSTS[route]["train"]
        else:
            total_travel += 50
    
    nights = details.get("days", 7) - 1
    accommodation_total = nights * 55
    host_offers = sum(1 for v in visits if v.get("accommodation_offered"))
    accommodation_saving = host_offers * 55
    
    food_total = details.get("days", 7) * 25
    meal_offers = sum(1 for v in visits if v.get("meal_offered"))
    food_saving = meal_offers * 20
    
    expected_income = sum(v.get("estimated_honorarium", 100) for v in visits)
    total_costs = total_travel + accommodation_total + food_total - accommodation_saving - food_saving
    net = expected_income - total_costs
    
    cost_efficiency = min(100, int((net / max(total_costs, 1)) * 100 + 50)) if total_costs > 0 else 85
    
    return {
        "travel": {"total": total_travel, "per_visit": total_travel / max(len(visits), 1)},
        "accommodation": {"nights": nights, "total": accommodation_total, "saving": accommodation_saving},
        "food": {"total": food_total, "saving": food_saving},
        "expected_income": expected_income,
        "total_costs": total_costs,
        "net": net,
        "verdict": "PROFITABLE" if net > 0 else "REQUIRES FUNDING",
        "cost_efficiency": cost_efficiency
    }

def calculate_time_analysis(visits: List[Dict], details: Dict) -> Dict:
    total_ministry_hours = len(visits) * 2
    total_travel_hours = len(visits) * 1.5
    total_days = details.get("days", 7)
    
    daily_schedule = {}
    for v in visits:
        day = v["service_time"].strftime("%Y-%m-%d")
        if day not in daily_schedule:
            daily_schedule[day] = []
        daily_schedule[day].append(v)
    
    busiest_day = max(daily_schedule.items(), key=lambda x: len(x[1])) if daily_schedule else ("N/A", [])
    
    efficiency_score = min(100, int((total_ministry_hours / max(total_travel_hours, 1)) * 40))
    
    return {
        "total_ministry_hours": total_ministry_hours,
        "total_travel_hours": total_travel_hours,
        "ratio": round(total_ministry_hours / max(total_travel_hours, 1), 2),
        "busiest_day": f"{busiest_day[0]} ({len(busiest_day[1])} visits)",
        "efficiency_score": efficiency_score,
        "daily_schedule": {k: len(v) for k, v in daily_schedule.items()}
    }

def calculate_impact_analysis(visits: List[Dict]) -> Dict:
    total_reach = sum(v.get("estimated_attendance", 100) for v in visits)
    avg_attendance = total_reach / max(len(visits), 1)
    impact_score = min(100, int((total_reach / 50) + (len(visits) * 5)))
    
    sorted_visits = sorted(visits, key=lambda x: x.get("estimated_attendance", 0), reverse=True)
    highest = sorted_visits[0] if sorted_visits else {"church_name": "N/A", "estimated_attendance": 0}
    lowest = sorted_visits[-1] if sorted_visits else {"church_name": "N/A", "estimated_attendance": 0}
    
    return {
        "total_reach": total_reach,
        "average_attendance": int(avg_attendance),
        "impact_score": impact_score,
        "highest_impact": f"{highest.get('church_name')} ({highest.get('estimated_attendance')} people)",
        "lowest_impact": f"{lowest.get('church_name')} ({lowest.get('estimated_attendance')} people)"
    }

def calculate_risk_analysis(visits: List[Dict], cost_analysis: Dict) -> Dict:
    risks = []
    unconfirmed = sum(1 for v in visits if not v.get("confirmed"))
    if unconfirmed > 0:
        risks.append({
            "risk": f"{unconfirmed} visits not yet confirmed",
            "severity": "medium",
            "mitigation": "Send reminder emails to churches"
        })
    
    if cost_analysis["accommodation"]["saving"] == 0:
        risks.append({
            "risk": "No accommodation arranged",
            "severity": "high",
            "mitigation": "Contact churches to request hosting"
        })
    
    if cost_analysis["net"] < 0:
        risks.append({
            "risk": f"Trip has net cost of GBP {abs(cost_analysis['net'])}",
            "severity": "medium",
            "mitigation": "Seek additional honorarium or reduce travel costs"
        })
    
    risk_score = len(risks) * 15
    return {
        "risks": risks,
        "risk_score": min(100, risk_score),
        "level": "HIGH" if risk_score > 60 else "MEDIUM" if risk_score > 30 else "LOW"
    }

async def generate_recommendations(trip_id: str, visits: List[Dict], cost: Dict, time: Dict, impact: Dict, risk: Dict) -> List[str]:
    prompt = f"""Generate 5 specific actionable recommendations for this ministry trip:
Visits: {len(visits)}
Total reach: {impact['total_reach']}
Net income: GBP {cost['net']}
Unconfirmed visits: {sum(1 for v in visits if not v.get('confirmed'))}
Risks: {len(risk['risks'])}

Provide practical, specific suggestions to improve cost, time efficiency, impact or reduce risk."""
    
    response = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}]
    )
    
    text = response.content[0].text
    lines = [line.strip() for line in text.split("\n") if line.strip() and any(c.isalpha() for c in line)]
    return lines[:5]

@router.get("/trips/{trip_id}/export/pdf")
async def export_pdf(trip_id: str, user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()
    story = []
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#7c3aed'), alignment=TA_CENTER)
    story.append(Paragraph("Ministry Trip Itinerary", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    user_doc = await db.users.find_one({"_id": ObjectId(trip["user_id"])})
    minister_name = user_doc.get("name", "Minister") if user_doc else "Minister"
    story.append(Paragraph(f"<b>Minister:</b> {minister_name}", styles['Normal']))
    
    start = trip.get("start_date")
    end = trip.get("end_date")
    if start:
        story.append(Paragraph(f"<b>Dates:</b> {start.strftime('%d %B %Y')} - {end.strftime('%d %B %Y') if end else 'TBD'}", styles['Normal']))
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Trip Overview</b>", styles['Heading2']))
    
    visits = trip.get("visits", [])
    total_reach = sum(v.get("estimated_attendance", 0) for v in visits)
    
    overview_data = [
        ["Total Visits", str(len(visits))],
        ["Total Reach", str(total_reach)],
        ["Cities", ", ".join(set(v.get("church_name", "").split(",")[-1].strip() for v in visits))[:50]]
    ]
    overview_table = Table(overview_data, colWidths=[2*inch, 4*inch])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3e8ff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    story.append(overview_table)
    
    if trip.get("analysis"):
        cost = trip["analysis"].get("cost_analysis", {})
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("<b>Cost Summary</b>", styles['Heading2']))
        cost_data = [
            ["Expected Income", f"GBP {cost.get('expected_income', 0):.2f}"],
            ["Total Costs", f"GBP {cost.get('total_costs', 0):.2f}"],
            ["Net Position", f"GBP {cost.get('net', 0):.2f}"]
        ]
        cost_table = Table(cost_data, colWidths=[2*inch, 4*inch])
        cost_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3e8ff')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold')
        ]))
        story.append(cost_table)
    
    story.append(PageBreak())
    story.append(Paragraph("<b>Visit Schedule</b>", styles['Heading2']))
    
    for idx, visit in enumerate(sorted(visits, key=lambda x: x.get("service_time", datetime.utcnow())), 1):
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph(f"<b>Visit {idx}: {visit.get('church_name', 'Church')}</b>", styles['Heading3']))
        
        service_time = visit.get("service_time")
        if service_time:
            story.append(Paragraph(f"Date/Time: {service_time.strftime('%A, %d %B %Y at %I:%M %p')}", styles['Normal']))
        
        if visit.get("contact_name"):
            story.append(Paragraph(f"Contact: {visit['contact_name']}", styles['Normal']))
        if visit.get("contact_phone"):
            story.append(Paragraph(f"Phone: {visit['contact_phone']}", styles['Normal']))
        
        story.append(Paragraph(f"Expected Attendance: {visit.get('estimated_attendance', 'TBD')}", styles['Normal']))
        
        if visit.get("notes"):
            story.append(Paragraph(f"Notes: {visit['notes']}", styles['Normal']))
    
    story.append(PageBreak())
    story.append(Paragraph("<b>Contact Directory</b>", styles['Heading2']))
    contact_data = [["Church", "Contact", "Phone", "Email"]]
    for visit in visits:
        contact_data.append([
            visit.get("church_name", "")[:30],
            visit.get("contact_name", "TBD")[:20],
            visit.get("contact_phone", "TBD")[:15],
            visit.get("contact_email", "TBD")[:25]
        ])
    
    contact_table = Table(contact_data, colWidths=[1.5*inch, 1.3*inch, 1.2*inch, 2*inch])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    story.append(contact_table)
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Prepared by ChurchNavigator Planner", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"pdf_generated_at": datetime.utcnow()}}
    )
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=trip_{trip_id}.pdf"
    })

@router.post("/trips/{trip_id}/share")
async def share_trip(trip_id: str, email: str = Body(...), role: str = Body(...), message: str = Body(None), user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    invite_token = secrets.token_urlsafe(16)
    collaborator = {
        "email": email,
        "role": role,
        "invited_at": datetime.utcnow(),
        "invite_token": invite_token
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"collaborators": collaborator}}
    )
    
    invite_link = f"https://churchnavigator.com/planner/join/{trip_id}/{invite_token}"
    
    return {"success": True, "invite_link": invite_link}

@router.get("/trips/{trip_id}/chat")
async def get_chat(trip_id: str, limit: int = Query(50), user=Depends(get_current_user)):
    messages = await db.trip_messages.find({"trip_id": trip_id}).sort("sent_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return {"messages": [{**m, "_id": str(m["_id"])} for m in messages]}

@router.post("/trips/{trip_id}/chat")
async def send_chat_message(trip_id: str, message: str = Body(..., embed=True), user=Depends(get_current_user)):
    msg = {
        "trip_id": trip_id,
        "sender_id": str(user["_id"]),
        "sender_name": user.get("name", "User"),
        "sender_role": "owner",
        "message": message,
        "sent_at": datetime.utcnow(),
        "read_by": [str(user["_id"])]
    }
    result = await db.trip_messages.insert_one(msg)
    msg["_id"] = str(result.inserted_id)
    return msg

@router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user=Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip["_id"] = str(trip["_id"])
    return trip

@router.get("/trips")
async def list_trips(user=Depends(get_current_user)):
    trips = await db.ministry_trips.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
    for trip in trips:
        trip["_id"] = str(trip["_id"])
    return {"trips": trips}