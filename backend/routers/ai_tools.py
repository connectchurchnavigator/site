from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import anthropic
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json

router = APIRouter(prefix="/api/tools", tags=["AI Tools"])

MONGO_URI = os.getenv("MONGO_URI")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

client = AsyncIOMotorClient(MONGO_URI)
db = client["ChurchNavigator" if os.getenv("ENV") == "production" else "DEV-ChurchNavigator"]
churches_col = db["churches"]
visitors_col = db["visitors"]
events_col = db["events"]
reviews_col = db["reviews"]
cache_col = db["ai_tool_cache"]

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

async def check_premium_subscription(church_slug: str) -> dict:
    church = await churches_col.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    subscription = church.get("subscription", {})
    if subscription.get("tier") not in ["premium", "enterprise"]:
        raise HTTPException(
            status_code=402,
            detail={
                "message": "This tool requires a Premium subscription (£19/month)",
                "upgrade_url": "/pricing",
                "required_tier": "premium"
            }
        )
    
    if subscription.get("status") != "active":
        raise HTTPException(status_code=402, detail="Subscription inactive")
    
    return church

@router.post("/pattern-intelligence/{church_slug}")
async def pattern_intelligence(church_slug: str, force_refresh: bool = False):
    church = await check_premium_subscription(church_slug)
    
    cache_key = f"pattern_intelligence:{church_slug}"
    if not force_refresh:
        cached = await cache_col.find_one({
            "key": cache_key,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        if cached:
            return cached["data"]
    
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    
    visitors = await visitors_col.count_documents({
        "church_id": church["_id"],
        "visit_date": {"$gte": ninety_days_ago}
    })
    
    visitor_timeline = await visitors_col.aggregate([
        {"$match": {"church_id": church["_id"], "visit_date": {"$gte": ninety_days_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%U", "date": "$visit_date"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]).to_list(None)
    
    events = await events_col.aggregate([
        {"$match": {"church_id": church["_id"], "event_date": {"$gte": ninety_days_ago}}},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1},
            "avg_rsvps": {"$avg": "$rsvp_count"}
        }}
    ]).to_list(None)
    
    reviews = await reviews_col.aggregate([
        {"$match": {"church_id": church["_id"]}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]).to_list(None)
    
    profile_views = church.get("analytics", {}).get("profile_views", [])
    recent_views = [v for v in profile_views if v.get("date") and datetime.fromisoformat(v["date"]) >= ninety_days_ago]
    
    follower_history = church.get("analytics", {}).get("follower_history", [])
    recent_followers = [f for f in follower_history if f.get("date") and datetime.fromisoformat(f["date"]) >= ninety_days_ago]
    
    data_summary = {
        "church_name": church["name"],
        "denomination": church.get("denomination", "Unknown"),
        "congregation_size": church.get("congregation_size", "Unknown"),
        "visitor_count_90d": visitors,
        "visitor_weekly_trend": [f"Week {v['_id']}: {v['count']} visitors" for v in visitor_timeline],
        "events_by_type": [{"type": e["_id"], "count": e["count"], "avg_rsvps": round(e.get("avg_rsvps", 0), 1)} for e in events],
        "avg_rating": round(reviews[0]["avg_rating"], 2) if reviews else None,
        "review_count": reviews[0]["count"] if reviews else 0,
        "profile_views_90d": len(recent_views),
        "follower_growth_90d": len(recent_followers),
        "current_followers": church.get("follower_count", 0)
    }
    
    prompt = f"""You are a church growth analyst with 20 years of experience. Analyse this church's data from the last 90 days and identify exactly 3 non-obvious patterns that a busy pastor might miss.

Church Data:
{json.dumps(data_summary, indent=2)}

For each of the 3 patterns, provide:
1. PATTERN: What specific pattern do you see in the data?
2. WHY IT MATTERS: Why is this significant for church growth?
3. ACTION: One specific, actionable step the church can take this week.

Focus on patterns that:
- Connect multiple data points (e.g., visitor trends + events + engagement)
- Reveal timing insights (when things happen matters)
- Show hidden opportunities or risks
- Are specific to THIS church's data, not generic advice

Return ONLY valid JSON in this exact format:
{{
  "patterns": [
    {{
      "title": "Short descriptive title",
      "pattern": "What you observed",
      "why_it_matters": "Significance",
      "action": "Specific action to take",
      "confidence": "high|medium|low",
      "data_points": ["metric1", "metric2"]
    }}
  ]
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        analysis = json.loads(content)
        
        result = {
            "church_slug": church_slug,
            "generated_at": datetime.utcnow().isoformat(),
            "data_period": "Last 90 days",
            "patterns": analysis.get("patterns", []),
            "data_summary": data_summary
        }
        
        await cache_col.update_one(
            {"key": cache_key},
            {"$set": {
                "key": cache_key,
                "data": result,
                "expires_at": datetime.utcnow() + timedelta(hours=24)
            }},
            upsert=True
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/churn-analysis/{church_slug}")
async def churn_analysis(church_slug: str, force_refresh: bool = False):
    church = await check_premium_subscription(church_slug)
    
    cache_key = f"churn_analysis:{church_slug}"
    if not force_refresh:
        cached = await cache_col.find_one({
            "key": cache_key,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        if cached:
            return cached["data"]
    
    at_risk_visitors = await visitors_col.find({
        "church_id": church["_id"],
        "is_at_risk": True
    }).limit(20).to_list(20)
    
    if not at_risk_visitors:
        return {
            "church_slug": church_slug,
            "at_risk_count": 0,
            "analyses": [],
            "message": "No at-risk visitors identified"
        }
    
    visitor_batches = []
    for visitor in at_risk_visitors:
        visit_history = visitor.get("visit_history", [])
        if visit_history:
            last_visit = max([v.get("date") for v in visit_history if v.get("date")], default=None)
            days_since = (datetime.utcnow() - last_visit).days if last_visit else 999
        else:
            days_since = 999
        
        visitor_batches.append({
            "visitor_id": str(visitor["_id"]),
            "name": visitor.get("name", "Anonymous"),
            "visits": len(visit_history),
            "last_visit_days_ago": days_since,
            "visit_pattern": [v.get("date").strftime("%Y-%m-%d") if v.get("date") else "unknown" for v in visit_history[-5:]]
        })
    
    prompt = f"""You are a pastoral care expert. Analyse why these visitors likely stopped attending and suggest brief re-engagement messages.

Visitors:
{json.dumps(visitor_batches, indent=2)}

For EACH visitor, provide:
1. Most likely reason they stopped coming (based on their visit pattern)
2. A re-engagement message under 3 sentences that feels personal and genuine

Return ONLY valid JSON:
{{
  "analyses": [
    {{
      "visitor_id": "id",
      "likely_reason": "reason",
      "message": "re-engagement message",
      "confidence": "high|medium|low"
    }}
  ]
}}"""
    
    try:
        response = anthropic_client.messages.create(
            model="claude-haiku-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        analysis = json.loads(content)
        
        analyses_with_names = []
        for a in analysis.get("analyses", []):
            visitor_data = next((v for v in visitor_batches if v["visitor_id"] == a["visitor_id"]), {})
            analyses_with_names.append({
                **a,
                "name": visitor_data.get("name", "Anonymous"),
                "visits": visitor_data.get("visits", 0),
                "last_visit_days_ago": visitor_data.get("last_visit_days_ago", 999)
            })
        
        for a in analyses_with_names:
            await visitors_col.update_one(
                {"_id": ObjectId(a["visitor_id"])},
                {"$set": {
                    "churn_analysis": {
                        "reason": a["likely_reason"],
                        "message": a["message"],
                        "analysed_at": datetime.utcnow()
                    }
                }}
            )
        
        journey_funnel = await calculate_journey_funnel(church["_id"])
        
        result = {
            "church_slug": church_slug,
            "generated_at": datetime.utcnow().isoformat(),
            "at_risk_count": len(at_risk_visitors),
            "analyses": analyses_with_names,
            "journey_funnel": journey_funnel
        }
        
        await cache_col.update_one(
            {"key": cache_key},
            {"$set": {
                "key": cache_key,
                "data": result,
                "expires_at": datetime.utcnow() + timedelta(days=7)
            }},
            upsert=True
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Churn analysis failed: {str(e)}")

async def calculate_journey_funnel(church_id: ObjectId) -> dict:
    total_visitors = await visitors_col.count_documents({"church_id": church_id})
    first_time = await visitors_col.count_documents({"church_id": church_id, "visit_count": 1})
    returning = await visitors_col.count_documents({"church_id": church_id, "visit_count": {"$gte": 2}})
    engaged = await visitors_col.count_documents({"church_id": church_id, "visit_count": {"$gte": 5}})
    regular = await visitors_col.count_documents({"church_id": church_id, "visit_count": {"$gte": 10}})
    
    return {
        "discovery": total_visitors,
        "first_visit": first_time,
        "returning": returning,
        "engaged": engaged,
        "regular": regular,
        "conversion_rates": {
            "first_to_returning": round((returning / first_time * 100) if first_time > 0 else 0, 1),
            "returning_to_engaged": round((engaged / returning * 100) if returning > 0 else 0, 1),
            "engaged_to_regular": round((regular / engaged * 100) if engaged > 0 else 0, 1)
        }
    }

@router.get("/benchmarking/{church_slug}")
async def network_benchmarking(church_slug: str):
    church = await check_premium_subscription(church_slug)
    
    cache_key = f"benchmarking:{church_slug}"
    cached = await cache_col.find_one({
        "key": cache_key,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    if cached:
        return cached["data"]
    
    denomination = church.get("denomination")
    congregation_size = church.get("congregation_size")
    region = church.get("address", {}).get("region")
    
    size_mapping = {
        "1-50": ["1-50", "51-100"],
        "51-100": ["1-50", "51-100", "101-200"],
        "101-200": ["51-100", "101-200", "201-500"],
        "201-500": ["101-200", "201-500", "500+"],
        "500+": ["201-500", "500+"]
    }
    
    peer_filter = {
        "_id": {"$ne": church["_id"]},
        "denomination": denomination
    }
    
    if congregation_size in size_mapping:
        peer_filter["congregation_size"] = {"$in": size_mapping[congregation_size]}
    
    if region:
        peer_filter["address.region"] = region
    
    peers = await churches_col.find(peer_filter).to_list(None)
    
    if len(peers) < 5:
        peer_filter.pop("address.region", None)
        peers = await churches_col.find(peer_filter).to_list(None)
    
    metrics = [
        "profile_views_total",
        "follower_count",
        "average_rating",
        "event_frequency_score",
        "visitor_return_rate",
        "response_rate"
    ]
    
    def safe_get(church_obj, metric):
        if metric == "profile_views_total":
            return church_obj.get("analytics", {}).get("total_profile_views", 0)
        elif metric == "follower_count":
            return church_obj.get("follower_count", 0)
        elif metric == "average_rating":
            return church_obj.get("average_rating", 0)
        elif metric == "event_frequency_score":
            events_30d = church_obj.get("analytics", {}).get("events_last_30_days", 0)
            return min(events_30d * 10, 100)
        elif metric == "visitor_return_rate":
            return church_obj.get("analytics", {}).get("visitor_return_rate", 0)
        elif metric == "response_rate":
            return church_obj.get("analytics", {}).get("response_rate", 0)
        return 0
    
    church_metrics = {m: safe_get(church, m) for m in metrics}
    peer_metrics = {m: [safe_get(p, m) for p in peers] for m in metrics}
    
    def calculate_percentile(value, peer_values):
        if not peer_values:
            return 50
        sorted_vals = sorted(peer_values)
        below = sum(1 for v in sorted_vals if v < value)
        return round((below / len(sorted_vals)) * 100)
    
    def calculate_trend(metric_name):
        history = church.get("analytics", {}).get(f"{metric_name}_history", [])
        if len(history) < 2:
            return "stable"
        recent = sum([h.get("value", 0) for h in history[-4:]])
        older = sum([h.get("value", 0) for h in history[-8:-4]]) if len(history) >= 8 else recent
        if recent > older * 1.1:
            return "up"
        elif recent < older * 0.9:
            return "down"
        return "stable"
    
    benchmarks = []
    for metric in metrics:
        peer_vals = peer_metrics[metric]
        if not peer_vals:
            continue
        
        benchmarks.append({
            "metric": metric,
            "your_value": church_metrics[metric],
            "peer_average": round(sum(peer_vals) / len(peer_vals), 1),
            "peer_top_25pct": round(sorted(peer_vals)[int(len(peer_vals) * 0.75)], 1) if peer_vals else 0,
            "your_percentile": calculate_percentile(church_metrics[metric], peer_vals),
            "trend": calculate_trend(metric)
        })
    
    strengths = [b for b in benchmarks if b["your_percentile"] >= 75]
    improvements = [b for b in benchmarks if b["your_percentile"] < 50]
    
    result = {
        "church_slug": church_slug,
        "generated_at": datetime.utcnow().isoformat(),
        "peer_group": {
            "count": len(peers),
            "denomination": denomination,
            "size_range": congregation_size,
            "region": region or "UK-wide"
        },
        "benchmarks": benchmarks,
        "strengths": strengths,
        "improvement_areas": improvements
    }
    
    await cache_col.update_one(
        {"key": cache_key},
        {"$set": {
            "key": cache_key,
            "data": result,
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        }},
        upsert=True
    )
    
    return result