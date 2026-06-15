from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from database import db
from bson import ObjectId
import re

router = APIRouter(prefix="/api/cities", tags=["cities"])

def normalize_city(city: str) -> str:
    return city.lower().strip().replace("-", " ")

def city_to_slug(city: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', city.lower()).strip('-')

@router.get("")
async def get_cities():
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$city",
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"count": -1}}
    ]
    
    results = list(db.churches.aggregate(pipeline))
    
    cities = []
    for item in results:
        if item["_id"]:
            cities.append({
                "name": item["_id"],
                "slug": city_to_slug(item["_id"]),
                "count": item["count"]
            })
    
    return {"cities": cities, "total": len(cities)}

@router.get("/{city}/summary")
async def get_city_summary(city: str):
    normalized_city = normalize_city(city)
    
    city_regex = re.compile(f"^{re.escape(normalized_city)}$", re.IGNORECASE)
    
    churches = list(db.churches.find(
        {"city": city_regex, "status": "active"},
        {"name": 1, "city": 1, "denomination": 1, "address": 1, "languages": 1, 
         "imageUrl": 1, "description": 1, "pastor": 1, "website": 1, "coordinates": 1}
    ).limit(100))
    
    if not churches:
        raise HTTPException(status_code=404, detail="City not found or no churches in this city")
    
    actual_city_name = churches[0]["city"]
    
    denominations = {}
    languages = set()
    coordinates = []
    
    for church in churches:
        if church.get("denomination"):
            denom = church["denomination"]
            denominations[denom] = denominations.get(denom, 0) + 1
        
        if church.get("languages"):
            for lang in church["languages"]:
                languages.add(lang)
        
        if church.get("coordinates"):
            coords = church["coordinates"]
            if isinstance(coords, dict) and "lat" in coords and "lng" in coords:
                coordinates.append(coords)
    
    featured = []
    for church in churches[:6]:
        church["_id"] = str(church["_id"])
        featured.append(church)
    
    all_churches = []
    for church in churches:
        church["_id"] = str(church["_id"])
        all_churches.append(church)
    
    events_pipeline = [
        {"$match": {
            "city": city_regex,
            "status": "active",
            "date": {"$gte": "2024-01-01"}
        }},
        {"$sort": {"date": 1}},
        {"$limit": 3}
    ]
    
    events = list(db.events.aggregate(events_pipeline)) if "events" in db.list_collection_names() else []
    for event in events:
        event["_id"] = str(event["_id"])
    
    pastors_pipeline = [
        {"$match": {"city": city_regex, "status": "active"}},
        {"$limit": 4}
    ]
    
    pastors = list(db.pastors.aggregate(pastors_pipeline)) if "pastors" in db.list_collection_names() else []
    for pastor in pastors:
        pastor["_id"] = str(pastor["_id"])
    
    nearby = await get_nearby_cities(actual_city_name, churches[0].get("coordinates"))
    
    return {
        "city": actual_city_name,
        "slug": city_to_slug(actual_city_name),
        "totalChurches": len(churches),
        "featured": featured,
        "allChurches": all_churches,
        "denominations": [{
            "name": name,
            "count": count
        } for name, count in sorted(denominations.items(), key=lambda x: x[1], reverse=True)],
        "languages": sorted(list(languages)),
        "events": events,
        "pastors": pastors,
        "coordinates": coordinates,
        "nearby": nearby,
        "seo": generate_city_seo(actual_city_name, len(churches), denominations)
    }

async def get_nearby_cities(current_city: str, coords: Dict = None) -> List[Dict]:
    if not coords or not isinstance(coords, dict):
        return []
    
    pipeline = [
        {"$match": {
            "status": "active",
            "city": {"$ne": current_city},
            "coordinates": {"$exists": True}
        }},
        {"$group": {
            "_id": "$city",
            "count": {"$sum": 1},
            "coords": {"$first": "$coordinates"}
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$limit": 50}
    ]
    
    cities = list(db.churches.aggregate(pipeline))
    
    nearby = []
    for city in cities:
        if city.get("coords") and isinstance(city["coords"], dict):
            nearby.append({
                "name": city["_id"],
                "slug": city_to_slug(city["_id"]),
                "count": city["count"]
            })
    
    return nearby[:5]

def generate_city_seo(city: str, count: int, denominations: Dict) -> Dict:
    top_denoms = sorted(denominations.items(), key=lambda x: x[1], reverse=True)[:3]
    denom_text = ", ".join([d[0] for d in top_denoms])
    
    description = f"Find {count} churches in {city}. Discover {denom_text} and more. View service times, contact details, and directions. Connect with your local church community today."
    
    return {
        "title": f"Churches in {city} | ChurchNavigator — Find Your Church",
        "description": description[:160],
        "h1": f"Find Churches in {city}",
        "canonical": f"https://churchnavigator.com/churches/{city_to_slug(city)}"
    }
