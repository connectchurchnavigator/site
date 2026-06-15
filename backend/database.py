from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "DEV-ChurchNavigator")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]
