from typing import Optional, List, Dict, Any
from datetime import datetime
from geopy.distance import geodesic
import anthropic
import os
import json
import re

class SearchService:
    def __init__(self, db):
        self.db = db
        self.claude_client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        return geodesic((lat1, lng1), (lat2, lng2)).miles
    
    def calculate_match_score(self, church: Dict, filters: Dict, user_lat: Optional[float], user_lng: Optional[float]) -> float:
        score = 0.0
        max_score = 0.0
        
        if user_lat and user_lng and church.get('location', {}).get('coordinates'):
            coords = church['location']['coordinates']
            distance = self.calculate_distance(user_lat, user_lng, coords[1], coords[0])
            max_score += 30
            if distance <= 5:
                score += 30
            elif distance <= 15:
                score += 20
            elif distance <= 30:
                score += 10
        
        if filters.get('denomination') and church.get('denomination'):
            max_score += 20
            if church['denomination'].lower() == filters['denomination'].lower():
                score += 20
            elif filters['denomination'].lower() in church['denomination'].lower():
                score += 10
        
        if filters.get('worship_style') and church.get('worship_style'):
            max_score += 20
            styles = [s.strip().lower() for s in church.get('worship_style', '').split(',')]
            filter_style = filters['worship_style'].lower()
            if filter_style in styles:
                score += 20
            elif any(filter_style in s for s in styles):
                score += 10
        
        if filters.get('language') and church.get('languages'):
            max_score += 15
            if filters['language'].lower() in [l.lower() for l in church.get('languages', [])]:
                score += 15
        
        if filters.get('facilities') and church.get('facilities'):
            max_score += 15
            church_facilities = [f.lower() for f in church.get('facilities', [])]
            filter_facilities = [f.strip().lower() for f in filters['facilities'].split(',')]
            match_count = sum(1 for f in filter_facilities if f in church_facilities)
            if filter_facilities:
                score += (match_count / len(filter_facilities)) * 15
        
        return (score / max_score * 100) if max_score > 0 else 0
    
    async def search_churches(self, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        query = {'status': 'active'}
        
        if filters.get('denomination'):
            query['denomination'] = {'$regex': filters['denomination'], '$options': 'i'}
        
        if filters.get('worship_style'):
            query['worship_style'] = {'$regex': filters['worship_style'], '$options': 'i'}
        
        if filters.get('language'):
            query['languages'] = {'$in': [filters['language']]}
        
        if filters.get('day'):
            query['service_times'] = {'$elemMatch': {'day': filters['day']}}
        
        if filters.get('time_of_day'):
            time_ranges = {
                'morning': (0, 12),
                'afternoon': (12, 17),
                'evening': (17, 24)
            }
            if filters['time_of_day'] in time_ranges:
                start, end = time_ranges[filters['time_of_day']]
                query['service_times'] = {
                    '$elemMatch': {
                        'time': {
                            '$gte': f'{start:02d}:00',
                            '$lt': f'{end:02d}:00'
                        }
                    }
                }
        
        if filters.get('ministry'):
            query['ministries'] = {'$in': [filters['ministry']]}
        
        if filters.get('facility'):
            query['facilities'] = {'$in': [filters['facility']]}
        
        if filters.get('verified'):
            query['verified'] = True
        
        if filters.get('online'):
            query['online_services'] = True
        
        churches = list(self.db.churches.find(query).skip((page - 1) * limit).limit(limit))
        total = self.db.churches.count_documents(query)
        
        user_lat = filters.get('lat')
        user_lng = filters.get('lng')
        radius = filters.get('radius', 30)
        
        if user_lat and user_lng:
            filtered_churches = []
            for church in churches:
                if church.get('location', {}).get('coordinates'):
                    coords = church['location']['coordinates']
                    distance = self.calculate_distance(user_lat, user_lng, coords[1], coords[0])
                    if distance <= radius:
                        church['distance'] = round(distance, 2)
                        church['match_score'] = self.calculate_match_score(church, filters, user_lat, user_lng)
                        filtered_churches.append(church)
            churches = sorted(filtered_churches, key=lambda x: (-x['match_score'], x['distance']))
        else:
            for church in churches:
                church['match_score'] = self.calculate_match_score(church, filters, None, None)
            churches = sorted(churches, key=lambda x: -x['match_score'])
        
        for church in churches:
            church['_id'] = str(church['_id'])
        
        return {
            'results': churches,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    
    async def search_events(self, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        query = {'status': 'published'}
        
        if filters.get('date_from'):
            query['start_date'] = {'$gte': filters['date_from']}
        
        if filters.get('date_to'):
            query['end_date'] = {'$lte': filters['date_to']}
        
        if filters.get('event_type'):
            query['event_type'] = filters['event_type']
        
        if filters.get('city'):
            query['city'] = {'$regex': filters['city'], '$options': 'i'}
        
        if filters.get('price'):
            if filters['price'] == 'free':
                query['$or'] = [{'price': 0}, {'price': {'$exists': False}}]
            elif filters['price'] == 'paid':
                query['price'] = {'$gt': 0}
        
        if filters.get('language'):
            query['language'] = filters['language']
        
        if filters.get('age_group'):
            query['age_groups'] = {'$in': [filters['age_group']]}
        
        if filters.get('online'):
            query['online'] = True
        
        events = list(self.db.events.find(query).sort('start_date', 1).skip((page - 1) * limit).limit(limit))
        total = self.db.events.count_documents(query)
        
        user_lat = filters.get('lat')
        user_lng = filters.get('lng')
        
        if user_lat and user_lng:
            for event in events:
                if event.get('location', {}).get('coordinates'):
                    coords = event['location']['coordinates']
                    distance = self.calculate_distance(user_lat, user_lng, coords[1], coords[0])
                    event['distance'] = round(distance, 2)
        
        for event in events:
            event['_id'] = str(event['_id'])
        
        return {
            'results': events,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    
    async def search_worship_leaders(self, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        query = {'status': 'active'}
        
        if filters.get('instrument'):
            query['instruments'] = {'$in': [filters['instrument']]}
        
        if filters.get('worship_style'):
            query['worship_styles'] = {'$in': [filters['worship_style']]}
        
        if filters.get('language'):
            query['languages'] = {'$in': [filters['language']]}
        
        if filters.get('denomination'):
            query['denominations'] = {'$in': [filters['denomination']]}
        
        if filters.get('availability'):
            query['availability'] = filters['availability']
        
        if filters.get('city'):
            query['city'] = {'$regex': filters['city'], '$options': 'i'}
        
        leaders = list(self.db.worship_leaders.find(query).skip((page - 1) * limit).limit(limit))
        total = self.db.worship_leaders.count_documents(query)
        
        user_lat = filters.get('lat')
        user_lng = filters.get('lng')
        
        if user_lat and user_lng:
            for leader in leaders:
                if leader.get('location', {}).get('coordinates'):
                    coords = leader['location']['coordinates']
                    distance = self.calculate_distance(user_lat, user_lng, coords[1], coords[0])
                    leader['distance'] = round(distance, 2)
        
        for leader in leaders:
            leader['_id'] = str(leader['_id'])
        
        return {
            'results': leaders,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    
    async def search_media_teams(self, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        query = {'status': 'active'}
        
        if filters.get('service'):
            query['services'] = {'$in': [filters['service']]}
        
        if filters.get('city'):
            query['city'] = {'$regex': filters['city'], '$options': 'i'}
        
        if filters.get('team_size'):
            if filters['team_size'] == 'small':
                query['team_size'] = {'$lte': 5}
            elif filters['team_size'] == 'medium':
                query['team_size'] = {'$gte': 6, '$lte': 15}
            elif filters['team_size'] == 'large':
                query['team_size'] = {'$gte': 16}
        
        if filters.get('verified'):
            query['verified'] = True
        
        teams = list(self.db.media_teams.find(query).skip((page - 1) * limit).limit(limit))
        total = self.db.media_teams.count_documents(query)
        
        user_lat = filters.get('lat')
        user_lng = filters.get('lng')
        
        if user_lat and user_lng:
            for team in teams:
                if team.get('location', {}).get('coordinates'):
                    coords = team['location']['coordinates']
                    distance = self.calculate_distance(user_lat, user_lng, coords[1], coords[0])
                    team['distance'] = round(distance, 2)
        
        for team in teams:
            team['_id'] = str(team['_id'])
        
        return {
            'results': teams,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    
    async def search_bible_colleges(self, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        query = {'status': 'active'}
        
        if filters.get('country'):
            query['country'] = filters['country']
        
        if filters.get('level'):
            query['levels'] = {'$in': [filters['level']]}
        
        if filters.get('mode'):
            query['study_modes'] = {'$in': [filters['mode']]}
        
        if filters.get('denomination'):
            query['denominations'] = {'$in': [filters['denomination']]}
        
        if filters.get('language'):
            query['languages'] = {'$in': [filters['language']]}
        
        if filters.get('accredited'):
            query['accredited'] = True
        
        if filters.get('scholarship'):
            query['scholarships_available'] = True
        
        colleges = list(self.db.bible_colleges.find(query).skip((page - 1) * limit).limit(limit))
        total = self.db.bible_colleges.count_documents(query)
        
        for college in colleges:
            college['_id'] = str(college['_id'])
        
        return {
            'results': colleges,
            'total': total,
            'page': page,
            'pages': (total + limit - 1) // limit
        }
    
    async def universal_search(self, query: str, filters: Dict, page: int = 1, limit: int = 20) -> Dict:
        results = {
            'churches': [],
            'events': [],
            'worship_leaders': [],
            'media_teams': [],
            'bible_colleges': [],
            'total': 0
        }
        
        search_type = filters.get('type', 'all')
        
        if search_type in ['all', 'churches']:
            church_results = await self.search_churches({'worship_style': query, **filters}, 1, 5)
            results['churches'] = church_results['results']
        
        if search_type in ['all', 'events']:
            event_results = await self.search_events({'event_type': query, **filters}, 1, 5)
            results['events'] = event_results['results']
        
        if search_type in ['all', 'worship_leaders']:
            leader_results = await self.search_worship_leaders({'instrument': query, **filters}, 1, 5)
            results['worship_leaders'] = leader_results['results']
        
        if search_type in ['all', 'media_teams']:
            team_results = await self.search_media_teams({'service': query, **filters}, 1, 5)
            results['media_teams'] = team_results['results']
        
        if search_type in ['all', 'bible_colleges']:
            college_results = await self.search_bible_colleges({'country': query, **filters}, 1, 5)
            results['bible_colleges'] = college_results['results']
        
        results['total'] = sum([
            len(results['churches']),
            len(results['events']),
            len(results['worship_leaders']),
            len(results['media_teams']),
            len(results['bible_colleges'])
        ])
        
        return results
    
    async def ai_search(self, query: str, lat: Optional[float], lng: Optional[float]) -> Dict:
        prompt = f"""Extract search filters from this natural language query: "{query}"

Return ONLY valid JSON with these fields:
{{
  "location": "city name or null",
  "denomination": "denomination or null",
  "worship_style": "contemporary/traditional/charismatic/liturgical or null",
  "day": "sunday/monday/etc or null",
  "time_of_day": "morning/afternoon/evening or null",
  "ministry": "youth/children/seniors/etc or null",
  "facilities": "parking/cafe/nursery/etc or null",
  "language": "english/spanish/etc or null",
  "online": true/false or null,
  "event_type": "concert/conference/retreat/etc or null",
  "search_type": "churches/events/worship_leaders/media_teams/bible_colleges"
}}

Examples:
"Find a Baptist church in London with Sunday morning services" -> {{"location":"London","denomination":"Baptist","day":"sunday","time_of_day":"morning","search_type":"churches"}}
"Contemporary worship church near me" -> {{"worship_style":"contemporary","search_type":"churches"}}
"Christian events this weekend" -> {{"search_type":"events"}}"""
        
        try:
            message = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = message.content[0].text.strip()
            json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            extracted = json.loads(content)
            
            filters = {k: v for k, v in extracted.items() if v is not None and k != 'search_type'}
            if lat and lng:
                filters['lat'] = lat
                filters['lng'] = lng
            
            search_type = extracted.get('search_type', 'churches')
            
            if search_type == 'churches':
                results = await self.search_churches(filters, 1, 10)
            elif search_type == 'events':
                results = await self.search_events(filters, 1, 10)
            elif search_type == 'worship_leaders':
                results = await self.search_worship_leaders(filters, 1, 10)
            elif search_type == 'media_teams':
                results = await self.search_media_teams(filters, 1, 10)
            elif search_type == 'bible_colleges':
                results = await self.search_bible_colleges(filters, 1, 10)
            else:
                results = await self.universal_search(query, filters, 1, 10)
            
            return {
                'results': results.get('results', []),
                'extracted_filters': extracted,
                'explanation': f"Found {len(results.get('results', []))} results matching your search",
                'total': results.get('total', 0)
            }
        except Exception as e:
            return {
                'results': [],
                'extracted_filters': {},
                'explanation': f"Error processing search: {str(e)}",
                'total': 0
            }
    
    async def chatbot_search(self, message: str, history: List[Dict], lat: Optional[float], lng: Optional[float]) -> Dict:
        conversation = "\n".join([f"{h['role']}: {h['content']}" for h in history[-5:]])
        
        prompt = f"""You are a helpful church search assistant for ChurchNavigator.com.

Conversation history:
{conversation}

User: {message}

Provide a helpful response. If the user is searching for churches/events/resources:
1. Extract search criteria and return JSON with filters
2. Ask clarifying questions if needed
3. Be friendly and conversational

Return JSON:
{{
  "reply": "your response",
  "filters": {{...}} or null,
  "follow_up": "clarifying question" or null,
  "search_type": "churches/events/etc" or null
}}"""
        
        try:
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group(0)
            
            parsed = json.loads(content)
            
            results = []
            if parsed.get('filters'):
                filters = parsed['filters']
                if lat and lng:
                    filters['lat'] = lat
                    filters['lng'] = lng
                
                search_type = parsed.get('search_type', 'churches')
                if search_type == 'churches':
                    search_results = await self.search_churches(filters, 1, 5)
                elif search_type == 'events':
                    search_results = await self.search_events(filters, 1, 5)
                else:
                    search_results = await self.universal_search(message, filters, 1, 5)
                
                results = search_results.get('results', [])
            
            return {
                'reply': parsed.get('reply', 'How can I help you find a church today?'),
                'results': results,
                'follow_up_question': parsed.get('follow_up'),
                'total': len(results)
            }
        except Exception as e:
            return {
                'reply': "I'm here to help you find churches and Christian resources. What are you looking for?",
                'results': [],
                'follow_up_question': None,
                'total': 0
            }