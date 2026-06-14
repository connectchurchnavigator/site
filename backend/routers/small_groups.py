from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from bson import ObjectId
from models.small_group import SmallGroup, SmallGroupCreate, SmallGroupUpdate, JoinRequest
from database import get_database
from services.email_service import send_email
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/churches/{slug}/small-groups", response_model=List[SmallGroup])
async def get_church_small_groups(slug: str):
    db = get_database()
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    church_id = str(church["_id"])
    groups = await db.small_groups.find({"church_id": church_id}).to_list(100)
    return groups

@router.post("/churches/{slug}/small-groups", response_model=SmallGroup, status_code=status.HTTP_201_CREATED)
async def create_small_group(slug: str, group: SmallGroupCreate):
    db = get_database()
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    group_dict = group.dict()
    group_dict["church_id"] = str(church["_id"])
    group_dict["created_at"] = datetime.utcnow()
    
    result = await db.small_groups.insert_one(group_dict)
    created_group = await db.small_groups.find_one({"_id": result.inserted_id})
    return created_group

@router.get("/small-groups/{group_id}", response_model=SmallGroup)
async def get_small_group(group_id: str):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    return group

@router.put("/small-groups/{group_id}", response_model=SmallGroup)
async def update_small_group(group_id: str, group_update: SmallGroupUpdate):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    update_data = {k: v for k, v in group_update.dict(exclude_unset=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.small_groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Small group not found")
    
    updated_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    return updated_group

@router.delete("/small-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_small_group(group_id: str):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    result = await db.small_groups.delete_one({"_id": ObjectId(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Small group not found")
    return None

@router.post("/small-groups/{group_id}/join", status_code=status.HTTP_200_OK)
async def join_small_group(group_id: str, join_request: JoinRequest):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    
    if not group.get("is_open_to_join", True):
        raise HTTPException(status_code=400, detail="This group is not currently accepting new members")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    church_name = church.get("name", "Unknown Church") if church else "Unknown Church"
    
    try:
        email_subject = f"New Join Request for {group['name']}"
        email_body = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #7c3aed;">New Small Group Join Request</h2>
    <p>Someone has expressed interest in joining your small group:</p>
    
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #7c3aed;">{group['name']}</h3>
        <p><strong>Requester Name:</strong> {join_request.name}</p>
        <p><strong>Email:</strong> {join_request.email}</p>
        {f'<p><strong>Message:</strong><br>{join_request.message}</p>' if join_request.message else ''}
    </div>
    
    <p>Please reach out to them directly at <a href="mailto:{join_request.email}">{join_request.email}</a></p>
    
    <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
        This request was sent via ChurchNavigator.com for {church_name}
    </p>
</body>
</html>
        """
        
        await send_email(
            to_email=group["leader_contact"],
            subject=email_subject,
            body=email_body
        )
        
        await db.small_group_join_requests.insert_one({
            "group_id": group_id,
            "name": join_request.name,
            "email": join_request.email,
            "message": join_request.message,
            "created_at": datetime.utcnow()
        })
        
        return {"message": "Join request sent successfully"}
    except Exception as e:
        logger.error(f"Error sending join request email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send join request")