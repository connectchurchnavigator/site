from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from ics import Calendar, Event
from ..database import db
from ..auth import get_current_user
from ..models import Planner, PlannerItem

router = APIRouter(prefix="/api/planner", tags=["planner"])

@router.post("/")
async def create_planner(planner_data: dict, current_user: dict = Depends(get_current_user)):
    planner_data["user_id"] = current_user["_id"]
    planner_data["created_at"] = datetime.utcnow()
    planner_data["updated_at"] = datetime.utcnow()
    planner_data["share_token"] = secrets.token_urlsafe(16)
    result = await db.planners.insert_one(planner_data)
    return {"_id": str(result.inserted_id), "share_token": planner_data["share_token"]}

@router.get("/")
async def get_planners(current_user: dict = Depends(get_current_user)):
    planners = await db.planners.find({"user_id": current_user["_id"]}).to_list(100)
    for p in planners:
        p["_id"] = str(p["_id"])
        p["user_id"] = str(p["user_id"])
    return planners

@router.get("/{planner_id}")
async def get_planner(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    planner = await db.planners.find_one({"_id": ObjectId(planner_id), "user_id": current_user["_id"]})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    planner["_id"] = str(planner["_id"])
    planner["user_id"] = str(planner["user_id"])
    return planner

@router.put("/{planner_id}")
async def update_planner(planner_id: str, planner_data: dict, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    planner_data["updated_at"] = datetime.utcnow()
    result = await db.planners.update_one(
        {"_id": ObjectId(planner_id), "user_id": current_user["_id"]},
        {"$set": planner_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Planner not found")
    return {"success": True}

@router.delete("/{planner_id}")
async def delete_planner(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    result = await db.planners.delete_one({"_id": ObjectId(planner_id), "user_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Planner not found")
    return {"success": True}

@router.get("/share/{share_token}")
async def get_public_planner(share_token: str):
    planner = await db.planners.find_one({"share_token": share_token})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    planner["_id"] = str(planner["_id"])
    planner["user_id"] = str(planner["user_id"])
    return planner

@router.get("/{planner_id}/export/pdf")
async def export_pdf(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    planner = await db.planners.find_one({"_id": ObjectId(planner_id), "user_id": current_user["_id"]})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#1a202c'), alignment=TA_CENTER, spaceAfter=30)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor('#2d3748'), spaceAfter=12)
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#4a5568'))
    
    story.append(Paragraph("ChurchNavigator UK", title_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(planner.get('trip_name', 'UK Trip Itinerary'), heading_style))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph(f"Visitor: {planner.get('visitor_name', 'N/A')}", normal_style))
    story.append(Paragraph(f"Dates: {planner.get('start_date', 'N/A')} to {planner.get('end_date', 'N/A')}", normal_style))
    story.append(Paragraph(f"Base Location: {planner.get('base_location', 'N/A')}", normal_style))
    story.append(Spacer(1, 0.3*inch))
    
    if planner.get('overview'):
        story.append(Paragraph("Overview", heading_style))
        story.append(Paragraph(planner['overview'], normal_style))
        story.append(Spacer(1, 0.2*inch))
    
    story.append(PageBreak())
    story.append(Paragraph("Day-by-Day Schedule", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    items = planner.get('items', [])
    if items:
        current_day = None
        for item in sorted(items, key=lambda x: (x.get('date', ''), x.get('time', ''))):
            day_date = item.get('date', '')
            if day_date != current_day:
                current_day = day_date
                story.append(Spacer(1, 0.15*inch))
                story.append(Paragraph(f"<b>{day_date}</b>", heading_style))
            
            time_str = item.get('time', 'N/A')
            title = item.get('title', 'Untitled Event')
            location = item.get('location', '')
            description = item.get('description', '')
            church = item.get('church_name', '')
            pastor = item.get('pastor_name', '')
            phone = item.get('phone', '')
            
            story.append(Paragraph(f"<b>{time_str}</b> — {title}", normal_style))
            if church:
                story.append(Paragraph(f"Church: {church}", normal_style))
            if location:
                story.append(Paragraph(f"Location: {location}", normal_style))
            if pastor:
                story.append(Paragraph(f"Pastor: {pastor} {phone}", normal_style))
            if description:
                story.append(Paragraph(f"{description}", normal_style))
            story.append(Spacer(1, 0.1*inch))
    
    story.append(PageBreak())
    story.append(Paragraph("Contact List", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    contacts = []
    for item in items:
        church = item.get('church_name', '')
        pastor = item.get('pastor_name', '')
        phone = item.get('phone', '')
        if church and pastor:
            contacts.append([church, pastor, phone])
    
    if contacts:
        contact_table = Table([['Church', 'Pastor', 'Phone']] + contacts, colWidths=[2.5*inch, 2*inch, 1.5*inch])
        contact_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a202c')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0'))
        ]))
        story.append(contact_table)
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Emergency Contacts", heading_style))
    story.append(Paragraph("UK Emergency: 999", normal_style))
    story.append(Paragraph("NHS Non-Emergency: 111", normal_style))
    story.append(Paragraph(f"Trip Coordinator: {planner.get('coordinator_name', 'N/A')} {planner.get('coordinator_phone', '')}", normal_style))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"{planner.get('trip_name', 'itinerary').replace(' ', '_')}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/{planner_id}/export/ical")
async def export_ical(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    planner = await db.planners.find_one({"_id": ObjectId(planner_id), "user_id": current_user["_id"]})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    cal = Calendar()
    items = planner.get('items', [])
    
    for item in items:
        event = Event()
        event.name = item.get('title', 'Untitled Event')
        
        date_str = item.get('date', '')
        time_str = item.get('time', '09:00')
        try:
            start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            event.begin = start_dt
            event.duration = timedelta(hours=2)
        except:
            pass
        
        location_parts = []
        if item.get('church_name'):
            location_parts.append(item['church_name'])
        if item.get('location'):
            location_parts.append(item['location'])
        event.location = ', '.join(location_parts)
        
        desc_parts = []
        if item.get('description'):
            desc_parts.append(item['description'])
        if item.get('pastor_name'):
            desc_parts.append(f"Pastor: {item['pastor_name']}")
        if item.get('phone'):
            desc_parts.append(f"Phone: {item['phone']}")
        event.description = '\n'.join(desc_parts)
        
        cal.events.add(event)
    
    filename = f"{planner.get('trip_name', 'itinerary').replace(' ', '_')}.ics"
    return Response(content=str(cal), media_type="text/calendar", headers={"Content-Disposition": f"attachment; filename={filename}"})

@router.get("/{planner_id}/export/whatsapp")
async def export_whatsapp(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    planner = await db.planners.find_one({"_id": ObjectId(planner_id), "user_id": current_user["_id"]})
    if not planner:
        raise HTTPException(status_code=404, detail="Planner not found")
    
    visitor = planner.get('visitor_name', 'VISITOR').upper()
    trip_name = planner.get('trip_name', 'UK TRIP').upper()
    start = planner.get('start_date', '')
    end = planner.get('end_date', '')
    base = planner.get('base_location', 'UK')
    share_token = planner.get('share_token', '')
    
    message = f"{visitor} — {trip_name}\n"
    if start and end:
        message += f"{start} to {end}\n"
    message += f"📍 Base: {base}\n\n"
    
    items = planner.get('items', [])
    current_day = None
    day_count = 1
    
    for item in sorted(items, key=lambda x: (x.get('date', ''), x.get('time', '')))[:10]:
        day_date = item.get('date', '')
        if day_date != current_day:
            current_day = day_date
            message += f"Day {day_count}: "
            day_count += 1
        
        title = item.get('title', 'Event')
        time_str = item.get('time', '')
        church = item.get('church_name', '')
        
        if church:
            message += f"{church} {time_str}, "
        else:
            message += f"{title} {time_str}, "
    
    message = message.rstrip(', ') + "\n\n"
    message += f"Full itinerary: https://churchnavigator.com/planner/{share_token}"
    
    return {"message": message, "whatsapp_url": f"https://wa.me/?text={requests.utils.quote(message)}"}

@router.post("/{planner_id}/regenerate-share-token")
async def regenerate_share_token(planner_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(planner_id):
        raise HTTPException(status_code=400, detail="Invalid planner ID")
    new_token = secrets.token_urlsafe(16)
    result = await db.planners.update_one(
        {"_id": ObjectId(planner_id), "user_id": current_user["_id"]},
        {"$set": {"share_token": new_token, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Planner not found")
    return {"share_token": new_token}