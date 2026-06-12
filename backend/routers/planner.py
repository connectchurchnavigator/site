from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from database import get_database
from auth import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

class TripCreate(BaseModel):
    name: str
    visitor_name: str
    visitor_role: str
    visitor_from: str
    coordinator_name: str
    coordinator_email: EmailStr
    coordinator_phone: str
    start_date: str
    end_date: str
    notes: Optional[str] = ""

class ItineraryItem(BaseModel):
    church_id: str
    pastor_id: Optional[str] = None
    visit_date: str
    visit_time: str
    duration_minutes: int = 120
    message: Optional[str] = ""

class VisitRequestResponse(BaseModel):
    status: str
    alternative_date: Optional[str] = None
    alternative_time: Optional[str] = None
    notes: Optional[str] = ""

@router.post("/trips")
async def create_trip(trip: TripCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    trip_data = trip.dict()
    trip_data["user_id"] = current_user["_id"]
    trip_data["created_at"] = datetime.utcnow()
    trip_data["itinerary"] = []
    trip_data["status"] = "draft"
    
    result = db.trips.insert_one(trip_data)
    trip_data["_id"] = str(result.inserted_id)
    return {"success": True, "trip": trip_data}

@router.get("/trips")
async def get_trips(current_user: dict = Depends(get_current_user)):
    db = get_database()
    trips = list(db.trips.find({"user_id": current_user["_id"]}).sort("created_at", -1))
    for trip in trips:
        trip["_id"] = str(trip["_id"])
    return {"success": True, "trips": trips}

@router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": current_user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip["_id"] = str(trip["_id"])
    return {"success": True, "trip": trip}

@router.post("/trips/{trip_id}/itinerary")
async def add_itinerary_item(trip_id: str, item: ItineraryItem, current_user: dict = Depends(get_current_user)):
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": current_user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    item_data = item.dict()
    item_data["item_id"] = str(ObjectId())
    item_data["request_status"] = "not_sent"
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"itinerary": item_data}}
    )
    return {"success": True, "item": item_data}

@router.post("/trips/{trip_id}/send-requests")
async def send_visit_requests(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": current_user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if not trip.get("itinerary"):
        raise HTTPException(status_code=400, detail="No itinerary items to send")
    
    requests_sent = 0
    errors = []
    
    for item in trip["itinerary"]:
        church = db.churches.find_one({"_id": ObjectId(item["church_id"])})
        if not church:
            errors.append(f"Church {item['church_id']} not found")
            continue
        
        pastor = None
        if item.get("pastor_id"):
            pastor = db.pastors.find_one({"_id": ObjectId(item["pastor_id"])})
        
        request_data = {
            "trip_id": trip_id,
            "church_id": item["church_id"],
            "pastor_id": item.get("pastor_id"),
            "item_id": item["item_id"],
            "requested_date": item["visit_date"],
            "requested_time": item["visit_time"],
            "duration_minutes": item.get("duration_minutes", 120),
            "visitor_name": trip["visitor_name"],
            "visitor_role": trip["visitor_role"],
            "visitor_from": trip["visitor_from"],
            "coordinator_name": trip["coordinator_name"],
            "coordinator_email": trip["coordinator_email"],
            "coordinator_phone": trip["coordinator_phone"],
            "message": item.get("message", ""),
            "status": "pending",
            "created_at": datetime.utcnow(),
            "responded_at": None,
            "alternative_date": None,
            "alternative_time": None,
            "response_notes": None
        }
        
        result = db.visit_requests.insert_one(request_data)
        request_id = str(result.inserted_id)
        
        db.trips.update_one(
            {"_id": ObjectId(trip_id), "itinerary.item_id": item["item_id"]},
            {"$set": {
                "itinerary.$.request_status": "pending",
                "itinerary.$.request_id": request_id
            }}
        )
        
        try:
            await send_visit_request_email(church, pastor, request_data, request_id)
            requests_sent += 1
        except Exception as e:
            errors.append(f"Email failed for {church.get('name', 'church')}: {str(e)}")
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": {"status": "requests_sent", "requests_sent_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "requests_sent": requests_sent,
        "errors": errors
    }

async def send_visit_request_email(church: dict, pastor: dict, request: dict, request_id: str):
    admin_email = church.get("admin_email")
    if not admin_email:
        return
    
    church_name = church.get("name", "Your Church")
    pastor_name = pastor.get("name", "Pastor") if pastor else "Pastor"
    
    date_formatted = datetime.strptime(request["requested_date"], "%Y-%m-%d").strftime("%A, %B %d, %Y")
    time_12h = datetime.strptime(request["requested_time"], "%H:%M").strftime("%I:%M %p")
    
    confirm_url = f"https://churchnavigator.com/visit-request/{request_id}/confirm"
    decline_url = f"https://churchnavigator.com/visit-request/{request_id}/decline"
    alternative_url = f"https://churchnavigator.com/visit-request/{request_id}/alternative"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Visit Request for {church_name}</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">{request['visitor_name']}</h3>
                <p><strong>Role:</strong> {request['visitor_role']}</p>
                <p><strong>From:</strong> {request['visitor_from']}</p>
                <p><strong>Requested Date:</strong> {date_formatted}</p>
                <p><strong>Requested Time:</strong> {time_12h}</p>
                <p><strong>Duration:</strong> {request['duration_minutes']} minutes</p>
            </div>
            
            {f'<div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;"><p style="margin: 0;"><strong>Message:</strong><br>{request["message"]}</p></div>' if request.get('message') else ''}
            
            <div style="margin: 30px 0;">
                <p><strong>Coordinator Contact:</strong></p>
                <p>{request['coordinator_name']}<br>
                {request['coordinator_email']}<br>
                {request['coordinator_phone']}</p>
            </div>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="{confirm_url}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px;">✓ Confirm Visit</a>
                <a href="{decline_url}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px;">✗ Decline</a>
                <a href="{alternative_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px;">↻ Suggest Alternative</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">You can also respond by logging into your ChurchNavigator dashboard.</p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email='notifications@churchnavigator.com',
        to_emails=admin_email,
        subject=f'Visit Request: {request["visitor_name"]} - {date_formatted}',
        html_content=html_content
    )
    
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)

@router.post("/requests/{request_id}/respond")
async def respond_to_request(request_id: str, response: VisitRequestResponse):
    db = get_database()
    
    visit_request = db.visit_requests.find_one({"_id": ObjectId(request_id)})
    if not visit_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    update_data = {
        "status": response.status,
        "responded_at": datetime.utcnow(),
        "response_notes": response.notes
    }
    
    if response.alternative_date:
        update_data["alternative_date"] = response.alternative_date
    if response.alternative_time:
        update_data["alternative_time"] = response.alternative_time
    
    db.visit_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    
    trip_id = visit_request["trip_id"]
    item_id = visit_request["item_id"]
    
    trip_update = {"itinerary.$.request_status": response.status}
    
    if response.status == "confirmed":
        trip_update["itinerary.$.confirmed"] = True
    elif response.status == "alternative" and response.alternative_date and response.alternative_time:
        trip_update["itinerary.$.alternative_date"] = response.alternative_date
        trip_update["itinerary.$.alternative_time"] = response.alternative_time
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id), "itinerary.item_id": item_id},
        {"$set": trip_update}
    )
    
    try:
        await send_response_notification_to_coordinator(visit_request, response)
    except Exception as e:
        pass
    
    return {"success": True, "message": "Response recorded"}

async def send_response_notification_to_coordinator(visit_request: dict, response: VisitRequestResponse):
    db = get_database()
    church = db.churches.find_one({"_id": ObjectId(visit_request["church_id"])})
    if not church:
        return
    
    status_text = {
        "confirmed": "✓ CONFIRMED",
        "declined": "✗ DECLINED",
        "alternative": "↻ ALTERNATIVE TIME SUGGESTED"
    }.get(response.status, response.status.upper())
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Visit Request Update</h2>
            <p><strong>{church.get('name', 'A church')}</strong> has responded to your visit request:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: {'#10b981' if response.status == 'confirmed' else '#ef4444' if response.status == 'declined' else '#3b82f6'};">{status_text}</h3>
                <p><strong>Visitor:</strong> {visit_request['visitor_name']}</p>
                <p><strong>Original Request:</strong> {visit_request['requested_date']} at {visit_request['requested_time']}</p>
                {f'<p><strong>Alternative Suggested:</strong> {response.alternative_date} at {response.alternative_time}</p>' if response.alternative_date else ''}
                {f'<p><strong>Notes:</strong><br>{response.notes}</p>' if response.notes else ''}
            </div>
            <p><a href="https://churchnavigator.com/planner/trips/{visit_request['trip_id']}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Trip Details</a></p>
        </div>
    </body>
    </html>
    """
    
    message = Mail(
        from_email='notifications@churchnavigator.com',
        to_emails=visit_request['coordinator_email'],
        subject=f'Visit Response: {church.get("name", "Church")} - {status_text}',
        html_content=html_content
    )
    
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)

@router.get("/trips/{trip_id}/requests")
async def get_trip_requests(trip_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": current_user["_id"]})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    requests = list(db.visit_requests.find({"trip_id": trip_id}))
    for req in requests:
        req["_id"] = str(req["_id"])
    
    return {"success": True, "requests": requests}

@router.get("/requests/{request_id}")
async def get_request_details(request_id: str):
    db = get_database()
    request = db.visit_requests.find_one({"_id": ObjectId(request_id)})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    church = db.churches.find_one({"_id": ObjectId(request["church_id"])})
    pastor = None
    if request.get("pastor_id"):
        pastor = db.pastors.find_one({"_id": ObjectId(request["pastor_id"])})
    
    request["_id"] = str(request["_id"])
    if church:
        church["_id"] = str(church["_id"])
        request["church"] = church
    if pastor:
        pastor["_id"] = str(pastor["_id"])
        request["pastor"] = pastor
    
    return {"success": True, "request": request}
