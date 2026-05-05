import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def test_mongo():
    load_dotenv('.env')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    print(f"Connecting to {mongo_url}, DB: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("MongoDB is reachable!")
        
        db = client[db_name]
        count = await db.users.count_documents({})
        print(f"Users count: {count}")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_mongo())
