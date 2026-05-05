import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import shutil

async def clear_data():
    # Load env from the same directory
    env_path = Path(__file__).parent / ".env"
    load_dotenv(env_path)
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_navigator')
    
    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Collections to clear related to churches and pastors
    collections = ['churches', 'pastors', 'relationships', 'bookmarks', 'analytics_events']
    
    for coll in collections:
        try:
            result = await db[coll].delete_many({})
            print(f"Successfully deleted {result.deleted_count} documents from '{coll}' collection.")
        except Exception as e:
            print(f"Error clearing collection '{coll}': {e}")
    
    # Clear uploads directory (images/docs associated with listings)
    upload_dir = Path(__file__).parent / "uploads"
    if upload_dir.exists():
        print(f"Clearing uploads directory: {upload_dir}")
        count = 0
        for item in upload_dir.iterdir():
            try:
                if item.is_file():
                    item.unlink()
                    count += 1
                elif item.is_dir():
                    shutil.rmtree(item)
                    count += 1
            except Exception as e:
                print(f"Error deleting {item}: {e}")
        print(f"Cleared {count} items from uploads directory.")
    else:
        print("Uploads directory not found, skipping.")
    
    client.close()
    print("Data clearing process completed.")

if __name__ == "__main__":
    asyncio.run(clear_data())
