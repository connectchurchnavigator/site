from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from backend.database import get_database
from backend.models.worship_leader import WorshipLeader, BookingEnquiry
import os
import resend

router = APIRouter(prefix="/api/worship-leaders", tags=["worship_leaders"])
db = get_database()
resend.api_key = os.getenv("RESEND_API_KEY")

@router.get("/", response_model=List[dict])
async def get_worship_leaders(
    leader_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    instruments: Optional[str] = Query(None),
    worship_styles: Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    limit: int = Query(50, le=100)
):
    query = {}
    if leader_type:
        query["leader_type"] = leader_type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if instruments:
        query["instruments"] = {"$in": instruments.split(",")}
    if worship_styles:
        query["worship_styles"] = {"$in": worship_styles.split(",")}
    if featured is not None:
        query["featured"] = featured

    leaders = list(db.worship_leaders.find(query).limit(limit))
    for leader in leaders:
        leader["_id"] = str(leader["_id"])
    return leaders

@router.get("/{slug}", response_model=dict)
async def get_worship_leader(slug: str):
    leader = db.worship_leaders.find_one({"slug": slug})
    if not leader:
        raise HTTPException(status_code=404, detail="Worship leader not found")
    leader["_id"] = str(leader["_id"])
    return leader

@router.post("/", response_model=dict)
async def create_worship_leader(leader: WorshipLeader):
    existing = db.worship_leaders.find_one({"slug": leader.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    leader_dict = leader.dict()
    result = db.worship_leaders.insert_one(leader_dict)
    leader_dict["_id"] = str(result.inserted_id)
    return leader_dict

@router.put("/{slug}", response_model=dict)
async def update_worship_leader(slug: str, leader: WorshipLeader):
    leader_dict = leader.dict()
    leader_dict["updated_at"] = datetime.utcnow()
    result = db.worship_leaders.update_one(
        {"slug": slug},
        {"$set": leader_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Worship leader not found")
    
    updated = db.worship_leaders.find_one({"slug": slug})
    updated["_id"] = str(updated["_id"])
    return updated

@router.post("/enquire")
async def submit_booking_enquiry(enquiry: BookingEnquiry):
    enquiry_dict = enquiry.dict()
    result = db.booking_enquiries.insert_one(enquiry_dict)
    
    listing = None
    if enquiry.listing_type == "worship_leader":
        listing = db.worship_leaders.find_one({"slug": enquiry.listing_slug})
    elif enquiry.listing_type == "media_team":
        listing = db.media_teams.find_one({"slug": enquiry.listing_slug})
    elif enquiry.listing_type == "space_rental":
        listing = db.space_rentals.find_one({"slug": enquiry.listing_slug})
    
    if listing and listing.get("email"):
        try:
            resend.Emails.send({
                "from": "ChurchNavigator <bookings@churchnavigator.com>",
                "to": listing["email"],
                "subject": f"New Booking Enquiry from {enquiry.your_name}",
                "html": f"""
                <h2>New Booking Enquiry</h2>
                <p><strong>From:</strong> {enquiry.your_name}</p>
                <p><strong>Email:</strong> {enquiry.your_email}</p>
                <p><strong>Phone:</strong> {enquiry.your_phone or 'Not provided'}</p>
                <p><strong>Event Type:</strong> {enquiry.event_type or 'Not specified'}</p>
                <p><strong>Event Date:</strong> {enquiry.event_date or 'Not specified'}</p>
                <p><strong>Expected Attendance:</strong> {enquiry.expected_attendance or 'Not specified'}</p>
                <p><strong>Message:</strong></p>
                <p>{enquiry.message}</p>
                <hr>
                <p><small>Reply directly to this email to respond to the enquiry.</small></p>
                """
            })
        except Exception as e:
            print(f"Email send error: {e}")
    
    resend.Emails.send({
        "from": "ChurchNavigator <bookings@churchnavigator.com>",
        "to": enquiry.your_email,
        "subject": f"Your booking enquiry for {enquiry.listing_name}",
        "html": f"""
        <h2>Thanks for your enquiry!</h2>
        <p>Hi {enquiry.your_name},</p>
        <p>We've received your booking enquiry for <strong>{enquiry.listing_name}</strong>.</p>
        <p>They will review your request and respond directly to you with availability and pricing.</p>
        <p><strong>Your enquiry details:</strong></p>
        <ul>
            <li>Event Type: {enquiry.event_type or 'Not specified'}</li>
            <li>Event Date: {enquiry.event_date or 'Not specified'}</li>
            <li>Expected Attendance: {enquiry.expected_attendance or 'Not specified'}</li>
        </ul>
        <p>Best regards,<br>ChurchNavigator Team</p>
        """
    })
    
    return {"success": True, "message": "Enquiry submitted successfully"}

@router.delete("/{slug}")
async def delete_worship_leader(slug: str):
    result = db.worship_leaders.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Worship leader not found")
    return {"success": True, "message": "Worship leader deleted"}