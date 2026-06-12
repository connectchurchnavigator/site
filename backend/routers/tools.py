from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import anthropic
import os
from ..database import db
from ..auth import get_current_user, require_plan

router = APIRouter(prefix="/api/tools", tags=["tools"])

class SocialStats(BaseModel):
    listing_id: str
    facebook: Optional[Dict[str, Any]] = None
    instagram: Optional[Dict[str, Any]] = None
    youtube: Optional[Dict[str, Any]] = None
    twitter: Optional[Dict[str, Any]] = None
    whatsapp: Optional[Dict[str, Any]] = None
    last_synced: datetime

class AIAnalysis(BaseModel):
    best_platform: str
    weakest_platform: str
    best_time: str
    top_post: Dict[str, str]
    worst_post: Dict[str, str]
    recommendation: str

@router.get("/social/{listing_id}")
async def get_social_stats(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
    plan_check: bool = Depends(require_plan("standard"))
):
    stats = await db.social_stats.find_one({"listing_id": listing_id})
    if not stats:
        raise HTTPException(status_code=404, detail="Social stats not found")
    
    stats["_id"] = str(stats["_id"])
    return stats

@router.post("/social/{listing_id}/sync")
async def sync_social_stats(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    listing = await db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.get("owner_id") != current_user.get("user_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    social_data = {
        "listing_id": listing_id,
        "facebook": {
            "followers": listing.get("social", {}).get("facebook_followers", 0),
            "page_likes": listing.get("social", {}).get("facebook_likes", 0),
            "reach_this_month": listing.get("social", {}).get("facebook_reach", 0),
            "top_post": listing.get("social", {}).get("facebook_top_post", {})
        },
        "instagram": {
            "followers": listing.get("social", {}).get("instagram_followers", 0),
            "engagement_rate": listing.get("social", {}).get("instagram_engagement", 0.0),
            "posts_this_month": listing.get("social", {}).get("instagram_posts", 0),
            "top_post": listing.get("social", {}).get("instagram_top_post", {})
        },
        "youtube": {
            "subscribers": listing.get("social", {}).get("youtube_subscribers", 0),
            "views_this_month": listing.get("social", {}).get("youtube_views", 0),
            "top_video": listing.get("social", {}).get("youtube_top_video", {}),
            "avg_watch_time": listing.get("social", {}).get("youtube_watch_time", 0)
        },
        "twitter": {
            "followers": listing.get("social", {}).get("twitter_followers", 0),
            "impressions_this_month": listing.get("social", {}).get("twitter_impressions", 0)
        },
        "whatsapp": {
            "group_size": listing.get("social", {}).get("whatsapp_members", 0)
        },
        "last_synced": datetime.utcnow()
    }
    
    await db.social_stats.update_one(
        {"listing_id": listing_id},
        {"$set": social_data},
        upsert=True
    )
    
    return {"status": "synced", "data": social_data}

@router.post("/social/{listing_id}/analyse")
async def analyse_social(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
    plan_check: bool = Depends(require_plan("standard"))
):
    stats = await db.social_stats.find_one({"listing_id": listing_id})
    if not stats:
        raise HTTPException(status_code=404, detail="Social stats not found")
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    prompt = f"""Analyse this church's social media data and provide insights:

Facebook: {stats.get('facebook', {}).get('followers', 0)} followers, {stats.get('facebook', {}).get('reach_this_month', 0)} reach
Instagram: {stats.get('instagram', {}).get('followers', 0)} followers, {stats.get('instagram', {}).get('engagement_rate', 0)}% engagement
YouTube: {stats.get('youtube', {}).get('subscribers', 0)} subscribers, {stats.get('youtube', {}).get('views_this_month', 0)} views
Twitter: {stats.get('twitter', {}).get('followers', 0)} followers, {stats.get('twitter', {}).get('impressions_this_month', 0)} impressions
WhatsApp: {stats.get('whatsapp', {}).get('group_size', 0)} members

Top posts:
Facebook: {stats.get('facebook', {}).get('top_post', {})}
Instagram: {stats.get('instagram', {}).get('top_post', {})}

Return JSON with:
- best_platform: which platform performs best
- weakest_platform: which needs improvement
- best_time: optimal posting time based on engagement
- top_post: {{"platform": "...", "why": "...", "text": "..."}}
- worst_post: {{"platform": "...", "why": "...", "text": "..."}}
- recommendation: one specific actionable tip"""
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    
    import json
    analysis = json.loads(message.content[0].text)
    
    return analysis
