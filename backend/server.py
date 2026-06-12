from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

class HealthCheckResponse(BaseModel):
    total_score: int
    breakdown: List[Dict[str, Any]]
    top_3_actions: List[Dict[str, Any]]
    score_band: str
    listing_found: bool
    listing_name: Optional[str] = None
    listing_type: Optional[str] = None
    listing_id: Optional[str] = None

class TrendDataPoint(BaseModel):
    week_ending: str
    score: int

class HealthTrendsResponse(BaseModel):
    listing_id: str
    listing_name: str
    trends: List[TrendDataPoint]

def calculate_profile_completeness(listing: Dict) -> Dict:
    score = 0
    max_score = 25
    improvements = []
    
    if listing.get("photo_url"):
        score += 5
    else:
        improvements.append({"action": "Add profile photo", "points": 5, "priority": "high"})
    
    if listing.get("cover_image_url"):
        score += 5
    else:
        improvements.append({"action": "Add cover image", "points": 5, "priority": "high"})
    
    bio = listing.get("bio", "")
    if len(bio) > 200:
        score += 5
    elif len(bio) > 50:
        score += 3
        improvements.append({"action": "Expand bio to 200+ characters", "points": 2, "priority": "medium"})
    else:
        improvements.append({"action": "Write detailed bio (200+ chars)", "points": 5, "priority": "high"})
    
    required_fields = ["address", "phone", "email"]
    filled = sum(1 for f in required_fields if listing.get(f))
    field_score = int((filled / len(required_fields)) * 10)
    score += field_score
    if field_score < 10:
        improvements.append({"action": "Complete contact information", "points": 10 - field_score, "priority": "medium"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def calculate_social_presence(listing: Dict) -> Dict:
    score = 0
    max_score = 20
    improvements = []
    
    if listing.get("facebook_url"):
        score += 7
    else:
        improvements.append({"action": "Connect Facebook page", "points": 7, "priority": "high"})
    
    if listing.get("instagram_url"):
        score += 7
    else:
        improvements.append({"action": "Connect Instagram account", "points": 7, "priority": "medium"})
    
    if listing.get("youtube_url"):
        score += 6
    else:
        improvements.append({"action": "Add YouTube channel", "points": 6, "priority": "low"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def calculate_content_activity(listing: Dict) -> Dict:
    score = 0
    max_score = 20
    improvements = []
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    
    recent_sermons = listing.get("recent_sermons_count", 0)
    if recent_sermons >= 10:
        score += 10
    elif recent_sermons >= 5:
        score += 7
        improvements.append({"action": "Add more recent sermons (10+)", "points": 3, "priority": "medium"})
    elif recent_sermons > 0:
        score += 4
        improvements.append({"action": "Upload recent sermons regularly", "points": 6, "priority": "high"})
    else:
        improvements.append({"action": "Start uploading sermons", "points": 10, "priority": "high"})
    
    recent_events = listing.get("upcoming_events_count", 0)
    if recent_events >= 5:
        score += 10
    elif recent_events >= 2:
        score += 6
        improvements.append({"action": "List more upcoming events", "points": 4, "priority": "medium"})
    elif recent_events > 0:
        score += 3
        improvements.append({"action": "Keep events calendar updated", "points": 7, "priority": "high"})
    else:
        improvements.append({"action": "Add upcoming events", "points": 10, "priority": "high"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def calculate_engagement(listing: Dict) -> Dict:
    score = 0
    max_score = 15
    improvements = []
    
    followers = listing.get("followers_count", 0)
    if followers >= 500:
        score += 5
    elif followers >= 100:
        score += 3
        improvements.append({"action": "Grow followers to 500+", "points": 2, "priority": "medium"})
    elif followers > 0:
        score += 1
        improvements.append({"action": "Increase social following", "points": 4, "priority": "medium"})
    else:
        improvements.append({"action": "Build social media presence", "points": 5, "priority": "low"})
    
    reviews = listing.get("reviews_count", 0)
    if reviews >= 10:
        score += 5
    elif reviews >= 5:
        score += 3
        improvements.append({"action": "Encourage more reviews (10+)", "points": 2, "priority": "medium"})
    elif reviews > 0:
        score += 1
        improvements.append({"action": "Get visitor reviews", "points": 4, "priority": "high"})
    else:
        improvements.append({"action": "Request first reviews", "points": 5, "priority": "high"})
    
    avg_rating = listing.get("average_rating", 0)
    if avg_rating >= 4.5:
        score += 5
    elif avg_rating >= 4.0:
        score += 3
        improvements.append({"action": "Improve service quality (4.5+ rating)", "points": 2, "priority": "medium"})
    elif avg_rating > 0:
        score += 1
        improvements.append({"action": "Address feedback to improve ratings", "points": 4, "priority": "high"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def calculate_verification(listing: Dict) -> Dict:
    score = 0
    max_score = 10
    improvements = []
    
    if listing.get("verified"):
        score += 5
    else:
        improvements.append({"action": "Get verified badge", "points": 5, "priority": "high"})
    
    if listing.get("church_linked"):
        score += 3
    else:
        improvements.append({"action": "Link to church profile", "points": 3, "priority": "medium"})
    
    if listing.get("website_verified"):
        score += 2
    else:
        improvements.append({"action": "Verify website ownership", "points": 2, "priority": "low"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def calculate_seo_visibility(listing: Dict) -> Dict:
    score = 0
    max_score = 10
    improvements = []
    
    description = listing.get("description", "")
    if len(description) >= 300:
        score += 4
    elif len(description) >= 150:
        score += 2
        improvements.append({"action": "Expand description to 300+ chars", "points": 2, "priority": "medium"})
    else:
        improvements.append({"action": "Write SEO-optimized description", "points": 4, "priority": "high"})
    
    keywords = listing.get("keywords", [])
    if len(keywords) >= 5:
        score += 3
    elif len(keywords) >= 2:
        score += 2
        improvements.append({"action": "Add more relevant keywords", "points": 1, "priority": "low"})
    else:
        improvements.append({"action": "Add ministry keywords", "points": 3, "priority": "medium"})
    
    if listing.get("city") and listing.get("postcode"):
        score += 3
    elif listing.get("city") or listing.get("postcode"):
        score += 1
        improvements.append({"action": "Complete location details", "points": 2, "priority": "medium"})
    else:
        improvements.append({"action": "Add location information", "points": 3, "priority": "high"})
    
    return {"score": score, "max_score": max_score, "improvements": improvements}

def get_score_band(total_score: int) -> str:
    if total_score >= 85:
        return "Excellent"
    elif total_score >= 70:
        return "Good"
    elif total_score >= 50:
        return "Fair"
    elif total_score >= 30:
        return "Weak"
    else:
        return "Poor"

@app.get("/api/tools/health-check", response_model=HealthCheckResponse)
async def health_check(
    name: str = Query(..., description="Listing name or slug"),
    type: str = Query("church", description="church|pastor|worship|media|college")
):
    collection_map = {
        "church": "churches",
        "pastor": "pastors",
        "worship": "worship_leaders",
        "media": "media_teams",
        "college": "bible_colleges"
    }
    
    collection_name = collection_map.get(type, "churches")
    collection = db[collection_name]
    
    listing = await collection.find_one({
        "$or": [
            {"name": {"$regex": f"^{name}$", "$options": "i"}},
            {"slug": {"$regex": f"^{name}$", "$options": "i"}}
        ]
    })
    
    if not listing:
        return HealthCheckResponse(
            total_score=0,
            breakdown=[],
            top_3_actions=[],
            score_band="Poor",
            listing_found=False
        )
    
    profile = calculate_profile_completeness(listing)
    social = calculate_social_presence(listing)
    content = calculate_content_activity(listing)
    engagement = calculate_engagement(listing)
    verification = calculate_verification(listing)
    seo = calculate_seo_visibility(listing)
    
    total_score = profile["score"] + social["score"] + content["score"] + engagement["score"] + verification["score"] + seo["score"]
    
    all_improvements = []
    all_improvements.extend(profile["improvements"])
    all_improvements.extend(social["improvements"])
    all_improvements.extend(content["improvements"])
    all_improvements.extend(engagement["improvements"])
    all_improvements.extend(verification["improvements"])
    all_improvements.extend(seo["improvements"])
    
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_improvements.sort(key=lambda x: (priority_order[x["priority"]], -x["points"]))
    top_3_actions = all_improvements[:3]
    
    breakdown = [
        {"category": "Profile Completeness", "score": profile["score"], "max_score": profile["max_score"], "percentage": int((profile["score"] / profile["max_score"]) * 100)},
        {"category": "Social Media Presence", "score": social["score"], "max_score": social["max_score"], "percentage": int((social["score"] / social["max_score"]) * 100)},
        {"category": "Content Activity", "score": content["score"], "max_score": content["max_score"], "percentage": int((content["score"] / content["max_score"]) * 100)},
        {"category": "Engagement", "score": engagement["score"], "max_score": engagement["max_score"], "percentage": int((engagement["score"] / engagement["max_score"]) * 100)},
        {"category": "Verification", "score": verification["score"], "max_score": verification["max_score"], "percentage": int((verification["score"] / verification["max_score"]) * 100)},
        {"category": "SEO Visibility", "score": seo["score"], "max_score": seo["max_score"], "percentage": int((seo["score"] / seo["max_score"]) * 100)}
    ]
    
    return HealthCheckResponse(
        total_score=total_score,
        breakdown=breakdown,
        top_3_actions=top_3_actions,
        score_band=get_score_band(total_score),
        listing_found=True,
        listing_name=listing.get("name"),
        listing_type=type,
        listing_id=str(listing["_id"])
    )

@app.get("/api/tools/health-check/trends/{listing_id}", response_model=HealthTrendsResponse)
async def health_check_trends(listing_id: str):
    trends_collection = db["health_score_history"]
    
    twelve_weeks_ago = datetime.utcnow() - timedelta(weeks=12)
    
    history = await trends_collection.find({
        "listing_id": listing_id,
        "week_ending": {"$gte": twelve_weeks_ago}
    }).sort("week_ending", 1).to_list(length=12)
    
    if not history:
        raise HTTPException(status_code=404, detail="No trend data found. Requires Standard plan.")
    
    trends = [
        TrendDataPoint(
            week_ending=record["week_ending"].strftime("%Y-%m-%d"),
            score=record["total_score"]
        )
        for record in history
    ]
    
    return HealthTrendsResponse(
        listing_id=listing_id,
        listing_name=history[0].get("listing_name", "Unknown"),
        trends=trends
    )

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)