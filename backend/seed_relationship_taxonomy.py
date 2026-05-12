import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def seed_relationship_taxonomy():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    relationships = [
        "Church member",
        "Church leader",
        "Media Team",
        "Youth leader",
        "Volunteer",
        "Other"
    ]
    
    # Check existing
    existing = await db.taxonomies.find({'category': 'relationship'}).to_list(100)
    existing_values = [t['value'] for t in existing]
    
    to_insert = []
    for rel in relationships:
        if rel not in existing_values:
            to_insert.append({
                "id": str(uuid.uuid4()),
                "category": "relationship",
                "value": rel
            })
            
    if to_insert:
        await db.taxonomies.insert_many(to_insert)
        print(f"Inserted {len(to_insert)} relationship taxonomy items.")
    else:
        print("Relationship taxonomy already seeded.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_relationship_taxonomy())
