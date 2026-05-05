import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_churches():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['church_navigator']
    churches = await db.churches.find({}, {'name': 1, 'latitude': 1, 'longitude': 1, 'city': 1}).to_list(100)
    for c in churches:
        print(f"Name: {c.get('name')}, City: {c.get('city')}, Lat: {c.get('latitude')}, Lng: {c.get('longitude')}")

if __name__ == "__main__":
    asyncio.run(check_churches())
