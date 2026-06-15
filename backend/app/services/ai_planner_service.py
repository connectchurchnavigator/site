from anthropic import Anthropic
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
from app.database import db
from app.services.cache_service import cache_service

class AIPlannerService:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.sonnet_model = "claude-3-5-sonnet-20241022"
        self.haiku_model = "claude-3-5-haiku-20241022"
    
    async def match_churches(self, trip_id: str, minister_profile: Dict, available_churches: List[Dict]) -> List[Dict]:
        cache_key = f"planner:match:{trip_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""You are an expert church ministry matchmaker. Analyze this minister profile and score each available church on 7 dimensions (0-100).

MINISTER PROFILE:
{json.dumps(minister_profile, indent=2)}

AVAILABLE CHURCHES:
{json.dumps(available_churches[:20], indent=2)}

For EACH church, provide:
1. overall_match_score (0-100)
2. Scores for: denominational_fit, audience_match, need_alignment, practical_fit, relationship_potential, impact_score, history_score
3. ai_reasoning (2-3 sentences explaining the match)
4. ai_recommendation (one clear action)
5. estimated_attendance (realistic number)
6. estimated_impact_reach (attendance * impact multiplier)
7. red_flags (list of concerns)
8. green_flags (list of strengths)

Return ONLY valid JSON array of match objects."""
        
        try:
            response = self.client.messages.create(
                model=self.sonnet_model,
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a church ministry matching expert. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            matches = json.loads(content)
            
            for i, match in enumerate(matches):
                match["church_id"] = available_churches[i]["_id"]
                match["church_name"] = available_churches[i]["name"]
            
            await cache_service.set(cache_key, matches, ttl=604800)
            return matches
        except Exception as e:
            print(f"AI matching error: {e}")
            return [{
                "church_id": ch["_id"],
                "church_name": ch["name"],
                "overall_match_score": 50,
                "dimensions": {k: 50 for k in ["denominational_fit", "audience_match", "need_alignment", "practical_fit", "relationship_potential", "impact_score", "history_score"]},
                "ai_reasoning": "AI analysis unavailable",
                "ai_recommendation": "Manual review recommended",
                "estimated_attendance": ch.get("congregation_size", 100),
                "estimated_impact_reach": ch.get("congregation_size", 100),
                "red_flags": [],
                "green_flags": []
            } for ch in available_churches[:20]]
    
    async def check_conflicts(self, trip_id: str, itinerary: List[Dict]) -> Dict:
        cache_key = f"planner:conflicts:{trip_id}:{hash(json.dumps(itinerary, sort_keys=True))}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""Analyze this ministry trip itinerary for conflicts and issues.

ITINERARY:
{json.dumps(itinerary, indent=2)}

Detect:
1. Physical impossibility (travel time conflicts)
2. Scheduling conflicts (overlapping services)
3. Church preference mismatches
4. Rest and recovery issues
5. Geographic inefficiency
6. Cultural/denominational mismatches

Return JSON with:
{{
  "conflicts": [{{"type": "...", "severity": "critical|warning|suggestion", "affected_visits": [...], "message": "...", "suggested_fix": "..."}}],
  "overall_feasibility": 0-100,
  "feasibility_summary": "..."
}}"""
        
        try:
            response = self.client.messages.create(
                model=self.haiku_model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a trip planning expert. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            result = json.loads(content)
            await cache_service.set(cache_key, result, ttl=120)
            return result
        except Exception as e:
            print(f"Conflict detection error: {e}")
            return {"conflicts": [], "overall_feasibility": 100, "feasibility_summary": "Analysis unavailable"}
    
    async def negotiation_advice(self, invitation_id: str, invitation_history: Dict) -> Dict:
        cache_key = f"planner:negotiation:{invitation_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""A church has declined or proposed alternative for a visit request. Help the minister respond optimally.

INVITATION HISTORY:
{json.dumps(invitation_history, indent=2)}

Provide:
{{
  "situation_analysis": "2-3 sentences explaining what happened",
  "recommended_response": "counter_propose|accept_alternative|withdraw|escalate",
  "draft_counter_message": "professional, warm message ready to send",
  "alternative_dates": ["date1", "date2", "date3"],
  "insider_tips": ["tip1", "tip2", "tip3"],
  "success_probability": 0-100
}}"""
        
        try:
            response = self.client.messages.create(
                model=self.sonnet_model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a church relationship expert. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            result = json.loads(content)
            await cache_service.set(cache_key, result, ttl=86400)
            return result
        except Exception as e:
            print(f"Negotiation advice error: {e}")
            return {
                "situation_analysis": "Analysis unavailable",
                "recommended_response": "counter_propose",
                "draft_counter_message": "Thank you for your response. I would like to discuss alternative arrangements.",
                "alternative_dates": [],
                "insider_tips": [],
                "success_probability": 50
            }
    
    async def generate_briefing(self, visit_id: str, church_data: Dict, visit_data: Dict) -> Dict:
        cache_key = f"planner:briefing:{visit_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""Generate a comprehensive pre-visit briefing for a minister visiting this church in 48 hours.

CHURCH DATA:
{json.dumps(church_data, indent=2)}

VISIT DATA:
{json.dumps(visit_data, indent=2)}

Provide:
{{
  "congregation_snapshot": "detailed description",
  "what_resonates": "what works well with this congregation",
  "what_to_avoid": "things to avoid",
  "key_people": "people to connect with",
  "practical_notes": "parking, timing, dress code, etc",
  "relationship_opportunity": "future partnership possibilities"
}}"""
        
        try:
            response = self.client.messages.create(
                model=self.sonnet_model,
                max_tokens=3000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a church briefing expert. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            result = json.loads(content)
            await cache_service.set(cache_key, result, ttl=86400)
            return result
        except Exception as e:
            print(f"Briefing generation error: {e}")
            return {
                "congregation_snapshot": "Church information available in main profile",
                "what_resonates": "Standard ministry approach",
                "what_to_avoid": "No specific concerns",
                "key_people": "Connect with church leadership",
                "practical_notes": "Confirm details with church coordinator",
                "relationship_opportunity": "Explore partnership after visit"
            }
    
    async def predict_impact(self, trip_id: str, confirmed_itinerary: List[Dict]) -> Dict:
        cache_key = f"planner:impact:{trip_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""Predict the real-world impact of this ministry trip before confirmation.

CONFIRMED ITINERARY:
{json.dumps(confirmed_itinerary, indent=2)}

Provide comprehensive impact analysis:
{{
  "total_estimated_reach": number,
  "ministry_impact_score": 0-100,
  "predicted_outcomes": {{
    "new_partnerships": number,
    "referrals_to_other_churches": number,
    "estimated_lives_impacted": number,
    "follow_up_engagements": number
  }},
  "visit_by_visit_impact": [{{"visit_id": "...", "church_name": "...", "estimated_attendance": number, "impact_score": 0-100, "impact_reasoning": "...", "recommended_focus": "..."}}],
  "trip_strengths": ["strength1", "strength2"],
  "trip_weaknesses": ["weakness1", "weakness2"],
  "improvement_suggestions": [{{"suggestion": "...", "impact_increase": "...", "match_score_change": "..."}}],
  "ai_verdict": "overall assessment and key recommendations"
}}"""
        
        try:
            response = self.client.messages.create(
                model=self.sonnet_model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a ministry impact analyst. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            result = json.loads(content)
            await cache_service.set(cache_key, result, ttl=86400)
            return result
        except Exception as e:
            print(f"Impact prediction error: {e}")
            total_reach = sum(v.get("estimated_attendance", 0) for v in confirmed_itinerary)
            return {
                "total_estimated_reach": total_reach,
                "ministry_impact_score": 75,
                "predicted_outcomes": {"new_partnerships": 2, "referrals_to_other_churches": 3, "estimated_lives_impacted": total_reach, "follow_up_engagements": 10},
                "visit_by_visit_impact": [{"visit_id": v.get("_id"), "church_name": v.get("church_name"), "estimated_attendance": v.get("estimated_attendance", 100), "impact_score": 75, "impact_reasoning": "Good match", "recommended_focus": "Standard ministry"} for v in confirmed_itinerary],
                "trip_strengths": ["Well-organized itinerary"],
                "trip_weaknesses": [],
                "improvement_suggestions": [],
                "ai_verdict": "This is a solid ministry trip with good potential reach."
            }
    
    async def generate_debrief(self, visit_id: str, visit_details: Dict, church_feedback: Optional[Dict] = None) -> Dict:
        cache_key = f"planner:debrief:{visit_id}"
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        prompt = f"""Generate a post-visit debrief 4 hours after the visit ended.

VISIT DETAILS:
{json.dumps(visit_details, indent=2)}

CHURCH FEEDBACK:
{json.dumps(church_feedback or {}, indent=2)}

Provide:
{{
  "visit_summary": "how it went",
  "key_moments": ["moment1", "moment2"],
  "follow_up_actions": [{{"action": "...", "deadline": "...", "template": "...", "auto_draft": true}}],
  "partnership_potential": "HIGH|MEDIUM|LOW with explanation",
  "notes_for_next_visit": "learnings for future visits"
}}"""
        
        try:
            response = self.client.messages.create(
                model=self.haiku_model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                system="You are a ministry debrief expert. Return only valid JSON."
            )
            
            content = response.content[0].text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            
            result = json.loads(content)
            await cache_service.set(cache_key, result, ttl=0)
            return result
        except Exception as e:
            print(f"Debrief generation error: {e}")
            return {
                "visit_summary": "Visit completed",
                "key_moments": ["Ministry time"],
                "follow_up_actions": [{"action": "Send thank you message", "deadline": "Within 24 hours", "template": "post_visit_thankyou", "auto_draft": True}],
                "partnership_potential": "MEDIUM - Follow up to explore",
                "notes_for_next_visit": "Standard visit protocol worked well"
            }

ai_planner_service = AIPlannerService()