from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import statistics
from models.user import User
from models.listing import Listing
from dependencies import get_current_user, require_premium_or_network
from database import db

router = APIRouter(prefix="/api/tools", tags=["tools"])

@router.get("/benchmarks/{listing_id}")
async def get_benchmarks(listing_id: str, current_user: User = Depends(require_premium_or_network)):
    listing = await db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing["owner_id"] != current_user.id and current_user.plan not in ["network", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    denomination = listing.get("denomination", "")
    city = listing.get("address", {}).get("city", "")
    
    category_filter = {"denomination": denomination}
    if city:
        category_filter["address.city"] = city
    
    category_listings = await db.listings.find(category_filter).to_list(length=None)
    
    if len(category_listings) < 3:
        category_listings = await db.listings.find({"denomination": denomination}).to_list(length=None)
    
    your_metrics = {
        "views": listing.get("analytics", {}).get("total_views", 0),
        "health_score": listing.get("health_score", 0),
        "followers": listing.get("followers_count", 0),
        "engagement": listing.get("analytics", {}).get("engagement_rate", 0)
    }
    
    all_metrics = []
    for l in category_listings:
        all_metrics.append({
            "id": l["_id"],
            "views": l.get("analytics", {}).get("total_views", 0),
            "health_score": l.get("health_score", 0),
            "followers": l.get("followers_count", 0),
            "engagement": l.get("analytics", {}).get("engagement_rate", 0),
            "sermon_videos": len(l.get("media", {}).get("sermon_videos", [])),
            "events_count": await db.events.count_documents({"listing_id": l["_id"], "start_date": {"$gte": datetime.utcnow()}}),
            "instagram_posts": l.get("social", {}).get("instagram_posts_per_week", 0)
        })
    
    sorted_by_health = sorted(all_metrics, key=lambda x: x["health_score"], reverse=True)
    your_rank = next((i + 1 for i, m in enumerate(sorted_by_health) if m["id"] == listing_id), len(sorted_by_health))
    percentile = round((len(sorted_by_health) - your_rank) / len(sorted_by_health) * 100)
    
    category_avg = {
        "views": round(statistics.mean([m["views"] for m in all_metrics])),
        "health_score": round(statistics.mean([m["health_score"] for m in all_metrics])),
        "followers": round(statistics.mean([m["followers"] for m in all_metrics])),
        "engagement": round(statistics.mean([m["engagement"] for m in all_metrics]), 1)
    }
    
    top_quartile_count = max(1, len(all_metrics) // 4)
    top_performers = sorted_by_health[:top_quartile_count]
    
    top_quartile = {
        "views": round(statistics.mean([m["views"] for m in top_performers])),
        "health_score": round(statistics.mean([m["health_score"] for m in top_performers])),
        "followers": round(statistics.mean([m["followers"] for m in top_performers])),
        "engagement": round(statistics.mean([m["engagement"] for m in top_performers]), 1)
    }
    
    your_sermon_videos = len(listing.get("media", {}).get("sermon_videos", []))
    your_events = await db.events.count_documents({"listing_id": listing_id, "start_date": {"$gte": datetime.utcnow()}})
    your_instagram = listing.get("social", {}).get("instagram_posts_per_week", 0)
    
    top_sermon_avg = round(statistics.mean([m["sermon_videos"] for m in top_performers]))
    top_events_avg = round(statistics.mean([m["events_count"] for m in top_performers]), 1)
    top_instagram_avg = round(statistics.mean([m["instagram_posts"] for m in top_performers]), 1)
    
    gap_analysis = []
    if top_sermon_avg > your_sermon_videos:
        gap_analysis.append({
            "metric": "sermon_videos",
            "you": your_sermon_videos,
            "top_performers_avg": top_sermon_avg,
            "impact": "4x more followers"
        })
    if top_events_avg > your_events:
        gap_analysis.append({
            "metric": "events_per_month",
            "you": your_events,
            "top_performers_avg": top_events_avg,
            "impact": "340% more views"
        })
    if top_instagram_avg > your_instagram:
        gap_analysis.append({
            "metric": "instagram_posts_per_week",
            "you": your_instagram,
            "top_performers_avg": top_instagram_avg,
            "impact": "2.5x more engagement"
        })
    
    top_performer_actions = []
    if top_instagram_avg >= 3:
        top_performer_actions.append("Post on Instagram 3x per week")
    if top_sermon_avg >= 1:
        top_performer_actions.append("Add new sermon video monthly")
    if top_events_avg >= 1:
        top_performer_actions.append("Create events 4+ weeks in advance")
    
    return {
        "your_rank": your_rank,
        "total_in_category": len(category_listings),
        "percentile": percentile,
        "category_description": f"{denomination} churches" + (f" in {city}" if city else ""),
        "your_metrics": your_metrics,
        "category_avg": category_avg,
        "top_quartile": top_quartile,
        "gap_analysis": gap_analysis,
        "top_performer_actions": top_performer_actions
    }

@router.get("/benchmarks/{listing_id}/network")
async def get_network_benchmarks(listing_id: str, current_user: User = Depends(require_premium_or_network)):
    parent_listing = await db.listings.find_one({"_id": listing_id})
    if not parent_listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if parent_listing["owner_id"] != current_user.id or current_user.plan != "network":
        raise HTTPException(status_code=403, detail="Network plan required")
    
    branches = await db.listings.find({"parent_listing_id": listing_id}).to_list(length=None)
    
    if not branches:
        raise HTTPException(status_code=404, detail="No branches found")
    
    branch_data = []
    for branch in branches:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        current_views = await db.analytics.count_documents({
            "listing_id": branch["_id"],
            "timestamp": {"$gte": thirty_days_ago}
        })
        previous_views = await db.analytics.count_documents({
            "listing_id": branch["_id"],
            "timestamp": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
        })
        
        growth_rate = 0
        if previous_views > 0:
            growth_rate = round(((current_views - previous_views) / previous_views) * 100, 1)
        
        branch_data.append({
            "branch_id": branch["_id"],
            "branch_name": branch["name"],
            "health_score": branch.get("health_score", 0),
            "total_views": branch.get("analytics", {}).get("total_views", 0),
            "followers": branch.get("followers_count", 0),
            "growth_rate": growth_rate,
            "current_month_views": current_views
        })
    
    sorted_by_health = sorted(branch_data, key=lambda x: x["health_score"], reverse=True)
    sorted_by_views = sorted(branch_data, key=lambda x: x["total_views"], reverse=True)
    sorted_by_growth = sorted(branch_data, key=lambda x: x["growth_rate"], reverse=True)
    
    fastest_growing = sorted_by_growth[0] if sorted_by_growth else None
    needs_attention = sorted_by_health[-1] if sorted_by_health else None
    
    network_totals = {
        "total_views": sum([b["total_views"] for b in branch_data]),
        "total_followers": sum([b["followers"] for b in branch_data]),
        "avg_health_score": round(statistics.mean([b["health_score"] for b in branch_data])),
        "total_branches": len(branch_data)
    }
    
    return {
        "branches": branch_data,
        "health_ranking": sorted_by_health,
        "views_ranking": sorted_by_views,
        "fastest_growing": fastest_growing,
        "needs_attention": needs_attention,
        "network_totals": network_totals
    }
