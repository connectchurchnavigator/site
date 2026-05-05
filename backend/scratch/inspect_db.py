import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def inspect_db():
    load_dotenv('.env')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("--- Church Sample ---")
    church = await db.churches.find_one({})
    print(church)
    
    print("\n--- Pastor Sample ---")
    pastor = await db.pastors.find_one({})
    print(pastor)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_db())
