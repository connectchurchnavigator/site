from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List
import anthropic
import os
from pydantic import BaseModel, Field

from database import get_database
from auth import get_current_user

router = APIRouter(prefix="/api/planner", tags=["planner"])

class TripCreate(BaseModel):
    name: str
    city: str
    start_date: str
    end_date: str
    purpose: str
    estimated_budget: Optional[float] = 0

class VisitCreate(BaseModel):
    church_id: str
    date: str
    time: str
    duration_minutes: int
    expected_attendance: Optional[int] = None
    travel_time_minutes: Optional[int] = None
    notes: Optional[str] = ""

class VisitUpdate(BaseModel):
    completed: bool
    actual_attendance: Optional[int] = None
    actual_duration_minutes: Optional[int] = None
    highlights: Optional[str] = ""
    reinvitation_received: Optional[bool] = False
    reinvitation_notes: Optional[str] = ""

class TripUpdate(BaseModel):
    actual_budget: Optional[float] = None
    overall_notes: Optional[str] = ""

@router.post("/trips")
async def create_trip(trip: TripCreate, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip_data = {
        "user_id": str(user["_id"]),
        "name": trip.name,
        "city": trip.city,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "purpose": trip.purpose,
        "estimated_budget": trip.estimated_budget,
        "actual_budget": None,
        "visits": [],
        "post_trip_report": None,
        "created_at": datetime.utcnow().isoformat(),
        "status": "planned"
    }
    result = db.trips.insert_one(trip_data)
    trip_data["_id"] = str(result.inserted_id)
    return trip_data

@router.get("/trips")
async def get_trips(user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trips = list(db.trips.find({"user_id": str(user["_id"])}).sort("created_at", -1))
    for trip in trips:
        trip["_id"] = str(trip["_id"])
    return trips

@router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip["_id"] = str(trip["_id"])
    for visit in trip.get("visits", []):
        church = db.churches.find_one({"_id": ObjectId(visit["church_id"])})
        if church:
            visit["church_name"] = church.get("name", "")
            visit["church_address"] = church.get("address", "")
    return trip

@router.post("/trips/{trip_id}/visits")
async def add_visit(trip_id: str, visit: VisitCreate, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    church = db.churches.find_one({"_id": ObjectId(visit.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    visit_data = {
        "church_id": visit.church_id,
        "church_name": church.get("name", ""),
        "date": visit.date,
        "time": visit.time,
        "duration_minutes": visit.duration_minutes,
        "expected_attendance": visit.expected_attendance,
        "travel_time_minutes": visit.travel_time_minutes,
        "notes": visit.notes,
        "completed": False,
        "actual_attendance": None,
        "actual_duration_minutes": None,
        "highlights": "",
        "reinvitation_received": False,
        "reinvitation_notes": ""
    }
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$push": {"visits": visit_data}}
    )
    return {"message": "Visit added successfully"}

@router.patch("/trips/{trip_id}/visits/{visit_index}")
async def update_visit(trip_id: str, visit_index: int, visit_update: VisitUpdate, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if visit_index >= len(trip.get("visits", [])):
        raise HTTPException(status_code=404, detail="Visit not found")
    
    update_fields = {}
    if visit_update.completed is not None:
        update_fields[f"visits.{visit_index}.completed"] = visit_update.completed
    if visit_update.actual_attendance is not None:
        update_fields[f"visits.{visit_index}.actual_attendance"] = visit_update.actual_attendance
    if visit_update.actual_duration_minutes is not None:
        update_fields[f"visits.{visit_index}.actual_duration_minutes"] = visit_update.actual_duration_minutes
    if visit_update.highlights is not None:
        update_fields[f"visits.{visit_index}.highlights"] = visit_update.highlights
    if visit_update.reinvitation_received is not None:
        update_fields[f"visits.{visit_index}.reinvitation_received"] = visit_update.reinvitation_received
    if visit_update.reinvitation_notes is not None:
        update_fields[f"visits.{visit_index}.reinvitation_notes"] = visit_update.reinvitation_notes
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": update_fields}
    )
    return {"message": "Visit updated successfully"}

@router.patch("/trips/{trip_id}")
async def update_trip(trip_id: str, trip_update: TripUpdate, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_fields = {}
    if trip_update.actual_budget is not None:
        update_fields["actual_budget"] = trip_update.actual_budget
    if trip_update.overall_notes is not None:
        update_fields["overall_notes"] = trip_update.overall_notes
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {"$set": update_fields}
    )
    return {"message": "Trip updated successfully"}

@router.post("/trips/{trip_id}/report")
async def generate_trip_report(trip_id: str, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    end_date = datetime.fromisoformat(trip["end_date"])
    if datetime.utcnow() < end_date:
        raise HTTPException(status_code=400, detail="Cannot generate report before trip ends")
    
    visits = trip.get("visits", [])
    total_planned = len(visits)
    total_completed = sum(1 for v in visits if v.get("completed", False))
    
    planned_attendance = sum(v.get("expected_attendance", 0) or 0 for v in visits)
    actual_attendance = sum(v.get("actual_attendance", 0) or 0 for v in visits if v.get("completed", False))
    
    planned_travel = sum(v.get("travel_time_minutes", 0) or 0 for v in visits)
    actual_duration = sum(v.get("actual_duration_minutes", 0) or 0 for v in visits if v.get("completed", False))
    
    estimated_budget = trip.get("estimated_budget", 0) or 0
    actual_budget = trip.get("actual_budget") or estimated_budget
    
    reinvitations = [v for v in visits if v.get("reinvitation_received", False)]
    
    analytics = {
        "visits_planned": total_planned,
        "visits_completed": total_completed,
        "attendance_planned": planned_attendance,
        "attendance_actual": actual_attendance,
        "travel_time_planned_minutes": planned_travel,
        "total_duration_actual_minutes": actual_duration,
        "budget_estimated": estimated_budget,
        "budget_actual": actual_budget,
        "reinvitations_count": len(reinvitations)
    }
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    visit_details = "\n".join([
        f"- {v.get('church_name', 'Unknown Church')} on {v.get('date', '')} at {v.get('time', '')}: "
        f"{'✓ Completed' if v.get('completed') else '✗ Not completed'}. "
        f"Expected {v.get('expected_attendance', 0)} people, actual: {v.get('actual_attendance', 'N/A')}. "
        f"Highlights: {v.get('highlights', 'None provided')}. "
        f"Re-invitation: {'Yes - ' + v.get('reinvitation_notes', '') if v.get('reinvitation_received') else 'No'}."
        for v in visits
    ])
    
    prompt = f"""You are analyzing a ministry trip to {trip['city']} from {trip['start_date']} to {trip['end_date']}.

Trip Purpose: {trip['purpose']}

Analytics:
- Planned visits: {total_planned}, Completed: {total_completed}
- Expected reach: {planned_attendance} people, Actual: {actual_attendance} people
- Budget: £{estimated_budget} estimated, £{actual_budget} actual
- Re-invitations received: {len(reinvitations)}

Visit Details:
{visit_details}

Generate a warm, insightful trip report with these sections:

1. **Trip Highlights** (2-3 sentences celebrating the journey)
2. **Most Impactful Visit** (identify which church visit had the greatest impact and why)
3. **What Went Well** (3-4 bullet points)
4. **Areas for Improvement** (2-3 constructive suggestions)
5. **Recommendations for Next Visit to {trip['city']}** (specific actionable advice)
6. **Future Opportunities** (mention re-invitation churches and potential)

Keep it encouraging, practical, and focused on ministry impact. Use a pastoral, supportive tone."""
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        narrative = message.content[0].text
    except Exception as e:
        narrative = f"Error generating AI insights: {str(e)}"
    
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "analytics": analytics,
        "narrative": narrative,
        "reinvitations": [
            {
                "church_name": v.get("church_name", ""),
                "church_id": v.get("church_id", ""),
                "notes": v.get("reinvitation_notes", "")
            }
            for v in reinvitations
        ],
        "suggested_next_trip": {
            "city": trip["city"],
            "recommended_date": (datetime.utcnow() + timedelta(days=90)).isoformat()[:10],
            "focus_areas": [v.get("church_name", "") for v in reinvitations[:3]]
        }
    }
    
    db.trips.update_one(
        {"_id": ObjectId(trip_id)},
        {
            "$set": {
                "post_trip_report": report,
                "status": "completed"
            }
        }
    )
    
    if "email" in user:
        from notifications import send_email
        try:
            send_email(
                to=user["email"],
                subject=f"Your {trip['city']} Trip Report is Ready",
                body=f"Your trip report for {trip['name']} is now available. View it at https://churchnavigator.com/planner/{trip_id}/report"
            )
        except:
            pass
    
    return report

@router.get("/trips/{trip_id}/report")
async def get_trip_report(trip_id: str, user = Depends(get_current_user)):
    if not user.get("is_premium", False):
        raise HTTPException(status_code=403, detail="Trip planner is a Premium feature")
    
    db = get_database()
    trip = db.trips.find_one({"_id": ObjectId(trip_id), "user_id": str(user["_id"])})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if not trip.get("post_trip_report"):
        raise HTTPException(status_code=404, detail="Report not generated yet")
    
    return trip["post_trip_report"]