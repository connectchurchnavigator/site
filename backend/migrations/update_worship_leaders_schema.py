from backend.database import get_database
from datetime import datetime

db = get_database()

def migrate_worship_leaders():
    leaders = db.worship_leaders.find({})
    
    for leader in leaders:
        update = {
            "updated_at": datetime.utcnow()
        }
        
        if "leader_type" not in leader:
            if leader.get("team_size", 0) > 1 or leader.get("member_images"):
                update["leader_type"] = "team"
            else:
                update["leader_type"] = "individual"
        
        if "available_for_booking" not in leader:
            update["available_for_booking"] = True
        
        if "events_done" not in leader:
            update["events_done"] = 0
        
        if "years_active" not in leader:
            update["years_active"] = 0
        
        db.worship_leaders.update_one(
            {"_id": leader["_id"]},
            {"$set": update}
        )
    
    print(f"Migrated {db.worship_leaders.count_documents({})} worship leaders")

if __name__ == "__main__":
    migrate_worship_leaders()