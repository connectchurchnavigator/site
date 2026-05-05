from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

async def check():
    load_dotenv(Path('.') / '.env')
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    church = await db.churches.find_one({'name': {'$regex': 'Oriyanka', '$options': 'i'}})
    print(f"Name: {church.get('name')}")
    print(f"Denomination: {church.get('denomination')}")
    print(f"Languages: {church.get('languages')}")
    print(f"Worship Styles: {church.get('worship_styles')}")
    print(f"Ministries: {church.get('ministries')}")

if __name__ == "__main__":
    asyncio.run(check())
