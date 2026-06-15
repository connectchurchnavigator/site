from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any
from datetime import datetime, timedelta
import anthropic
import os
from bson import ObjectId

from database import db
from auth import get_current_church

router = APIRouter(prefix="/api/tools", tags=["premium-tools"])
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def check_premium_subscription(church_id: str) -> bool:
    church = db.churches.find_one({"_id": ObjectId(church_id)})
    if not church:
        return False
    subscription = church.get("subscription", {})
    if subscription.get("tier") != "premium":
        return False
    if subscription.get("status") != "active":
        return False
    expires = subscription.get("expires_at")
    if expires and datetime.fromisoformat(expires) < datetime.utcnow():
        return False
    return True

@router.post("/pattern-intelligence/{church_slug}")
async def pattern_intelligence(church_slug: str, current_church: Dict = Depends(get_current_church)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_church["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required. Upgrade to access AI Pattern Intelligence.")
    
    cache_key = f"pattern_intelligence_{church_slug}"
    cached = db.ai_cache.find_one({"key": cache_key})
    if cached and datetime.fromisoformat(cached["expires_at"]) > datetime.utcnow():
        return cached["data"]
    
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    visitors = list(db.visitors.find({"church_id": str(church["_id"]), "timestamp": {"$gte": ninety_days_ago}}))
    events = list(db.events.find({"church_id": str(church["_id"]), "date": {"$gte": ninety_days_ago.isoformat()}}))
    profile_views = list(db.analytics.find({"church_id": str(church["_id"]), "event_type": "profile_view", "timestamp": {"$gte": ninety_days_ago}}))
    followers = db.follows.count_documents({"church_id": str(church["_id"])})
    reviews = list(db.reviews.find({"church_id": str(church["_id"])}))
    
    visitor_count = len(visitors)
    return_visitor_count = len([v for v in visitors if v.get("visit_count", 1) > 1])
    avg_rating = sum([r.get("rating", 0) for r in reviews]) / len(reviews) if reviews else 0
    event_attendance = sum([e.get("attendance", 0) for e in events])
    profile_view_count = len(profile_views)
    
    prompt = f"""You are a church growth analyst with expertise in digital engagement and congregation patterns.

Analyse this church's data from the last 90 days:
- Total visitors: {visitor_count}
- Returning visitors: {return_visitor_count} ({(return_visitor_count/visitor_count*100) if visitor_count else 0:.1f}%)
- Profile views: {profile_view_count}
- Followers: {followers}
- Events held: {len(events)}
- Total event attendance: {event_attendance}
- Average review rating: {avg_rating:.1f}/5
- Review count: {len(reviews)}

Identify exactly 3 non-obvious patterns that a busy pastor might miss. For each pattern provide:
1. What you see (the pattern)
2. Why it matters (the impact)
3. One specific action to take (actionable recommendation)

Format as JSON:
{{
  "patterns": [
    {{
      "pattern": "clear description",
      "why_it_matters": "impact explanation",
      "action": "specific recommendation",
      "priority": "high/medium/low"
    }}
  ]
}}"""
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        import json
        response_text = message.content[0].text
        start = response_text.find('{')
        end = response_text.rfind('}') + 1
        json_str = response_text[start:end]
        result = json.loads(json_str)
        
        result["metadata"] = {
            "analyzed_at": datetime.utcnow().isoformat(),
            "data_period": "90_days",
            "church_slug": church_slug,
            "visitor_count": visitor_count,
            "profile_views": profile_view_count,
            "followers": followers
        }
        
        db.ai_cache.insert_one({
            "key": cache_key,
            "data": result,
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "created_at": datetime.utcnow().isoformat()
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/churn-analysis/{church_slug}")
async def churn_analysis(church_slug: str, current_church: Dict = Depends(get_current_church)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_church["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required. Upgrade to access Visitor Journey & Churn AI.")
    
    at_risk_visitors = list(db.visitors.find({
        "church_id": str(church["_id"]),
        "is_at_risk": True
    }).limit(20))
    
    if not at_risk_visitors:
        return {
            "at_risk_count": 0,
            "visitors": [],
            "funnel": {
                "discovery": db.analytics.count_documents({"church_id": str(church["_id"]), "event_type": "profile_view"}),
                "first_visit": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": 1}),
                "returning": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": {"$gte": 2}}),
                "engaged": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": {"$gte": 5}}),
                "member": db.visitors.count_documents({"church_id": str(church["_id"]), "status": "member"}),
                "leader": db.visitors.count_documents({"church_id": str(church["_id"]), "status": "leader"})
            }
        }
    
    analyses = []
    for visitor in at_risk_visitors:
        cache_key = f"churn_{visitor['_id']}"
        cached = db.ai_cache.find_one({"key": cache_key})
        if cached and datetime.fromisoformat(cached["expires_at"]) > datetime.utcnow():
            analyses.append(cached["data"])
            continue
        
        visit_history = visitor.get("visit_history", [])
        last_visit = visitor.get("last_visit_date", "unknown")
        visit_count = visitor.get("visit_count", 0)
        
        analyses.append({
            "visitor_id": str(visitor["_id"]),
            "name": visitor.get("name", "Anonymous"),
            "visit_count": visit_count,
            "last_visit": last_visit,
            "pending_ai": True
        })
    
    pending = [a for a in analyses if a.get("pending_ai")]
    if pending:
        batch_prompt = "You are a church engagement specialist. For each visitor below, identify the most likely reason they stopped attending and suggest a brief re-engagement message (max 3 sentences).\n\n"
        
        for i, visitor in enumerate(pending):
            v_data = at_risk_visitors[i]
            batch_prompt += f"Visitor {i+1}: Attended {v_data.get('visit_count', 0)} times, last visit {v_data.get('last_visit_date', 'unknown')}, gap since last visit: {v_data.get('days_since_last_visit', 'unknown')} days\n"
        
        batch_prompt += "\nRespond in JSON format: {\"visitors\": [{\"index\": 1, \"reason\": \"likely reason\", \"message\": \"re-engagement message\", \"probability\": 0-100}]}"
        
        try:
            message = client.messages.create(
                model="claude-haiku-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": batch_prompt}]
            )
            
            import json
            response_text = message.content[0].text
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            json_str = response_text[start:end]
            batch_result = json.loads(json_str)
            
            for result in batch_result.get("visitors", []):
                idx = result["index"] - 1
                if idx < len(pending):
                    pending[idx]["ai_reason"] = result["reason"]
                    pending[idx]["suggested_message"] = result["message"]
                    pending[idx]["conversion_probability"] = result["probability"]
                    pending[idx]["pending_ai"] = False
                    
                    visitor_id = pending[idx]["visitor_id"]
                    db.ai_cache.insert_one({
                        "key": f"churn_{visitor_id}",
                        "data": pending[idx],
                        "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                        "created_at": datetime.utcnow().isoformat()
                    })
        except Exception as e:
            for v in pending:
                v["ai_reason"] = "Analysis unavailable"
                v["suggested_message"] = "We'd love to see you again soon!"
                v["conversion_probability"] = 50
                v["pending_ai"] = False
    
    return {
        "at_risk_count": len(at_risk_visitors),
        "visitors": analyses,
        "funnel": {
            "discovery": db.analytics.count_documents({"church_id": str(church["_id"]), "event_type": "profile_view"}),
            "first_visit": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": 1}),
            "returning": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": {"$gte": 2}}),
            "engaged": db.visitors.count_documents({"church_id": str(church["_id"]), "visit_count": {"$gte": 5}}),
            "member": db.visitors.count_documents({"church_id": str(church["_id"]), "status": "member"}),
            "leader": db.visitors.count_documents({"church_id": str(church["_id"]), "status": "leader"})
        }
    }

@router.get("/benchmarking/{church_slug}")
async def benchmarking(church_slug: str, current_church: Dict = Depends(get_current_church)):
    church = db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church["_id"]) != current_church["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not check_premium_subscription(str(church["_id"])):
        raise HTTPException(status_code=402, detail="Premium subscription required. Upgrade to access Network Benchmarking.")
    
    cache_key = f"benchmarking_{church_slug}"
    cached = db.ai_cache.find_one({"key": cache_key})
    if cached and datetime.fromisoformat(cached["expires_at"]) > datetime.utcnow():
        return cached["data"]
    
    denomination = church.get("denomination", "")
    size = church.get("congregation_size", 0)
    region = church.get("city", "")
    
    size_min = max(0, size - 100)
    size_max = size + 100
    
    peer_query = {
        "_id": {"$ne": church["_id"]},
        "denomination": denomination,
        "congregation_size": {"$gte": size_min, "$lte": size_max},
        "city": region
    }
    
    peers = list(db.churches.find(peer_query))
    
    if len(peers) < 5:
        peer_query.pop("city")
        peers = list(db.churches.find(peer_query))
    
    if len(peers) < 5:
        peer_query["denomination"] = {"$exists": True}
        peers = list(db.churches.find(peer_query).limit(50))
    
    metrics = [
        "profile_views",
        "follower_count",
        "review_rating",
        "event_frequency",
        "visitor_return_rate",
        "response_rate"
    ]
    
    def get_metric_value(ch: Dict, metric: str) -> float:
        if metric == "profile_views":
            return db.analytics.count_documents({"church_id": str(ch["_id"]), "event_type": "profile_view"})
        elif metric == "follower_count":
            return db.follows.count_documents({"church_id": str(ch["_id"])})
        elif metric == "review_rating":
            reviews = list(db.reviews.find({"church_id": str(ch["_id"])}))
            return sum([r.get("rating", 0) for r in reviews]) / len(reviews) if reviews else 0
        elif metric == "event_frequency":
            events = db.events.count_documents({"church_id": str(ch["_id"]), "date": {"$gte": (datetime.utcnow() - timedelta(days=90)).isoformat()}})
            return events / 3
        elif metric == "visitor_return_rate":
            total = db.visitors.count_documents({"church_id": str(ch["_id"])})
            returning = db.visitors.count_documents({"church_id": str(ch["_id"]), "visit_count": {"$gte": 2}})
            return (returning / total * 100) if total else 0
        elif metric == "response_rate":
            return ch.get("response_rate", 0)
        return 0
    
    benchmarks = {}
    for metric in metrics:
        your_value = get_metric_value(church, metric)
        peer_values = [get_metric_value(p, metric) for p in peers]
        peer_values = [v for v in peer_values if v > 0]
        
        if not peer_values:
            benchmarks[metric] = {
                "your_value": your_value,
                "peer_average": 0,
                "peer_top_25pct": 0,
                "your_percentile": 50,
                "trend": "stable"
            }
            continue
        
        peer_avg = sum(peer_values) / len(peer_values)
        peer_values_sorted = sorted(peer_values)
        peer_top_25 = peer_values_sorted[int(len(peer_values_sorted) * 0.75)] if len(peer_values_sorted) > 3 else peer_avg
        
        percentile = sum([1 for v in peer_values if your_value >= v]) / len(peer_values) * 100
        
        benchmarks[metric] = {
            "your_value": round(your_value, 2),
            "peer_average": round(peer_avg, 2),
            "peer_top_25pct": round(peer_top_25, 2),
            "your_percentile": round(percentile, 1),
            "trend": "up" if your_value > peer_avg else "down" if your_value < peer_avg * 0.8 else "stable"
        }
    
    result = {
        "benchmarks": benchmarks,
        "peer_group": {
            "count": len(peers),
            "description": f"Compared to {len(peers)} {denomination} churches in {region} with similar congregation size"
        },
        "highlights": [
            {"metric": k, "percentile": v["your_percentile"]} 
            for k, v in benchmarks.items() 
            if v["your_percentile"] >= 75
        ],
        "areas_to_improve": [
            {"metric": k, "percentile": v["your_percentile"], "gap": v["peer_average"] - v["your_value"]} 
            for k, v in benchmarks.items() 
            if v["your_percentile"] < 50
        ]
    }
    
    db.ai_cache.insert_one({
        "key": cache_key,
        "data": result,
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "created_at": datetime.utcnow().isoformat()
    })
    
    return result