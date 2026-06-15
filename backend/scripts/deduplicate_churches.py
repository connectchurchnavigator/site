import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from difflib import SequenceMatcher
import re
from typing import List, Dict, Tuple
import math
import os
from bson import ObjectId

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return re.sub(r'[^0-9]', '', phone)

def normalize_email(email: str) -> str:
    if not email:
        return ""
    return email.lower().strip()

def fuzzy_match(s1: str, s2: str) -> float:
    if not s1 or not s2:
        return 0.0
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    return SequenceMatcher(None, s1, s2).ratio() * 100

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_duplicate_score(church1: Dict, church2: Dict) -> Tuple[float, List[str]]:
    score = 0
    reasons = []
    
    name_sim = fuzzy_match(church1.get('name', ''), church2.get('name', ''))
    if name_sim > 85:
        score += 35
        reasons.append(f"Name match: {name_sim:.1f}%")
    
    phone1 = normalize_phone(church1.get('phone', ''))
    phone2 = normalize_phone(church2.get('phone', ''))
    if phone1 and phone2 and phone1 == phone2:
        score += 25
        reasons.append("Phone match")
    
    email1 = normalize_email(church1.get('email', ''))
    email2 = normalize_email(church2.get('email', ''))
    if email1 and email2 and email1 == email2:
        score += 20
        reasons.append("Email match")
    
    addr1 = church1.get('address_line1', '').lower().strip()
    city1 = church1.get('city', '').lower().strip()
    addr2 = church2.get('address_line2', '').lower().strip()
    city2 = church2.get('city', '').lower().strip()
    if addr1 and addr2 and city1 and city2 and addr1 == addr2 and city1 == city2:
        score += 20
        reasons.append("Address match")
    
    if church1.get('google_maps_link') and church2.get('google_maps_link'):
        if church1['google_maps_link'] == church2['google_maps_link']:
            score += 15
            reasons.append("Google Maps link match")
    
    lat1 = church1.get('latitude')
    lon1 = church1.get('longitude')
    lat2 = church2.get('latitude')
    lon2 = church2.get('longitude')
    if lat1 and lon1 and lat2 and lon2:
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        if distance < 100:
            score += 15
            reasons.append(f"Location within {distance:.0f}m")
    
    return min(score, 100), reasons

def count_filled_fields(church: Dict) -> int:
    fields = ['name', 'phone', 'email', 'website', 'address_line1', 'city', 'postcode',
              'denomination', 'description', 'services', 'facilities', 'image_url',
              'latitude', 'longitude', 'google_maps_link']
    return sum(1 for f in fields if church.get(f))

async def find_duplicates() -> List[Dict]:
    churches = await db.churches.find({
        "status": {"$ne": "merged"}
    }).to_list(None)
    
    duplicates = []
    processed_pairs = set()
    
    for i, church1 in enumerate(churches):
        for church2 in churches[i+1:]:
            pair_key = tuple(sorted([str(church1['_id']), str(church2['_id'])]))
            if pair_key in processed_pairs:
                continue
            processed_pairs.add(pair_key)
            
            score, reasons = calculate_duplicate_score(church1, church2)
            
            if score >= 70:
                duplicates.append({
                    "church1_id": church1['_id'],
                    "church2_id": church2['_id'],
                    "church1": church1,
                    "church2": church2,
                    "score": score,
                    "reasons": reasons,
                    "detected_at": datetime.utcnow()
                })
    
    duplicates.sort(key=lambda x: x['score'], reverse=True)
    return duplicates

async def merge_churches(primary_id: ObjectId, duplicate_id: ObjectId, auto: bool = False) -> bool:
    primary = await db.churches.find_one({"_id": primary_id})
    duplicate = await db.churches.find_one({"_id": duplicate_id})
    
    if not primary or not duplicate:
        return False
    
    merged_data = dict(primary)
    
    for field in ['phone', 'email', 'website', 'address_line1', 'address_line2', 'city',
                  'postcode', 'denomination', 'description', 'services', 'facilities',
                  'image_url', 'latitude', 'longitude', 'google_maps_link']:
        if not merged_data.get(field) and duplicate.get(field):
            merged_data[field] = duplicate[field]
    
    merged_data['updated_at'] = datetime.utcnow()
    await db.churches.update_one({"_id": primary_id}, {"$set": merged_data})
    
    await db.visits.update_many(
        {"church_id": str(duplicate_id)},
        {"$set": {"church_id": str(primary_id)}}
    )
    
    await db.messages.update_many(
        {"church_id": str(duplicate_id)},
        {"$set": {"church_id": str(primary_id)}}
    )
    
    await db.follows.update_many(
        {"church_id": str(duplicate_id)},
        {"$set": {"church_id": str(primary_id)}}
    )
    
    await db.churches.update_one(
        {"_id": duplicate_id},
        {"$set": {
            "status": "merged",
            "merged_into": str(primary_id),
            "merged_at": datetime.utcnow()
        }}
    )
    
    await db.dedup_log.insert_one({
        "action": "merge",
        "primary_id": str(primary_id),
        "duplicate_id": str(duplicate_id),
        "primary_name": primary.get('name'),
        "duplicate_name": duplicate.get('name'),
        "auto": auto,
        "timestamp": datetime.utcnow()
    })
    
    return True

async def run_deduplication():
    print(f"Starting deduplication scan at {datetime.utcnow()}")
    print(f"Database: {DB_NAME}")
    
    duplicates = await find_duplicates()
    print(f"Found {len(duplicates)} potential duplicate pairs")
    
    auto_merged = 0
    flagged = 0
    
    for dup in duplicates:
        if dup['score'] > 95:
            church1_fields = count_filled_fields(dup['church1'])
            church2_fields = count_filled_fields(dup['church2'])
            
            if church1_fields >= church2_fields:
                primary_id = dup['church1_id']
                duplicate_id = dup['church2_id']
            else:
                primary_id = dup['church2_id']
                duplicate_id = dup['church1_id']
            
            success = await merge_churches(primary_id, duplicate_id, auto=True)
            if success:
                auto_merged += 1
                print(f"Auto-merged: {dup['church1'].get('name')} + {dup['church2'].get('name')} (score: {dup['score']})")
        
        elif dup['score'] >= 70:
            existing = await db.duplicate_flags.find_one({
                "$or": [
                    {"church1_id": dup['church1_id'], "church2_id": dup['church2_id']},
                    {"church1_id": dup['church2_id'], "church2_id": dup['church1_id']}
                ],
                "status": "pending"
            })
            
            if not existing:
                await db.duplicate_flags.insert_one({
                    "church1_id": dup['church1_id'],
                    "church2_id": dup['church2_id'],
                    "church1_name": dup['church1'].get('name'),
                    "church2_name": dup['church2'].get('name'),
                    "score": dup['score'],
                    "reasons": dup['reasons'],
                    "status": "pending",
                    "detected_at": datetime.utcnow()
                })
                flagged += 1
                print(f"Flagged for review: {dup['church1'].get('name')} + {dup['church2'].get('name')} (score: {dup['score']})")
    
    print(f"\nSummary:")
    print(f"- Auto-merged: {auto_merged} pairs")
    print(f"- Flagged for manual review: {flagged} pairs")
    print(f"Deduplication complete at {datetime.utcnow()}")

if __name__ == "__main__":
    asyncio.run(run_deduplication())