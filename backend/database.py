from pymongo import MongoClient
import os

client = None
db = None

def connect_to_mongo():
    global client, db
    
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise Exception("MONGODB_URI environment variable not set")
    
    client = MongoClient(mongo_uri)
    
    db_name = os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")
    db = client[db_name]
    
    print(f"Connected to MongoDB: {db_name}")

def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")

def get_database():
    global db
    if db is None:
        connect_to_mongo()
    return db