import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def seed_dummy_data():
    # Load env
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get super admin
    user = await db.users.find_one({'role': 'super_admin'})
    if not user:
        print("No super admin found. Please run backend once to seed admin.")
        return
    
    owner_id = user['id']
    
    # Dummy Pastors
    pastors = [
        {
            "id": str(uuid.uuid4()),
            "name": "Pastor John Smith",
            "slug": "pastor-john-smith",
            "bio": "A dedicated pastor with 15 years of experience in community building.",
            "city": "Hyderabad",
            "phone": "9876543210",
            "email": "john.smith@example.com",
            "denomination": "Baptist",
            "status": "published",
            "is_featured": True,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pastor Sarah Johnson",
            "slug": "pastor-sarah-johnson",
            "bio": "Passionate about youth ministry and social outreach.",
            "city": "Hyderabad",
            "phone": "9876543211",
            "email": "sarah.j@example.com",
            "denomination": "Pentecostal",
            "status": "published",
            "is_featured": True,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pastor David Wilson",
            "slug": "pastor-david-wilson",
            "bio": "Focuses on biblical teaching and family counseling.",
            "city": "Hyderabad",
            "phone": "9876543212",
            "email": "david.w@example.com",
            "denomination": "Methodist",
            "status": "published",
            "is_featured": False,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Dummy Churches
    churches = [
        {
            "id": str(uuid.uuid4()),
            "name": "Grace Community Church",
            "slug": "grace-community-church",
            "tagline": "Come as you are, leave transformed.",
            "description": "A vibrant community focused on grace and fellowship.",
            "address_line1": "Road No. 1, Banjara Hills",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "email": "grace@example.com",
            "phone": "040-12345678",
            "status": "published",
            "is_featured": True,
            "owner_id": owner_id,
            "services": [
                {
                    "id": str(uuid.uuid4()),
                    "day": "Tuesday",
                    "start_time": "00:00",
                    "end_time": "03:00",
                    "event_name": "Midnight Prayer Service",
                    "description": "Special prayer session for the community."
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hope Chapel",
            "slug": "hope-chapel",
            "tagline": "Bringing hope to every heart.",
            "description": "A warm and welcoming chapel for all denominations.",
            "address_line1": "Jubilee Hills Check Post",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "email": "hope@example.com",
            "phone": "040-87654321",
            "status": "published",
            "is_featured": True,
            "owner_id": owner_id,
            "services": [
                {
                    "id": str(uuid.uuid4()),
                    "day": "Tuesday",
                    "start_time": "00:00",
                    "end_time": "03:00",
                    "event_name": "Early Morning Fellowship",
                    "description": "Join us for morning worship."
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Trinity Assembly",
            "slug": "trinity-assembly",
            "tagline": "One God, one faith, one family.",
            "description": "A traditional assembly focusing on scripture study.",
            "address_line1": "Secunderabad Station Road",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "email": "trinity@example.com",
            "phone": "040-11223344",
            "status": "published",
            "is_featured": False,
            "owner_id": owner_id,
            "services": [
                {
                    "id": str(uuid.uuid4()),
                    "day": "Sunday",
                    "start_time": "10:00",
                    "end_time": "12:00",
                    "event_name": "Morning Service",
                    "description": "Main Sunday worship service."
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "City Light Church",
            "slug": "city-light-church",
            "tagline": "Shining bright in the city.",
            "description": "A contemporary church with modern worship styles.",
            "address_line1": "Gachibowli DLF Road",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "email": "citylight@example.com",
            "phone": "040-55667788",
            "status": "published",
            "is_featured": False,
            "owner_id": owner_id,
            "services": [
                {
                    "id": str(uuid.uuid4()),
                    "day": "Sunday",
                    "start_time": "18:00",
                    "end_time": "20:00",
                    "event_name": "Evening Glow",
                    "description": "Contemporary worship and preaching."
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Insert Data
    if pastors:
        await db.pastors.insert_many(pastors)
        print(f"Inserted {len(pastors)} pastors")
        
    if churches:
        await db.churches.insert_many(churches)
        print(f"Inserted {len(churches)} churches")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_dummy_data())
