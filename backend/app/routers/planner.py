from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import anthropic
import os
from io import BytesIO
import base64
import math
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import qrcode

from ..database import db
from ..auth import get_current_user
from ..email_service import send_email

router = APIRouter(prefix="/api/planner", tags=["planner"])

class TripMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TripBasics(BaseModel):
    duration_days: Optional[int] = None
    arrival_date: Optional[str] = None
    cities: Optional[List[str]] = None
    ministry_focus: Optional[List[str]] = None
    services_per_day: Optional[int] = None
    travel_budget: Optional[float] = None
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

TRAVEL_COSTS = {
    ("London", "Birmingham"): {"train": 65, "fuel": 35, "distance_miles": 120},
    ("London", "Manchester"): {"train": 85, "fuel": 45, "distance_miles": 200},
    ("Birmingham", "Manchester"): {"train": 45, "fuel": 25, "distance_miles": 90},
    ("London", "Leeds"): {"train": 75, "fuel": 40, "distance_miles": 195},
    ("Manchester", "Leeds"): {"train": 25, "fuel": 15, "distance_miles": 45},
    ("Birmingham", "Leeds"): {"train": 55, "fuel": 30, "distance_miles": 110},
    ("London", "Bristol"): {"train": 55, "fuel": 30, "distance_miles": 120},
}

DEFAULT_TRAVEL = {"train": 30, "fuel": 20, "distance_miles": 50}

def get_travel_cost(city1: str, city2: str) -> Dict[str, Any]:
    key = (city1, city2)
    reverse_key = (city2, city1)
    return TRAVEL_COSTS.get(key, TRAVEL_COSTS.get(reverse_key, DEFAULT_TRAVEL))

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3959
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

async def call_claude(messages: List[Dict[str, str]]) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system="You are a helpful AI assistant for ChurchNavigator, helping ministers plan UK ministry trips. Be warm, concise, and practical.",
        messages=messages
    )
    return response.content[0].text

@router.post("/new")
async def create_trip(user: dict = Depends(get_current_user)):
    trip = {
        "user_id": user["_id"],
        "user_email": user["email"],
        "user_name": user.get("name", "Minister"),
        "created_at": datetime.utcnow(),
        "status": "planning",
        "conversation": [],
        "basics": {},
        "visits": [],
        "collaborators": [],
        "analysis": None,
        "pdf_base64": None
    }
    result = await db.ministry_trips.insert_one(trip)
    
    initial_message = {
        "role": "assistant",
        "content": "Welcome! Let us plan your UK ministry trip together. First -- how many days are you visiting for? (e.g. '7 days, arriving 20th June')",
        "timestamp": datetime.utcnow()
    }
    
    await db.ministry_trips.update_one(
        {"_id": result.inserted_id},
        {"$push": {"conversation": initial_message}}
    )
    
    return {
        "trip_id": str(result.inserted_id),
        "message": initial_message
    }

@router.post("/{trip_id}/message")
async def add_message(trip_id: str, message: TripMessage, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    user_msg = {
        "role": "user",
        "content": message.content,
        "timestamp": datetime.utcnow()
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"conversation": user_msg}}
    )
    
    conversation = trip.get("conversation", [])
    conversation.append(user_msg)
    
    step = len([m for m in conversation if m["role"] == "user"])
    
    if step == 1:
        basics = trip.get("basics", {})
        content_lower = message.content.lower()
        if "day" in content_lower:
            try:
                basics["duration_days"] = int(''.join(filter(str.isdigit, message.content.split("day")[0])))
            except:
                pass
        if any(month in content_lower for month in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]):
            basics["arrival_date"] = message.content
        
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        
        ai_response = "Perfect. Which cities or regions do you want to cover? (e.g. London, Birmingham, Manchester -- or I can suggest based on where your denomination has the most churches)"
    
    elif step == 2:
        basics = trip.get("basics", {})
        cities = [city.strip() for city in message.content.replace(" and ", ",").split(",")]
        basics["cities"] = cities
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        ai_response = "Got it. What is your primary ministry focus for this trip? (Preaching / Healing & Deliverance / Youth Ministry / Leadership Training / Evangelism / All of the above)"
    
    elif step == 3:
        basics = trip.get("basics", {})
        basics["ministry_focus"] = [f.strip() for f in message.content.split(",") if f.strip()]
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        ai_response = "How many services per day are you comfortable with? (We recommend max 2 for sustainability)"
    
    elif step == 4:
        basics = trip.get("basics", {})
        try:
            basics["services_per_day"] = int(''.join(filter(str.isdigit, message.content)))
        except:
            basics["services_per_day"] = 2
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        ai_response = "Do you have a travel budget for this trip? This helps me recommend cost-effective routing. (e.g. 'GBP 500')"
    
    elif step == 5:
        basics = trip.get("basics", {})
        try:
            basics["travel_budget"] = float(''.join(filter(lambda x: x.isdigit() or x == '.', message.content)))
        except:
            basics["travel_budget"] = 500
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        ai_response = "What size congregations do you prefer? (Small under 100 / Medium 100-500 / Large 500+ / Mixed)"
    
    elif step == 6:
        basics = trip.get("basics", {})
        basics["congregation_size"] = message.content
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics}}
        )
        ai_response = "Finally -- do you have any specific churches already in mind, or shall I recommend the best matches from our network of 29,000+ UK churches?"
    
    else:
        basics = trip.get("basics", {})
        if "recommend" in message.content.lower():
            basics["specific_churches"] = []
        else:
            basics["specific_churches"] = [c.strip() for c in message.content.split(",")]
        
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"basics": basics, "status": "generating"}}
        )
        
        cities = basics.get("cities", ["London"])
        duration = basics.get("duration_days", 7)
        services_per_day = basics.get("services_per_day", 2)
        size_pref = basics.get("congregation_size", "Medium")
        
        size_filter = {}
        if "small" in size_pref.lower():
            size_filter = {"attendance": {"$lt": 100}}
        elif "medium" in size_pref.lower():
            size_filter = {"attendance": {"$gte": 100, "$lte": 500}}
        elif "large" in size_pref.lower():
            size_filter = {"attendance": {"$gt": 500}}
        
        city_filter = {"$or": [{"city": {"$regex": city, "$options": "i"}} for city in cities]}
        
        churches_cursor = db.churches.find(
            {**city_filter, **size_filter, "verified": True}
        ).limit(duration * services_per_day * 2)
        
        churches = await churches_cursor.to_list(length=100)
        
        visits = []
        for i, church in enumerate(churches[:duration * services_per_day]):
            day = i // services_per_day
            slot = i % services_per_day
            time = "10:00" if slot == 0 else "18:30"
            
            visits.append({
                "church_id": str(church["_id"]),
                "church_name": church.get("name", "Church"),
                "church_city": church.get("city", ""),
                "church_address": church.get("address", ""),
                "church_pastor": church.get("pastor_name", ""),
                "church_phone": church.get("phone", ""),
                "church_email": church.get("email", ""),
                "attendance": church.get("attendance", 100),
                "lat": church.get("location", {}).get("coordinates", [0, 0])[1],
                "lng": church.get("location", {}).get("coordinates", [0, 0])[0],
                "day": day,
                "date": (datetime.utcnow() + timedelta(days=day)).strftime("%Y-%m-%d"),
                "time": time,
                "status": "pending",
                "confirmed": False,
                "accommodation_offered": i % 3 == 0,
                "meal_offered": i % 2 == 0
            })
        
        await db.ministry_trips.update_one(
            {"_id": ObjectId(trip_id)},
            {"$set": {"visits": visits, "status": "planned"}}
        )
        
        ai_response = f"Excellent! I have planned a {duration}-day trip with {len(visits)} visits across {', '.join(cities)}. Your trip is ready for analysis. Click 'Analyze Trip' to see the complete cost, time, and impact breakdown."
    
    ai_msg = {
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.utcnow()
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"conversation": ai_msg}}
    )
    
    return {"message": ai_msg, "step": step}

@router.post("/{trip_id}/full-analysis")
async def analyze_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    visits = trip.get("visits", [])
    if not visits:
        raise HTTPException(status_code=400, detail="No visits planned")
    
    basics = trip.get("basics", {})
    budget = basics.get("travel_budget", 500)
    
    total_train = 0
    total_fuel = 0
    total_distance = 0
    
    for i in range(len(visits) - 1):
        city1 = visits[i]["church_city"]
        city2 = visits[i+1]["church_city"]
        costs = get_travel_cost(city1, city2)
        total_train += costs["train"]
        total_fuel += costs["fuel"]
        total_distance += costs["distance_miles"]
    
    parking = len(set(v["church_city"] for v in visits)) * 15
    
    nights = max(v["day"] for v in visits)
    accommodation_offers = sum(1 for v in visits if v.get("accommodation_offered"))
    hotel_nights = max(0, nights - accommodation_offers)
    hotel_cost = hotel_nights * 55
    potential_accom_saving = accommodation_offers * 55
    
    meal_offers = sum(1 for v in visits if v.get("meal_offered"))
    food_cost = (nights * 25) - (meal_offers * 15)
    potential_food_saving = meal_offers * 15
    
    honorarium_total = 0
    honorarium_estimates = []
    for v in visits:
        attendance = v.get("attendance", 100)
        est = 50 if attendance < 100 else (150 if attendance < 500 else 200)
        honorarium_total += est
        honorarium_estimates.append({
            "church": v["church_name"],
            "estimated": est
        })
    
    travel_cost = min(total_train, total_fuel) + parking
    total_costs = travel_cost + hotel_cost + food_cost
    net = honorarium_total - total_costs
    
    cost_analysis = {
        "travel": {
            "train_estimate": round(total_train, 2),
            "fuel_estimate": round(total_fuel, 2),
            "parking_estimate": round(parking, 2),
            "total_travel": round(travel_cost, 2),
            "per_visit_cost": round(travel_cost / len(visits), 2)
        },
        "accommodation": {
            "nights_needed": nights,
            "budget_hotel_estimate": round(hotel_cost, 2),
            "host_church_offers": accommodation_offers,
            "potential_saving": round(potential_accom_saving, 2)
        },
        "food": {
            "daily_estimate": 25,
            "total": round(food_cost, 2),
            "meal_offers": meal_offers,
            "potential_saving": round(potential_food_saving, 2)
        },
        "honorarium": {
            "expected_total": honorarium_total,
            "per_church_estimates": honorarium_estimates[:5]
        },
        "net_position": {
            "total_costs": round(total_costs, 2),
            "expected_income": honorarium_total,
            "net": round(net, 2),
            "verdict": f"{'PROFITABLE' if net > 0 else 'DEFICIT'} -- This trip {'covers all costs with GBP ' + str(round(net, 2)) + ' surplus' if net > 0 else 'has a deficit of GBP ' + str(abs(round(net, 2)))}"
        }
    }
    
    total_travel_hours = total_distance / 50
    total_ministry_hours = len(visits) * 2
    schedule_heatmap = {}
    for v in visits:
        date_key = v["date"]
        if date_key not in schedule_heatmap:
            schedule_heatmap[date_key] = {}
        schedule_heatmap[date_key][v["time"]] = v["church_name"]
    
    time_analysis = {
        "total_travel_hours": round(total_travel_hours, 1),
        "total_ministry_hours": round(total_ministry_hours, 1),
        "ministry_to_travel_ratio": round(total_ministry_hours / max(total_travel_hours, 1), 2),
        "rest_days": max(0, basics.get("duration_days", 7) - len(set(v["day"] for v in visits))),
        "schedule_heatmap": schedule_heatmap
    }
    
    total_reach = sum(v.get("attendance", 100) for v in visits)
    impact_score = min(100, (total_reach / 100) + (len(visits) * 5))
    
    impact_analysis = {
        "total_reach": total_reach,
        "impact_score": round(impact_score, 0),
        "highest_impact_visit": max(visits, key=lambda v: v.get("attendance", 0))["church_name"] if visits else "N/A",
        "average_congregation": round(total_reach / len(visits), 0)
    }
    
    risks = []
    unconfirmed = sum(1 for v in visits if not v.get("confirmed"))
    if unconfirmed > 0:
        risks.append({
            "risk": f"{unconfirmed} visits not yet confirmed",
            "severity": "medium" if unconfirmed > 2 else "low",
            "mitigation": "Send reminders -- churches typically confirm within 48 hours"
        })
    
    if hotel_nights > 0:
        risks.append({
            "risk": f"No accommodation arranged for {hotel_nights} nights",
            "severity": "medium",
            "mitigation": f"{accommodation_offers} churches offered accommodation -- accept to save GBP {round(potential_accom_saving, 2)}"
        })
    
    risk_score = len(risks) * 15
    risk_analysis = {
        "risks": risks,
        "overall_risk_level": "LOW" if risk_score < 30 else ("MEDIUM" if risk_score < 60 else "HIGH"),
        "risk_score": risk_score
    }
    
    recommendations = [
        f"Accept accommodation offers from {accommodation_offers} churches to save GBP {round(potential_accom_saving, 2)}",
        f"Book train tickets in advance to save approximately GBP {round(total_train * 0.4, 2)}",
        "Send confirmation requests to all pending churches within 24 hours",
        f"Consider adding one more large congregation visit to increase total reach",
        "Prepare sermon materials focusing on your ministry strengths"
    ]
    
    cost_efficiency = min(100, (honorarium_total / max(total_costs, 1)) * 20)
    time_efficiency = min(100, time_analysis["ministry_to_travel_ratio"] * 30)
    feasibility = 100 - risk_score
    
    overall_score = round((cost_efficiency + time_efficiency + impact_score + feasibility) / 4, 0)
    
    analysis = {
        "cost": cost_analysis,
        "time": time_analysis,
        "impact": impact_analysis,
        "risk": risk_analysis,
        "recommendations": recommendations,
        "overall_score": overall_score,
        "breakdown": {
            "cost_efficiency": round(cost_efficiency, 0),
            "time_efficiency": round(time_efficiency, 0),
            "impact": round(impact_score, 0),
            "risk": risk_score,
            "feasibility": round(feasibility, 0)
        }
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"analysis": analysis, "analyzed_at": datetime.utcnow()}}
    )
    
    return analysis

@router.get("/{trip_id}/export/pdf")
async def export_pdf(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    lavender = HexColor("#7c3aed")
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=lavender,
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=lavender,
        spaceAfter=12
    )
    
    story.append(Paragraph("Ministry Trip Itinerary", title_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(f"Minister: {trip.get('user_name', 'Minister')}", styles['Normal']))
    
    basics = trip.get("basics", {})
    if basics.get("arrival_date"):
        story.append(Paragraph(f"Dates: {basics['arrival_date']}", styles['Normal']))
    if basics.get("cities"):
        story.append(Paragraph(f"Cities: {', '.join(basics['cities'])}", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Trip Overview", heading_style))
    
    visits = trip.get("visits", [])
    total_reach = sum(v.get("attendance", 100) for v in visits)
    
    overview_data = [
        ["Total Visits", str(len(visits))],
        ["Total Reach", str(total_reach)],
        ["Cities", str(len(set(v["church_city"] for v in visits)))],
    ]
    
    if trip.get("analysis"):
        analysis = trip["analysis"]
        overview_data.append(["Trip Score", f"{analysis['overall_score']}/100"])
        overview_data.append(["Net Position", f"GBP {analysis['cost']['net_position']['net']}"])
    
    overview_table = Table(overview_data, colWidths=[2.5*inch, 2.5*inch])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), lavender),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor("#ffffff")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, HexColor("#cccccc"))
    ]))
    story.append(overview_table)
    
    story.append(PageBreak())
    story.append(Paragraph("Day-by-Day Schedule", heading_style))
    
    current_day = -1
    for visit in visits:
        if visit["day"] != current_day:
            current_day = visit["day"]
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(f"Day {current_day + 1} -- {visit['date']}", heading_style))
        
        visit_data = [
            ["Church", visit["church_name"]],
            ["Address", visit.get("church_address", "N/A")],
            ["Time", visit["time"]],
            ["Pastor", visit.get("church_pastor", "N/A")],
            ["Phone", visit.get("church_phone", "N/A")],
            ["Congregation", str(visit.get("attendance", "N/A"))],
            ["Status", visit["status"].upper()]
        ]
        
        visit_table = Table(visit_data, colWidths=[1.5*inch, 4*inch])
        visit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), HexColor("#f3f4f6")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#cccccc"))
        ]))
        story.append(visit_table)
        story.append(Spacer(1, 0.15*inch))
        
        qr = qrcode.QRCode(version=1, box_size=3, border=1)
        qr.add_data(f"https://churchnavigator.com/church/{visit['church_id']}")
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        try:
            story.append(Image(qr_buffer, width=0.8*inch, height=0.8*inch))
        except:
            pass
        
        story.append(Spacer(1, 0.1*inch))
    
    story.append(PageBreak())
    story.append(Paragraph("Contact Directory", heading_style))
    
    contact_data = [["Church", "Pastor", "Phone", "Email", "Confirmed"]]
    for visit in visits:
        contact_data.append([
            visit["church_name"][:30],
            visit.get("church_pastor", "N/A")[:20],
            visit.get("church_phone", "N/A")[:15],
            visit.get("church_email", "N/A")[:25],
            "Yes" if visit.get("confirmed") else "No"
        ])
    
    contact_table = Table(contact_data, colWidths=[1.5*inch, 1.2*inch, 1*inch, 1.5*inch, 0.8*inch])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), lavender),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor("#ffffff")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#cccccc"))
    ]))
    story.append(contact_table)
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Prepared by ChurchNavigator Planner", styles['Normal']))
    story.append(Paragraph("https://churchnavigator.com/planner", styles['Normal']))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"pdf_base64": pdf_base64, "pdf_generated_at": datetime.utcnow()}}
    )
    
    return {"pdf_base64": pdf_base64}

@router.post("/{trip_id}/share")
async def share_trip(trip_id: str, share_req: ShareRequest, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id), "user_id": user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    import secrets
    invite_token = secrets.token_urlsafe(32)
    
    collaborator = {
        "email": share_req.email,
        "role": share_req.role,
        "invited_at": datetime.utcnow(),
        "invite_token": invite_token,
        "accepted_at": None,
        "last_viewed_at": None
    }
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"collaborators": collaborator}}
    )
    
    invite_link = f"https://churchnavigator.com/planner/join/{trip_id}/{invite_token}"
    
    email_body = f"""
    <h2>You have been invited to collaborate on a ministry trip</h2>
    <p>{user.get('name', 'A minister')} has invited you to join their UK ministry trip planning.</p>
    <p><strong>Your role:</strong> {share_req.role}</p>
    {f'<p><strong>Message:</strong> {share_req.message}</p>' if share_req.message else ''}
    <p><a href="{invite_link}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Trip Board</a></p>
    <p>This link is unique to you and expires in 7 days.</p>
    <p style="color: #666; font-size: 12px;">ChurchNavigator Planner</p>
    """
    
    background_tasks.add_task(
        send_email,
        to_email=share_req.email,
        subject=f"Invitation to collaborate on ministry trip",
        body=email_body
    )
    
    return {"success": True, "invite_link": invite_link}

@router.post("/{trip_id}/chat")
async def send_chat_message(trip_id: str, msg: ChatMessage, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    is_collaborator = (
        str(trip["user_id"]) == str(user["_id"]) or
        any(c["email"] == user["email"] for c in trip.get("collaborators", []))
    )
    
    if not is_collaborator:
        raise HTTPException(status_code=403, detail="Not a collaborator")
    
    chat_msg = {
        "trip_id": trip_id,
        "sender_id": str(user["_id"]),
        "sender_name": user.get("name", "User"),
        "sender_email": user["email"],
        "message": msg.message,
        "sent_at": datetime.utcnow(),
        "read_by": [str(user["_id"])]
    }
    
    await db.trip_messages.insert_one(chat_msg)
    
    return {"success": True, "message": chat_msg}

@router.get("/{trip_id}/chat")
async def get_chat_messages(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    is_collaborator = (
        str(trip["user_id"]) == str(user["_id"]) or
        any(c["email"] == user["email"] for c in trip.get("collaborators", []))
    )
    
    if not is_collaborator:
        raise HTTPException(status_code=403, detail="Not a collaborator")
    
    messages = await db.trip_messages.find({"trip_id": trip_id}).sort("sent_at", 1).to_list(length=500)
    
    for message in messages:
        message["_id"] = str(message["_id"])
    
    return {"messages": messages}

@router.post("/{trip_id}/visits/{visit_index}/status")
async def update_visit_status(trip_id: str, visit_index: int, status_update: StatusUpdate, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    is_collaborator = (
        str(trip["user_id"]) == str(user["_id"]) or
        any(c["email"] == user["email"] and c["role"] in ["coordinator", "driver"] for c in trip.get("collaborators", []))
    )
    
    if not is_collaborator:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.ministry_trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {f"visits.{visit_index}.status": status_update.status, f"visits.{visit_index}.status_updated_at": datetime.utcnow()}}
    )
    
    return {"success": True}

@router.get("/{trip_id}")
async def get_trip(trip_id: str, user: dict = Depends(get_current_user)):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    is_owner = str(trip["user_id"]) == str(user["_id"])
    is_collaborator = any(c["email"] == user["email"] for c in trip.get("collaborators", []))
    
    if not is_owner and not is_collaborator:
        raise HTTPException(status_code=403, detail="Access denied")
    
    trip["_id"] = str(trip["_id"])
    trip["user_id"] = str(trip["user_id"])
    
    return trip

@router.get("/view/{trip_id}/{share_token}")
async def view_shared_trip(trip_id: str, share_token: str):
    trip = await db.ministry_trips.find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    public_data = {
        "user_name": trip.get("user_name", "Minister"),
        "cities": trip.get("basics", {}).get("cities", []),
        "visits": [
            {
                "church_name": v["church_name"],
                "church_city": v["church_city"],
                "date": v["date"],
                "time": v["time"],
                "attendance": v.get("attendance")
            }
            for v in trip.get("visits", [])
        ],
        "total_reach": sum(v.get("attendance", 100) for v in trip.get("visits", []))
    }
    
    return public_data