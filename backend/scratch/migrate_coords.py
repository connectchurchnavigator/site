import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def migrate_coordinates():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    collections = ['churches', 'pastors']
    
    for coll_name in collections:
        print(f"Migrating coordinates for collection: {coll_name}")
        collection = db[coll_name]
        
        # Find all documents that have coordinates as strings or have missing coordinates
        cursor = collection.find({})
        async for doc in cursor:
            updates = {}
            for field in ['latitude', 'longitude']:
                val = doc.get(field)
                if val is not None and isinstance(val, str):
                    try:
                        updates[field] = float(val)
                    except ValueError:
                        print(f"Warning: Could not convert '{val}' to float for doc {doc.get('id')} in {coll_name}")
                elif val is not None and not isinstance(val, (float, int)):
                    print(f"Warning: Field '{field}' for doc {doc.get('id')} is of unexpected type {type(val)}")
            
            if updates:
                await collection.update_one({'_id': doc['_id']}, {'$set': updates})
                print(f"Updated {doc.get('name', doc.get('id'))}: {updates}")

    print("Migration complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_coordinates())
