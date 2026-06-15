from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import anthropic
import os
from ..database import db
from ..auth import get_current_user
from bson import ObjectId
import json

router = APIRouter(prefix="/api/tools", tags=["premium_tools"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def check_premium_subscription(church_id: str) -> bool:
    church = db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        return False
    subscription = church.get("subscription", {})
    return subscription.get("tier") == "premium" and subscription.get("status") == "active"

@router.post("/pattern-intelligence/{church_slug}")
async def pattern_intelligence(church_slug: str, current_user: dict = Depends(get_current_user)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_user.get("church_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    
    cache_key = f"pattern_intelligence_{church['_id']}"
    cached = db.ai_cache.find_one({"cache_key": cache_key, "expires_at": {"$gt": datetime.utcnow()}})
    if cached:
        return cached["result"]
    
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    
    visitors = list(db.visitors.find({
        "church_id": church["_id"],
        "created_at": {"$gte": ninety_days_ago}
    }).sort("created_at", -1).limit(1000))
    
    events = list(db.events.find({
        "church_id": church["_id"],
        "date": {"$gte": ninety_days_ago}
    }).sort("date", -1))
    
    profile_views = list(db.analytics.find({
        "church_id": church["_id"],
        "event_type": "profile_view",
        "timestamp": {"$gte": ninety_days_ago}
    }))
    
    followers = db.followers.count_documents({"church_id": church["_id"]}) if "followers" in db.list_collection_names() else 0
    
    reviews = list(db.reviews.find({"church_id": church["_id"]}).sort("created_at", -1).limit(50))
    
    visitor_summary = {
        "total_visitors": len(visitors),
        "unique_visitors": len(set([v.get("email", v.get("phone", str(v["_id"]))) for v in visitors])),
        "return_visitors": len([v for v in visitors if v.get("visit_count", 0) > 1]),
        "at_risk_count": len([v for v in visitors if v.get("is_at_risk", False)])
    }
    
    event_summary = {
        "total_events": len(events),
        "avg_attendance": sum([e.get("attendance", 0) for e in events]) / len(events) if events else 0,
        "event_types": list(set([e.get("category", "Other") for e in events]))
    }
    
    engagement_summary = {
        "profile_views": len(profile_views),
        "follower_count": followers,
        "avg_review_rating": sum([r.get("rating", 0) for r in reviews]) / len(reviews) if reviews else 0,
        "review_count": len(reviews)
    }
    
    visitor_by_week = {}
    for v in visitors:
        week = v["created_at"].isocalendar()[1]
        visitor_by_week[week] = visitor_by_week.get(week, 0) + 1
    
    data_package = {
        "visitor_summary": visitor_summary,
        "event_summary": event_summary,
        "engagement_summary": engagement_summary,
        "weekly_visitor_trend": visitor_by_week,
        "church_name": church["name"]
    }
    
    prompt = f"""You are a church growth analyst with expertise in identifying non-obvious patterns in church data.

Analyse this church's data from the last 90 days:

{json.dumps(data_package, indent=2, default=str)}

Identify exactly 3 non-obvious patterns that a busy pastor might miss. For each pattern:
1. PATTERN: What you see in the data (be specific with numbers)
2. WHY IT MATTERS: The hidden opportunity or risk
3. ACTION: One specific, actionable step they can take this week

Focus on patterns like:
- Timing patterns (when people visit/engage)
- Correlation patterns (what drives repeat visits)
- Hidden segment behaviors
- Early warning signals
- Underutilized opportunities

Return your response as valid JSON:
{{
  "patterns": [
    {{
      "title": "Short pattern title",
      "pattern": "What you see",
      "why_matters": "Why this matters",
      "action": "Specific action to take",
      "data_points": ["key stat 1", "key stat 2"]
    }}
  ]
}}"""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        response_text = message.content[0].text
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        json_text = response_text[json_start:json_end]
        result = json.loads(json_text)
        
        db.ai_cache.insert_one({
            "cache_key": cache_key,
            "result": result,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/churn-analysis/{church_slug}")
async def churn_analysis(church_slug: str, current_user: dict = Depends(get_current_user)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_user.get("church_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    
    at_risk_visitors = list(db.visitors.find({
        "church_id": church["_id"],
        "is_at_risk": True
    }).sort("last_visit", -1).limit(20))
    
    if not at_risk_visitors:
        return {
            "journey_funnel": {
                "discovery": 0,
                "first_visit": 0,
                "returning": 0,
                "engaged": 0,
                "member": 0,
                "leader": 0
            },
            "at_risk_visitors": [],
            "total_at_risk": 0
        }
    
    all_visitors = list(db.visitors.find({"church_id": church["_id"]}))
    journey_funnel = {
        "discovery": len([v for v in all_visitors if v.get("source")]),
        "first_visit": len([v for v in all_visitors if v.get("visit_count", 0) >= 1]),
        "returning": len([v for v in all_visitors if v.get("visit_count", 0) >= 2]),
        "engaged": len([v for v in all_visitors if v.get("visit_count", 0) >= 4]),
        "member": len([v for v in all_visitors if v.get("is_member", False)]),
        "leader": len([v for v in all_visitors if v.get("is_leader", False)])
    }
    
    results = []
    batch_size = 5
    
    for i in range(0, len(at_risk_visitors), batch_size):
        batch = at_risk_visitors[i:i+batch_size]
        batch_data = []
        
        for visitor in batch:
            cache_key = f"churn_{visitor['_id']}"
            cached = db.ai_cache.find_one({"cache_key": cache_key, "expires_at": {"$gt": datetime.utcnow()}})
            
            if cached:
                results.append(cached["result"])
                continue
            
            visit_history = visitor.get("visit_history", [])
            if isinstance(visit_history, list) and visit_history:
                visit_dates = [v.get("date") if isinstance(v, dict) else v for v in visit_history]
            else:
                visit_dates = [visitor.get("first_visit"), visitor.get("last_visit")]
            
            batch_data.append({
                "visitor_id": str(visitor["_id"]),
                "name": visitor.get("name", "Anonymous"),
                "visit_count": visitor.get("visit_count", 0),
                "last_visit_days_ago": (datetime.utcnow() - visitor.get("last_visit", datetime.utcnow())).days,
                "visit_dates": [str(d) for d in visit_dates if d]
            })
        
        if batch_data:
            prompt = f"""You are a church pastoral care expert. For each visitor below who has stopped attending, provide:
1. Most likely reason they stopped (1 sentence)
2. Re-engagement message suggestion (2-3 sentences, warm and personal)

Visitors:
{json.dumps(batch_data, indent=2)}

Return valid JSON:
{{
  "analyses": [
    {{
      "visitor_id": "id",
      "likely_reason": "reason",
      "message": "suggested message",
      "probability_score": 0-100
    }}
  ]
}}"""
            
            try:
                message = client.messages.create(
                    model="claude-haiku-3-5-20241022",
                    max_tokens=1500,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                response_text = message.content[0].text
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                json_text = response_text[json_start:json_end]
                ai_result = json.loads(json_text)
                
                for analysis in ai_result.get("analyses", []):
                    visitor_data = next((v for v in batch if str(v["_id"]) == analysis["visitor_id"]), None)
                    if visitor_data:
                        result_obj = {
                            "visitor_id": analysis["visitor_id"],
                            "name": visitor_data.get("name", "Anonymous"),
                            "email": visitor_data.get("email"),
                            "phone": visitor_data.get("phone"),
                            "visit_count": visitor_data.get("visit_count", 0),
                            "last_visit": visitor_data.get("last_visit"),
                            "likely_reason": analysis.get("likely_reason"),
                            "message": analysis.get("message"),
                            "probability_score": analysis.get("probability_score", 50)
                        }
                        results.append(result_obj)
                        
                        db.ai_cache.insert_one({
                            "cache_key": f"churn_{analysis['visitor_id']}",
                            "result": result_obj,
                            "created_at": datetime.utcnow(),
                            "expires_at": datetime.utcnow() + timedelta(days=7)
                        })
            except Exception as e:
                print(f"Batch AI analysis failed: {str(e)}")
                continue
    
    return {
        "journey_funnel": journey_funnel,
        "at_risk_visitors": results,
        "total_at_risk": len(at_risk_visitors)
    }

@router.get("/benchmarking/{church_slug}")
async def benchmarking(church_slug: str, current_user: dict = Depends(get_current_user)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_user.get("church_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    
    cache_key = f"benchmarking_{church['_id']}"
    cached = db.ai_cache.find_one({"cache_key": cache_key, "expires_at": {"$gt": datetime.utcnow()}})
    if cached:
        return cached["result"]
    
    denomination = church.get("denomination", "Other")
    region = church.get("region", church.get("city", "UK"))
    congregation_size = church.get("congregation_size", 100)
    
    size_min = max(50, congregation_size - 100)
    size_max = congregation_size + 100
    
    peer_churches = list(db.churches.find({
        "_id": {"$ne": church["_id"]},
        "denomination": denomination,
        "congregation_size": {"$gte": size_min, "$lte": size_max},
        "$or": [
            {"region": region},
            {"city": church.get("city")}
        ]
    }).limit(100))
    
    if len(peer_churches) < 10:
        peer_churches = list(db.churches.find({
            "_id": {"$ne": church["_id"]},
            "denomination": denomination,
            "congregation_size": {"$gte": size_min, "$lte": size_max}
        }).limit(100))
    
    if len(peer_churches) < 5:
        peer_churches = list(db.churches.find({
            "_id": {"$ne": church["_id"]},
            "congregation_size": {"$gte": size_min, "$lte": size_max}
        }).limit(100))
    
    def get_metric(c: dict, metric: str) -> float:
        if metric == "profile_views":
            return db.analytics.count_documents({"church_id": c["_id"], "event_type": "profile_view"})
        elif metric == "follower_count":
            return db.followers.count_documents({"church_id": c["_id"]}) if "followers" in db.list_collection_names() else 0
        elif metric == "review_rating":
            reviews = list(db.reviews.find({"church_id": c["_id"]}))
            return sum([r.get("rating", 0) for r in reviews]) / len(reviews) if reviews else 0
        elif metric == "event_frequency":
            thirty_days = datetime.utcnow() - timedelta(days=30)
            return db.events.count_documents({"church_id": c["_id"], "date": {"$gte": thirty_days}})
        elif metric == "visitor_return_rate":
            visitors = list(db.visitors.find({"church_id": c["_id"]}))
            return len([v for v in visitors if v.get("visit_count", 0) > 1]) / len(visitors) * 100 if visitors else 0
        elif metric == "response_rate":
            return c.get("response_rate", 0)
        return 0
    
    metrics = ["profile_views", "follower_count", "review_rating", "event_frequency", "visitor_return_rate", "response_rate"]
    results = {}
    
    for metric in metrics:
        values = [get_metric(c, metric) for c in peer_churches]
        your_value = get_metric(church, metric)
        
        if not values:
            continue
        
        values_sorted = sorted(values)
        peer_avg = sum(values) / len(values)
        top_25_index = int(len(values_sorted) * 0.75)
        peer_top_25 = values_sorted[top_25_index] if values_sorted else 0
        
        percentile = (sum([1 for v in values if v < your_value]) / len(values) * 100) if values else 50
        
        recent_values = [get_metric(church, metric)]
        trend = "stable"
        if len(recent_values) > 1:
            if recent_values[-1] > recent_values[0] * 1.1:
                trend = "up"
            elif recent_values[-1] < recent_values[0] * 0.9:
                trend = "down"
        
        results[metric] = {
            "your_value": round(your_value, 2),
            "peer_average": round(peer_avg, 2),
            "peer_top_25pct": round(peer_top_25, 2),
            "your_percentile": round(percentile, 1),
            "trend": trend
        }
    
    response = {
        "metrics": results,
        "peer_group": {
            "count": len(peer_churches),
            "denomination": denomination,
            "region": region,
            "size_range": f"{size_min}-{size_max}"
        },
        "highlights": [
            {"metric": k, "percentile": v["your_percentile"]}
            for k, v in results.items()
            if v["your_percentile"] >= 75
        ],
        "improvements": [
            {"metric": k, "percentile": v["your_percentile"], "peer_avg": v["peer_average"]}
            for k, v in results.items()
            if v["your_percentile"] < 50
        ]
    }
    
    db.ai_cache.insert_one({
        "cache_key": cache_key,
        "result": response,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24)
    })
    
    return response