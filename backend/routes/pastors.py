from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from models import Pastor, VisitPreferences
from database import db
from auth import get_current_user

router = APIRouter()

@router.get("/pastors/{slug}")
async def get_pastor(slug: str):
    pastor = await db.pastors.find_one({"slug": slug})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    pastor["_id"] = str(pastor["_id"])
    if "visit_preferences" not in pastor:
        pastor["visit_preferences"] = {
            "open_to_visits": False,
            "preferred_days": [],
            "preferred_times": [],
            "min_notice_weeks": 2,
            "max_visits_per_month": 2
        }
    return pastor

@router.put("/pastors/{slug}/visit-preferences")
async def update_visit_preferences(
    slug: str,
    preferences: VisitPreferences,
    current_user: dict = Depends(get_current_user)
):
    pastor = await db.pastors.find_one({"slug": slug})
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")
    
    if pastor.get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized to update this pastor")
    
    result = await db.pastors.update_one(
        {"slug": slug},
        {
            "$set": {
                "visit_preferences": preferences.dict(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update preferences")
    
    return {"message": "Visit preferences updated successfully"}