import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def seed_distinct_relationships():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    church_relationships = [
        "Church Member",
        "Church Leader",
        "Media Team",
        "Youth Leader",
        "Volunteer",
        "Other"
    ]
    
    pastor_relationships = [
        "I am this Pastor (Self)",
        "Family Member",
        "Personal Assistant / Secretary",
        "Church Administrator",
        "Fellow Minister / Colleague",
        "Church Member",
        "Other"
    ]
    
    # Categories to seed
    categories = {
        "relationship_church": church_relationships,
        "relationship_pastor": pastor_relationships
    }
    
    total_inserted = 0
    for category, values in categories.items():
        existing = await db.taxonomies.find({'category': category}).to_list(100)
        existing_values = [t['value'] for t in existing]
        
        to_insert = []
        for val in values:
            if val not in existing_values:
                to_insert.append({
                    "id": str(uuid.uuid4()),
                    "category": category,
                    "value": val
                })
        
        if to_insert:
            await db.taxonomies.insert_many(to_insert)
            total_inserted += len(to_insert)
            print(f"Inserted {len(to_insert)} items into {category}")
        else:
            print(f"{category} already seeded.")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_distinct_relationships())
