from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta
import anthropic
import os
from ..database import db
from ..auth import get_current_user

router = APIRouter(prefix="/tools", tags=["tools"])

class SocialHealthAnalysisRequest(BaseModel):
    church_id: str
    platform: Literal["instagram", "facebook", "youtube", "tiktok"]
    follower_count: int = Field(ge=0)
    posts_per_week: float = Field(ge=0, le=50)
    avg_likes: float = Field(ge=0)
    avg_comments: float = Field(ge=0)
    avg_shares: float = Field(ge=0, default=0)
    last_post_days_ago: int = Field(ge=0, le=365)
    has_stories: bool = False
    has_reels: bool = False
    profile_complete: bool = False
    link_in_bio: bool = False

class SocialHealthAnalysisResponse(BaseModel):
    overall_score: float
    engagement_score: float
    engagement_rate: float
    posting_score: float
    recency_score: float
    profile_score: float
    benchmarks: dict
    recommendations: list[str]
    analysis_date: str

def calculate_social_health_scores(data: SocialHealthAnalysisRequest) -> dict:
    engagement_rate = 0
    if data.follower_count > 0:
        engagement_rate = ((data.avg_likes + data.avg_comments) / data.follower_count) * 100
    
    engagement_score = min(100, engagement_rate * 20)
    
    if data.posts_per_week >= 3:
        posting_score = 100
    else:
        posting_score = data.posts_per_week * 33.33
    
    if data.last_post_days_ago <= 3:
        recency_score = 100
    else:
        recency_score = max(0, 100 - (data.last_post_days_ago * 5))
    
    profile_components = sum([
        data.has_stories,
        data.has_reels,
        data.profile_complete,
        data.link_in_bio
    ])
    profile_score = (profile_components / 4) * 100
    
    overall_score = (
        (engagement_score * 0.4) +
        (posting_score * 0.3) +
        (recency_score * 0.2) +
        (profile_score * 0.1)
    )
    
    return {
        "overall_score": round(overall_score, 1),
        "engagement_score": round(engagement_score, 1),
        "engagement_rate": round(engagement_rate, 2),
        "posting_score": round(posting_score, 1),
        "recency_score": round(recency_score, 1),
        "profile_score": round(profile_score, 1)
    }

async def get_benchmark_data(church_id: str, platform: str) -> dict:
    church = await db.churches.find_one({"_id": church_id})
    if not church:
        return {"avg_engagement_rate": 2.5, "avg_posts_per_week": 3.5, "sample_size": 0}
    
    denomination = church.get("denomination", "")
    size_category = "small"
    capacity = church.get("capacity", 0)
    if capacity > 500:
        size_category = "large"
    elif capacity > 150:
        size_category = "medium"
    
    pipeline = [
        {
            "$match": {
                "denomination": denomination,
                f"social_health.{platform}": {"$exists": True}
            }
        },
        {
            "$group": {
                "_id": None,
                "avg_engagement_rate": {"$avg": f"$social_health.{platform}.engagement_rate"},
                "avg_posts_per_week": {"$avg": f"$social_health.{platform}.posts_per_week"},
                "count": {"$sum": 1}
            }
        }
    ]
    
    result = await db.churches.aggregate(pipeline).to_list(1)
    
    if result and result[0]["count"] >= 3:
        return {
            "avg_engagement_rate": round(result[0]["avg_engagement_rate"], 2),
            "avg_posts_per_week": round(result[0]["avg_posts_per_week"], 1),
            "sample_size": result[0]["count"],
            "denomination": denomination,
            "size_category": size_category
        }
    
    platform_defaults = {
        "instagram": {"avg_engagement_rate": 2.8, "avg_posts_per_week": 4.2},
        "facebook": {"avg_engagement_rate": 1.5, "avg_posts_per_week": 5.1},
        "youtube": {"avg_engagement_rate": 3.2, "avg_posts_per_week": 1.2},
        "tiktok": {"avg_engagement_rate": 5.5, "avg_posts_per_week": 3.8}
    }
    
    defaults = platform_defaults.get(platform, {"avg_engagement_rate": 2.5, "avg_posts_per_week": 3.5})
    return {
        **defaults,
        "sample_size": 0,
        "denomination": denomination,
        "size_category": size_category
    }

async def get_ai_recommendations(scores: dict, benchmarks: dict, data: SocialHealthAnalysisRequest) -> list[str]:
    cache_key = f"social_health_recs_{data.church_id}_{data.platform}"
    cached = await db.cache.find_one({"_id": cache_key})
    
    if cached and cached.get("expires_at") > datetime.utcnow():
        return cached["recommendations"]
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return [
            "Increase posting frequency to at least 3 times per week for better visibility.",
            "Focus on creating more engaging content that encourages comments and shares.",
            "Complete your profile with all available features (stories, reels, bio link)."
        ]
    
    client = anthropic.Anthropic(api_key=api_key)
    
    prompt = f"""You are a social media expert for churches. Analyze this {data.platform.title()} performance:

Current Stats:
- Followers: {data.follower_count}
- Engagement Rate: {scores['engagement_rate']}%
- Posts per Week: {data.posts_per_week}
- Last Post: {data.last_post_days_ago} days ago
- Profile Complete: {data.profile_complete}
- Has Stories: {data.has_stories}
- Has Reels: {data.has_reels}
- Link in Bio: {data.link_in_bio}

Benchmark (similar churches):
- Average Engagement Rate: {benchmarks.get('avg_engagement_rate', 2.5)}%
- Average Posts per Week: {benchmarks.get('avg_posts_per_week', 3.5)}

Scores:
- Overall: {scores['overall_score']}/100
- Engagement: {scores['engagement_score']}/100
- Posting Consistency: {scores['posting_score']}/100
- Recency: {scores['recency_score']}/100
- Profile Completeness: {scores['profile_score']}/100

Provide exactly 3 specific, actionable recommendations to improve their {data.platform.title()} presence. Each recommendation should be 1-2 sentences, practical, and tailored to churches. Format as a numbered list."""
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        recommendations = []
        
        for line in response_text.split('\n'):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                clean_line = line.lstrip('0123456789.-•) ').strip()
                if clean_line:
                    recommendations.append(clean_line)
        
        if len(recommendations) < 3:
            recommendations = [
                "Increase posting frequency to at least 3 times per week for better visibility.",
                "Focus on creating more engaging content that encourages comments and shares.",
                "Complete your profile with all available features (stories, reels, bio link)."
            ]
        
        recommendations = recommendations[:3]
        
        await db.cache.update_one(
            {"_id": cache_key},
            {
                "$set": {
                    "recommendations": recommendations,
                    "expires_at": datetime.utcnow() + timedelta(days=7)
                }
            },
            upsert=True
        )
        
        return recommendations
        
    except Exception as e:
        print(f"AI recommendation error: {e}")
        return [
            "Increase posting frequency to at least 3 times per week for better visibility.",
            "Focus on creating more engaging content that encourages comments and shares.",
            "Complete your profile with all available features (stories, reels, bio link)."
        ]

@router.post("/social-health/analyse", response_model=SocialHealthAnalysisResponse)
async def analyse_social_health(data: SocialHealthAnalysisRequest, current_user: dict = Depends(get_current_user)):
    church = await db.churches.find_one({"_id": data.church_id})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    plan = church.get("subscription_plan", "free")
    if plan not in ["standard", "premium"]:
        raise HTTPException(status_code=403, detail="Social Health Check requires Standard or Premium plan")
    
    scores = calculate_social_health_scores(data)
    benchmarks = await get_benchmark_data(data.church_id, data.platform)
    recommendations = await get_ai_recommendations(scores, benchmarks, data)
    
    await db.churches.update_one(
        {"_id": data.church_id},
        {
            "$set": {
                f"social_health.{data.platform}": {
                    "follower_count": data.follower_count,
                    "posts_per_week": data.posts_per_week,
                    "engagement_rate": scores["engagement_rate"],
                    "last_updated": datetime.utcnow(),
                    "overall_score": scores["overall_score"]
                }
            }
        }
    )
    
    return SocialHealthAnalysisResponse(
        overall_score=scores["overall_score"],
        engagement_score=scores["engagement_score"],
        engagement_rate=scores["engagement_rate"],
        posting_score=scores["posting_score"],
        recency_score=scores["recency_score"],
        profile_score=scores["profile_score"],
        benchmarks=benchmarks,
        recommendations=recommendations,
        analysis_date=datetime.utcnow().isoformat()
    )
