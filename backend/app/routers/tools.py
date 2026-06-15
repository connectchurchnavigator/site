from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta
import anthropic
import os
from ..database import db
from ..dependencies import get_current_church

router = APIRouter(prefix="/tools", tags=["tools"])

class SocialHealthAnalysisRequest(BaseModel):
    church_id: str
    platform: Literal["instagram", "facebook", "youtube", "tiktok"]
    follower_count: int = Field(ge=0)
    posts_per_week: float = Field(ge=0, le=50)
    avg_likes: float = Field(ge=0)
    avg_comments: float = Field(ge=0)
    avg_shares: float = Field(ge=0, default=0)
    last_post_days_ago: int = Field(ge=0)
    has_stories: bool = False
    has_reels: bool = False
    profile_complete: bool = False
    link_in_bio: bool = False

class SocialHealthAnalysisResponse(BaseModel):
    overall_score: float
    engagement_score: float
    posting_score: float
    recency_score: float
    profile_score: float
    engagement_rate: float
    benchmark_engagement: Optional[float]
    benchmark_posting: Optional[float]
    recommendations: list[str]
    cached: bool

def calculate_scores(data: SocialHealthAnalysisRequest) -> dict:
    engagement_rate = 0
    if data.follower_count > 0:
        engagement_rate = ((data.avg_likes + data.avg_comments) / data.follower_count) * 100
    
    engagement_score = min(100, engagement_rate * 20)
    
    posting_score = 100 if data.posts_per_week >= 3 else data.posts_per_week * 33.33
    
    recency_score = 100 if data.last_post_days_ago <= 3 else max(0, 100 - (data.last_post_days_ago * 5))
    
    profile_points = sum([data.has_stories, data.has_reels, data.profile_complete, data.link_in_bio])
    profile_score = (profile_points / 4) * 100
    
    overall_score = (
        engagement_score * 0.4 +
        posting_score * 0.3 +
        recency_score * 0.2 +
        profile_score * 0.1
    )
    
    return {
        "engagement_rate": round(engagement_rate, 2),
        "engagement_score": round(engagement_score, 1),
        "posting_score": round(posting_score, 1),
        "recency_score": round(recency_score, 1),
        "profile_score": round(profile_score, 1),
        "overall_score": round(overall_score, 1)
    }

async def get_benchmarks(church_id: str, platform: str) -> dict:
    church = await db.churches.find_one({"_id": church_id})
    if not church:
        return {"benchmark_engagement": None, "benchmark_posting": None}
    
    denomination = church.get("denomination")
    size_category = "small"
    capacity = church.get("capacity", 0)
    if capacity > 200:
        size_category = "large"
    elif capacity > 100:
        size_category = "medium"
    
    pipeline = [
        {
            "$match": {
                "platform": platform,
                "church_id": {"$ne": church_id}
            }
        },
        {
            "$lookup": {
                "from": "churches",
                "localField": "church_id",
                "foreignField": "_id",
                "as": "church_info"
            }
        },
        {"$unwind": "$church_info"},
        {
            "$match": {
                "church_info.denomination": denomination
            }
        },
        {
            "$group": {
                "_id": None,
                "avg_engagement": {"$avg": "$engagement_rate"},
                "avg_posting": {"$avg": "$posts_per_week"}
            }
        }
    ]
    
    result = await db.social_health_analyses.aggregate(pipeline).to_list(1)
    
    if result:
        return {
            "benchmark_engagement": round(result[0].get("avg_engagement", 0), 2),
            "benchmark_posting": round(result[0].get("avg_posting", 0), 1)
        }
    
    return {"benchmark_engagement": None, "benchmark_posting": None}

async def get_ai_recommendations(data: SocialHealthAnalysisRequest, scores: dict, benchmarks: dict) -> list[str]:
    cache_key = f"{data.church_id}_{data.platform}_{datetime.utcnow().date()}"
    cached = await db.social_health_cache.find_one({"cache_key": cache_key})
    
    if cached and cached.get("recommendations"):
        return cached["recommendations"]
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    prompt = f"""You are a social media strategist for churches. Analyze this church's {data.platform} performance and give exactly 3 specific, actionable recommendations.

Current Stats:
- Followers: {data.follower_count}
- Posts per week: {data.posts_per_week}
- Engagement rate: {scores['engagement_rate']}%
- Last post: {data.last_post_days_ago} days ago
- Has stories: {data.has_stories}
- Has reels: {data.has_reels}
- Profile complete: {data.profile_complete}
- Link in bio: {data.link_in_bio}

Scores:
- Overall: {scores['overall_score']}/100
- Engagement: {scores['engagement_score']}/100
- Posting consistency: {scores['posting_score']}/100
- Recency: {scores['recency_score']}/100
- Profile: {scores['profile_score']}/100

Benchmark (similar churches):
- Average engagement: {benchmarks.get('benchmark_engagement', 'N/A')}%
- Average posting: {benchmarks.get('benchmark_posting', 'N/A')} posts/week

Provide 3 specific recommendations. Each should be 1-2 sentences, actionable, and tailored to this church's weakest areas. Format as a numbered list."""
    
    message = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    recommendations_text = message.content[0].text
    recommendations = [line.strip() for line in recommendations_text.split('\n') if line.strip() and line.strip()[0].isdigit()]
    recommendations = [rec.split('.', 1)[1].strip() if '.' in rec else rec for rec in recommendations[:3]]
    
    await db.social_health_cache.insert_one({
        "cache_key": cache_key,
        "recommendations": recommendations,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    })
    
    return recommendations

@router.post("/social-health/analyse", response_model=SocialHealthAnalysisResponse)
async def analyse_social_health(data: SocialHealthAnalysisRequest):
    scores = calculate_scores(data)
    benchmarks = await get_benchmarks(data.church_id, data.platform)
    
    cache_key = f"{data.church_id}_{data.platform}_{datetime.utcnow().date()}"
    cached = await db.social_health_cache.find_one({"cache_key": cache_key})
    
    if cached and cached.get("recommendations"):
        recommendations = cached["recommendations"]
        is_cached = True
    else:
        try:
            recommendations = await get_ai_recommendations(data, scores, benchmarks)
            is_cached = False
        except Exception as e:
            recommendations = [
                "Increase posting frequency to at least 3 times per week for consistent audience engagement.",
                "Focus on creating content that encourages comments and shares, such as questions or testimonials.",
                "Complete your profile with bio, story highlights, and clickable links to maximize discoverability."
            ]
            is_cached = False
    
    analysis_doc = {
        "church_id": data.church_id,
        "platform": data.platform,
        "follower_count": data.follower_count,
        "posts_per_week": data.posts_per_week,
        "engagement_rate": scores["engagement_rate"],
        "overall_score": scores["overall_score"],
        "created_at": datetime.utcnow()
    }
    await db.social_health_analyses.insert_one(analysis_doc)
    
    return SocialHealthAnalysisResponse(
        overall_score=scores["overall_score"],
        engagement_score=scores["engagement_score"],
        posting_score=scores["posting_score"],
        recency_score=scores["recency_score"],
        profile_score=scores["profile_score"],
        engagement_rate=scores["engagement_rate"],
        benchmark_engagement=benchmarks.get("benchmark_engagement"),
        benchmark_posting=benchmarks.get("benchmark_posting"),
        recommendations=recommendations,
        cached=is_cached
    )