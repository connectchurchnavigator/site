from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from ..auth import get_current_user
from ..database import db
import anthropic
import os
from collections import defaultdict
import json

router = APIRouter(prefix="/api/tools", tags=["tools"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not set")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def check_premium_plan(user: dict):
    if user.get("plan") != "premium":
        raise HTTPException(status_code=403, detail="Premium plan required")

def get_listing_analytics(listing_id: str, months: int = 12):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=months * 30)
    
    views = list(db.listing_views.find({
        "listing_id": listing_id,
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }).sort("timestamp", 1))
    
    events = list(db.events.find({
        "listing_id": listing_id,
        "start_date": {"$gte": start_date.isoformat()}
    }).sort("start_date", 1))
    
    social_stats = list(db.social_stats.find({
        "listing_id": listing_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1))
    
    content_activity = list(db.content_activity.find({
        "listing_id": listing_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", 1))
    
    return {
        "views": views,
        "events": events,
        "social_stats": social_stats,
        "content_activity": content_activity,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat()
    }

def aggregate_patterns(analytics: dict):
    views = analytics["views"]
    events = analytics["events"]
    content = analytics["content_activity"]
    
    month_views = defaultdict(int)
    day_views = defaultdict(int)
    event_impact = []
    content_performance = defaultdict(lambda: {"count": 0, "views": 0, "engagement": 0})
    
    for view in views:
        dt = view["timestamp"]
        month_views[dt.month] += 1
        day_views[dt.strftime("%A")] += 1
    
    for event in events:
        event_date = datetime.fromisoformat(event["start_date"])
        week_before = event_date - timedelta(days=7)
        week_after = event_date + timedelta(days=7)
        
        before_views = sum(1 for v in views if week_before <= v["timestamp"] < event_date)
        after_views = sum(1 for v in views if event_date <= v["timestamp"] < week_after)
        
        if before_views > 0:
            impact = ((after_views - before_views) / before_views) * 100
            event_impact.append({"event": event["title"], "impact": impact, "date": event["start_date"]})
    
    for item in content:
        ctype = item.get("type", "unknown")
        content_performance[ctype]["count"] += 1
        content_performance[ctype]["views"] += item.get("views", 0)
        content_performance[ctype]["engagement"] += item.get("engagement", 0)
    
    avg_views = sum(month_views.values()) / 12 if month_views else 1
    seasonal_multipliers = [{"month": m, "multiplier": round(month_views[m] / avg_views, 2)} for m in range(1, 13)]
    
    best_month = max(month_views.items(), key=lambda x: x[1])[0] if month_views else 1
    worst_month = min(month_views.items(), key=lambda x: x[1])[0] if month_views else 1
    best_day = max(day_views.items(), key=lambda x: x[1])[0] if day_views else "Monday"
    
    content_perf = [{
        "type": k,
        "avg_views": round(v["views"] / v["count"], 1) if v["count"] > 0 else 0,
        "avg_engagement": round(v["engagement"] / v["count"], 1) if v["count"] > 0 else 0,
        "count": v["count"]
    } for k, v in content_performance.items()]
    
    content_perf.sort(key=lambda x: x["avg_views"], reverse=True)
    
    return {
        "best_month_of_year": best_month,
        "worst_month": worst_month,
        "best_day_of_week": best_day,
        "seasonal_multipliers": seasonal_multipliers,
        "event_impact_avg": round(sum(e["impact"] for e in event_impact) / len(event_impact), 1) if event_impact else 0,
        "event_impacts": event_impact[:5],
        "content_performance": content_perf,
        "total_views": len(views),
        "total_events": len(events)
    }

def generate_ai_briefing(listing_id: str, analytics: dict, patterns: dict):
    prompt = f"""You are an AI marketing analyst for church listings.

Analyze this 12-month data and produce a strategic briefing:

VIEWS DATA:
- Total views: {patterns['total_views']}
- Best month: {patterns['best_month_of_year']}
- Worst month: {patterns['worst_month']}
- Best day: {patterns['best_day_of_week']}

EVENTS DATA:
- Total events: {patterns['total_events']}
- Average event impact: {patterns['event_impact_avg']}% view increase
- Top events: {json.dumps(patterns['event_impacts'][:3])}

CONTENT PERFORMANCE:
{json.dumps(patterns['content_performance'][:5], indent=2)}

SEASONAL PATTERNS:
{json.dumps(patterns['seasonal_multipliers'], indent=2)}

Provide:
1. What's Working (3 specific insights)
2. What's Not Working (3 gaps or missed opportunities)
3. This Week's Opportunity (1 actionable recommendation)
4. Seasonal Patterns (explain the data)
5. Event Correlation (what events drive engagement)
6. Content Patterns (what content works best)
7. AI Briefing (500-word strategic narrative)

Return ONLY valid JSON with these exact keys:
{{
  "what_is_working": ["insight1", "insight2", "insight3"],
  "what_is_not_working": ["gap1", "gap2", "gap3"],
  "this_week_opportunity": "specific action",
  "seasonal_patterns": "explanation",
  "event_correlation": "explanation",
  "content_patterns": "explanation",
  "ai_briefing_text": "full 500-word briefing"
}}"""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    briefing = json.loads(response.content[0].text)
    briefing["generated_at"] = datetime.utcnow().isoformat()
    briefing["listing_id"] = listing_id
    
    return briefing

@router.post("/intelligence/{listing_id}/briefing")
async def create_intelligence_briefing(
    listing_id: str,
    regenerate: bool = False,
    user: dict = Depends(get_current_user)
):
    check_premium_plan(user)
    
    listing = db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["owner_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not regenerate:
        cached = db.ai_briefings.find_one({
            "listing_id": listing_id,
            "generated_at": {"$gte": (datetime.utcnow() - timedelta(days=7)).isoformat()}
        })
        if cached:
            cached["_id"] = str(cached["_id"])
            return cached
    
    analytics = get_listing_analytics(listing_id)
    patterns = aggregate_patterns(analytics)
    briefing = generate_ai_briefing(listing_id, analytics, patterns)
    
    db.ai_briefings.insert_one(briefing)
    briefing["_id"] = str(briefing["_id"])
    
    return briefing

@router.get("/intelligence/{listing_id}/patterns")
async def get_intelligence_patterns(
    listing_id: str,
    user: dict = Depends(get_current_user)
):
    check_premium_plan(user)
    
    listing = db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["owner_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_listing_analytics(listing_id)
    patterns = aggregate_patterns(analytics)
    
    daily_views = defaultdict(int)
    for view in analytics["views"]:
        date_key = view["timestamp"].strftime("%Y-%m-%d")
        daily_views[date_key] += 1
    
    patterns["daily_views"] = [{"date": k, "views": v} for k, v in sorted(daily_views.items())]
    
    return patterns

@router.get("/intelligence/{listing_id}/briefing/latest")
async def get_latest_briefing(
    listing_id: str,
    user: dict = Depends(get_current_user)
):
    check_premium_plan(user)
    
    listing = db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["owner_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cached = db.ai_briefings.find_one(
        {"listing_id": listing_id},
        sort=[("generated_at", -1)]
    )
    
    if cached and (datetime.utcnow() - datetime.fromisoformat(cached["generated_at"])).days < 7:
        cached["_id"] = str(cached["_id"])
        return cached
    
    analytics = get_listing_analytics(listing_id)
    patterns = aggregate_patterns(analytics)
    briefing = generate_ai_briefing(listing_id, analytics, patterns)
    
    db.ai_briefings.insert_one(briefing)
    briefing["_id"] = str(briefing["_id"])
    
    return briefing

@router.post("/intelligence/{listing_id}/ask")
async def ask_ai_question(
    listing_id: str,
    question: dict,
    user: dict = Depends(get_current_user)
):
    check_premium_plan(user)
    
    listing = db.listings.find_one({"_id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if str(listing["owner_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_listing_analytics(listing_id)
    patterns = aggregate_patterns(analytics)
    
    prompt = f"""You are an AI analyst for church listings. Answer this question using the data:

QUESTION: {question.get('query', '')}

DATA AVAILABLE:
{json.dumps(patterns, indent=2)}

Provide a clear, actionable answer in plain English (2-3 paragraphs)."""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return {"answer": response.content[0].text, "timestamp": datetime.utcnow().isoformat()}
