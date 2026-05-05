import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_coords():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    church = await db.churches.find_one({'name': {'$regex': 'acs', '$options': 'i'}})
    if church:
        print(f"Church: {church['name']}")
        print(f"Latitude: {church.get('latitude')} (Type: {type(church.get('latitude'))})")
        print(f"Longitude: {church.get('longitude')} (Type: {type(church.get('longitude'))})")
    else:
        print("Church 'acs' not found")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check_coords())
