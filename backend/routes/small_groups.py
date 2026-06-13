from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from bson import ObjectId
from models.small_group import SmallGroup, SmallGroupCreate, SmallGroupUpdate, JoinRequest
from database import get_database
from email_service import send_email
import os

router = APIRouter(prefix="/api", tags=["small_groups"])

def get_db():
    return get_database()

@router.get("/churches/{church_slug}/small-groups", response_model=List[SmallGroup])
async def get_church_small_groups(church_slug: str, db=Depends(get_db)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    groups = []
    async for group in db.small_groups.find({"church_id": str(church["_id"])}):
        group["id"] = str(group.pop("_id"))
        groups.append(group)
    return groups

@router.post("/churches/{church_slug}/small-groups", response_model=SmallGroup, status_code=status.HTTP_201_CREATED)
async def create_small_group(church_slug: str, group: SmallGroupCreate, db=Depends(get_db)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    group_dict = group.dict()
    group_dict["church_id"] = str(church["_id"])
    group_dict["created_at"] = datetime.utcnow()
    
    if group_dict["current_members"] > group_dict["capacity"]:
        raise HTTPException(status_code=400, detail="Current members cannot exceed capacity")
    
    result = await db.small_groups.insert_one(group_dict)
    created_group = await db.small_groups.find_one({"_id": result.inserted_id})
    created_group["id"] = str(created_group.pop("_id"))
    return created_group

@router.get("/small-groups/{group_id}", response_model=SmallGroup)
async def get_small_group(group_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    
    group["id"] = str(group.pop("_id"))
    return group

@router.put("/small-groups/{group_id}", response_model=SmallGroup)
async def update_small_group(group_id: str, group_update: SmallGroupUpdate, db=Depends(get_db)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    existing_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not existing_group:
        raise HTTPException(status_code=404, detail="Small group not found")
    
    update_data = {k: v for k, v in group_update.dict(exclude_unset=True).items() if v is not None}
    
    if "current_members" in update_data or "capacity" in update_data:
        current = update_data.get("current_members", existing_group.get("current_members", 0))
        capacity = update_data.get("capacity", existing_group.get("capacity"))
        if current > capacity:
            raise HTTPException(status_code=400, detail="Current members cannot exceed capacity")
    
    if update_data:
        await db.small_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    
    updated_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    updated_group["id"] = str(updated_group.pop("_id"))
    return updated_group

@router.delete("/small-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_small_group(group_id: str, db=Depends(get_db)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    result = await db.small_groups.delete_one({"_id": ObjectId(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Small group not found")
    return None

@router.post("/small-groups/{group_id}/join", status_code=status.HTTP_200_OK)
async def join_small_group(group_id: str, request: JoinRequest, db=Depends(get_db)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    
    if not group.get("is_open_to_join", False):
        raise HTTPException(status_code=400, detail="This group is not currently accepting new members")
    
    if group.get("current_members", 0) >= group.get("capacity", 0):
        raise HTTPException(status_code=400, detail="This group is at full capacity")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    church_name = church.get("name", "Church") if church else "Church"
    
    subject = f"New Join Request for {group['name']}"
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed;">New Small Group Join Request</h2>
            <p>You have a new join request for <strong>{group['name']}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Name:</strong> {request.name}</p>
                <p><strong>Email:</strong> {request.email}</p>
                {f'<p><strong>Message:</strong> {request.message}</p>' if request.message else ''}
            </div>
            <p><strong>Group Details:</strong></p>
            <ul>
                <li>Meeting: {group['meeting_day']}s at {group['meeting_time']}</li>
                <li>Location: {group['location_type']}</li>
                <li>Current Members: {group.get('current_members', 0)}/{group['capacity']}</li>
            </ul>
            <p>Please contact {request.name} at {request.email} to follow up on this request.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">This email was sent from ChurchNavigator.com on behalf of {church_name}</p>
        </div>
    </body>
    </html>
    """
    
    try:
        await send_email(
            to_email=group["leader_contact"],
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send notification email: {str(e)}"
        )
    
    return {"message": "Join request submitted successfully. The group leader will contact you soon."}
