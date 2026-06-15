from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timedelta
import os
from anthropic import Anthropic
from motor.motor_asyncio import AsyncIOMotorClient
from backend.database import get_database

router = APIRouter(prefix="/tools", tags=["tools"])

class SocialHealthInput(BaseModel):
    church_id: str
    platform: Literal["instagram", "facebook", "youtube", "tiktok"]
    follower_count: int = Field(ge=0)
    posts_per_week: float = Field(ge=0, le=50)
    avg_likes: int = Field(ge=0)
    avg_comments: int = Field(ge=0)
    avg_shares: int = Field(ge=0, default=0)
    last_post_days_ago: int = Field(ge=0)
    has_stories: bool = False
    has_reels: bool = False
    profile_complete: bool
    link_in_bio: bool

class MetricScore(BaseModel):
    score: float
    label: str
    description: str

class BenchmarkData(BaseModel):
    your_value: float
    peer_average: float
    label: str

class SocialHealthResponse(BaseModel):
    overall_score: float
    metrics: dict[str, MetricScore]
    benchmarks: list[BenchmarkData]
    recommendations: list[str]
    analysis_date: str

def calculate_engagement_rate(avg_likes: int, avg_comments: int, follower_count: int) -> float:
    if follower_count == 0:
        return 0.0
    return ((avg_likes + avg_comments) / follower_count) * 100

def calculate_posting_score(posts_per_week: float) -> float:
    if posts_per_week >= 3:
        return 100.0
    return posts_per_week * 33.33

def calculate_recency_score(last_post_days_ago: int) -> float:
    if last_post_days_ago <= 3:
        return 100.0
    return max(0.0, 100.0 - (last_post_days_ago * 5))

def calculate_profile_score(has_stories: bool, has_reels: bool, profile_complete: bool, link_in_bio: bool) -> float:
    score = 0
    if has_stories:
        score += 25
    if has_reels:
        score += 25
    if profile_complete:
        score += 25
    if link_in_bio:
        score += 25
    return float(score)

def calculate_overall_score(engagement_rate: float, posting_score: float, recency_score: float, profile_score: float) -> float:
    engagement_weight = 0.40
    posting_weight = 0.30
    recency_weight = 0.20
    profile_weight = 0.10
    
    engagement_normalized = min(100, engagement_rate * 20)
    
    overall = (
        (engagement_normalized * engagement_weight) +
        (posting_score * posting_weight) +
        (recency_score * recency_weight) +
        (profile_score * profile_weight)
    )
    return round(overall, 1)

async def get_peer_benchmarks(db, church_id: str, platform: str, data: SocialHealthInput):
    church = await db.churches.find_one({"_id": church_id})
    if not church:
        return None
    
    denomination = church.get("denomination", "")
    size_category = "small"
    if church.get("congregation_size", 0) > 200:
        size_category = "medium"
    if church.get("congregation_size", 0) > 500:
        size_category = "large"
    
    pipeline = [
        {
            "$match": {
                "denomination": denomination,
                f"social_health_cache.{platform}": {"$exists": True}
            }
        },
        {
            "$project": {
                "engagement_rate": f"$social_health_cache.{platform}.engagement_rate",
                "posts_per_week": f"$social_health_cache.{platform}.posts_per_week"
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
    
    result = await db.churches.aggregate(pipeline).to_list(1)
    
    if result and result[0]:
        peer_engagement = result[0].get("avg_engagement", 2.5)
        peer_posting = result[0].get("avg_posting", 2.0)
    else:
        peer_engagement = 2.5
        peer_posting = 2.0
    
    user_engagement = calculate_engagement_rate(data.avg_likes, data.avg_comments, data.follower_count)
    
    return [
        BenchmarkData(
            your_value=round(user_engagement, 2),
            peer_average=round(peer_engagement, 2),
            label=f"Engagement Rate (vs {denomination or 'other'} churches)"
        ),
        BenchmarkData(
            your_value=round(data.posts_per_week, 1),
            peer_average=round(peer_posting, 1),
            label="Posts Per Week (vs peers)"
        )
    ]

async def get_ai_recommendations(data: SocialHealthInput, metrics: dict, benchmarks: list[BenchmarkData], db, church_id: str, platform: str) -> list[str]:
    cache_key = f"{church_id}_{platform}"
    cache_expiry = datetime.utcnow() - timedelta(days=7)
    
    cached = await db.social_health_recommendations.find_one({
        "cache_key": cache_key,
        "created_at": {"$gte": cache_expiry}
    })
    
    if cached:
        return cached.get("recommendations", [])
    
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        return [
            f"Increase posting frequency to at least 3 times per week (currently {data.posts_per_week})",
            "Complete your profile with stories, reels, and bio link for maximum reach",
            "Engage with your audience more to boost likes and comments"
        ]
    
    client = Anthropic(api_key=anthropic_key)
    
    prompt = f"""You are a social media expert for churches. Analyze this {platform} performance and give exactly 3 specific, actionable recommendations.

Stats:
- Followers: {data.follower_count}
- Posts per week: {data.posts_per_week}
- Avg likes: {data.avg_likes}
- Avg comments: {data.avg_comments}
- Last post: {data.last_post_days_ago} days ago
- Has stories: {data.has_stories}
- Has reels: {data.has_reels}
- Profile complete: {data.profile_complete}
- Link in bio: {data.link_in_bio}

Scores:
- Engagement: {metrics['engagement'].score}/100
- Posting: {metrics['posting'].score}/100
- Recency: {metrics['recency'].score}/100
- Profile: {metrics['profile'].score}/100

Benchmarks:
{benchmarks[0].label}: You {benchmarks[0].your_value}% vs peers {benchmarks[0].peer_average}%
{benchmarks[1].label}: You {benchmarks[1].your_value} vs peers {benchmarks[1].peer_average}

Provide 3 specific recommendations. Each should be one sentence, actionable, and reference specific numbers from above. Format as a simple list, one per line."""
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        recommendations = [line.strip().lstrip('123456789.-) ') for line in response_text.split('\n') if line.strip()]
        recommendations = [r for r in recommendations if len(r) > 10][:3]
        
        if len(recommendations) < 3:
            recommendations = [
                f"Increase posting frequency to at least 3 times per week (currently {data.posts_per_week})",
                "Complete your profile with stories, reels, and bio link for maximum reach",
                "Engage with your audience more to boost likes and comments"
            ]
        
        await db.social_health_recommendations.insert_one({
            "cache_key": cache_key,
            "recommendations": recommendations,
            "created_at": datetime.utcnow()
        })
        
        return recommendations
        
    except Exception as e:
        print(f"Haiku API error: {e}")
        return [
            f"Increase posting frequency to at least 3 times per week (currently {data.posts_per_week})",
            "Complete your profile with stories, reels, and bio link for maximum reach",
            "Engage with your audience more to boost likes and comments"
        ]

@router.post("/social-health/analyse", response_model=SocialHealthResponse)
async def analyse_social_health(data: SocialHealthInput, db = Depends(get_database)):
    try:
        engagement_rate = calculate_engagement_rate(data.avg_likes, data.avg_comments, data.follower_count)
        posting_score = calculate_posting_score(data.posts_per_week)
        recency_score = calculate_recency_score(data.last_post_days_ago)
        profile_score = calculate_profile_score(data.has_stories, data.has_reels, data.profile_complete, data.link_in_bio)
        
        overall_score = calculate_overall_score(engagement_rate, posting_score, recency_score, profile_score)
        
        metrics = {
            "engagement": MetricScore(
                score=round(min(100, engagement_rate * 20), 1),
                label="Engagement Rate",
                description=f"{round(engagement_rate, 2)}% of followers engage"
            ),
            "posting": MetricScore(
                score=round(posting_score, 1),
                label="Posting Consistency",
                description=f"{data.posts_per_week} posts per week"
            ),
            "recency": MetricScore(
                score=round(recency_score, 1),
                label="Content Freshness",
                description=f"Last post {data.last_post_days_ago} days ago"
            ),
            "profile": MetricScore(
                score=round(profile_score, 1),
                label="Profile Completeness",
                description=f"{int(profile_score)}% profile optimized"
            )
        }
        
        benchmarks = await get_peer_benchmarks(db, data.church_id, data.platform, data)
        if not benchmarks:
            benchmarks = [
                BenchmarkData(your_value=round(engagement_rate, 2), peer_average=2.5, label="Engagement Rate (vs peers)"),
                BenchmarkData(your_value=round(data.posts_per_week, 1), peer_average=2.0, label="Posts Per Week (vs peers)")
            ]
        
        recommendations = await get_ai_recommendations(data, metrics, benchmarks, db, data.church_id, data.platform)
        
        await db.churches.update_one(
            {"_id": data.church_id},
            {
                "$set": {
                    f"social_health_cache.{data.platform}": {
                        "engagement_rate": engagement_rate,
                        "posts_per_week": data.posts_per_week,
                        "overall_score": overall_score,
                        "updated_at": datetime.utcnow()
                    }
                }
            }
        )
        
        return SocialHealthResponse(
            overall_score=overall_score,
            metrics=metrics,
            benchmarks=benchmarks,
            recommendations=recommendations,
            analysis_date=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
