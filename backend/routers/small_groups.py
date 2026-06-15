from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from bson import ObjectId
import os
from models.small_group import SmallGroupCreate, SmallGroupUpdate, SmallGroup, JoinRequest
from database import get_database
from email_service import send_email

router = APIRouter(prefix="/api", tags=["small_groups"])

@router.get("/churches/{church_slug}/small-groups", response_model=List[SmallGroup])
async def get_church_small_groups(church_slug: str):
    db = get_database()
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church_id = str(church["_id"])
    groups = await db.small_groups.find({"church_id": church_id}).to_list(100)
    return [SmallGroup(**{**group, "_id": group["_id"]}) for group in groups]

@router.post("/churches/{church_slug}/small-groups", response_model=SmallGroup, status_code=status.HTTP_201_CREATED)
async def create_small_group(church_slug: str, group: SmallGroupCreate):
    db = get_database()
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    group_dict = group.dict()
    group_dict["church_id"] = str(church["_id"])
    group_dict["created_at"] = datetime.utcnow()
    result = await db.small_groups.insert_one(group_dict)
    created_group = await db.small_groups.find_one({"_id": result.inserted_id})
    return SmallGroup(**{**created_group, "_id": created_group["_id"]})

@router.get("/small-groups/{group_id}", response_model=SmallGroup)
async def get_small_group(group_id: str):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    return SmallGroup(**{**group, "_id": group["_id"]})

@router.put("/small-groups/{group_id}", response_model=SmallGroup)
async def update_small_group(group_id: str, group_update: SmallGroupUpdate):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    update_data = {k: v for k, v in group_update.dict(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.small_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Small group not found")
    updated_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    return SmallGroup(**{**updated_group, "_id": updated_group["_id"]})

@router.delete("/small-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_small_group(group_id: str):
    db = get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    result = await db.small_groups.delete_one({"_id": ObjectId(group_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Small group not found")
    return None

@router.post("/small-groups/{group_id}/join")
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
    subject = f"New Join Request for {group['name']}"
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>New Small Group Join Request</h2>
        <p>Someone is interested in joining your small group <strong>{group['name']}</strong> at {church_name}.</p>
        <h3>Contact Details:</h3>
        <ul>
            <li><strong>Name:</strong> {join_request.name}</li>
            <li><strong>Email:</strong> {join_request.email}</li>
        </ul>
        {f'<h3>Message:</h3><p>{join_request.message}</p>' if join_request.message else ''}
        <p>Please reach out to them to arrange their joining.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This email was sent via ChurchNavigator.com</p>
    </body>
    </html>
    """
    try:
        await send_email(group["leader_contact"], subject, html_content)
        await db.small_groups.update_one({"_id": ObjectId(group_id)}, {"$inc": {"current_members": 0}})
        return {"message": "Join request sent successfully", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
