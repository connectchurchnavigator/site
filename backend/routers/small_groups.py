from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from bson import ObjectId
from models.small_group import SmallGroup, SmallGroupCreate, SmallGroupUpdate, JoinRequest
from database import db
from auth import get_current_user
from email_service import send_email
import os

router = APIRouter()

@router.get("/churches/{church_slug}/small-groups", response_model=List[SmallGroup])
async def get_church_small_groups(church_slug: str):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church_id = str(church["_id"])
    groups = await db.small_groups.find({"church_id": church_id}).sort("created_at", -1).to_list(100)
    return [SmallGroup(**{**group, "_id": group["_id"]}) for group in groups]

@router.get("/small-groups/{group_id}", response_model=SmallGroup)
async def get_small_group(group_id: str):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    return SmallGroup(**{**group, "_id": group["_id"]})

@router.post("/churches/{church_slug}/small-groups", response_model=SmallGroup, status_code=status.HTTP_201_CREATED)
async def create_small_group(church_slug: str, group: SmallGroupCreate, current_user: dict = Depends(get_current_user)):
    church = await db.churches.find_one({"slug": church_slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    church_id = str(church["_id"])
    if church.get("managed_by_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Not authorized to manage this church")
    group_dict = group.dict()
    group_dict["church_id"] = church_id
    group_dict["created_at"] = datetime.utcnow()
    result = await db.small_groups.insert_one(group_dict)
    created_group = await db.small_groups.find_one({"_id": result.inserted_id})
    return SmallGroup(**{**created_group, "_id": created_group["_id"]})

@router.put("/small-groups/{group_id}", response_model=SmallGroup)
async def update_small_group(group_id: str, group_update: SmallGroupUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    existing_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not existing_group:
        raise HTTPException(status_code=404, detail="Small group not found")
    church = await db.churches.find_one({"_id": ObjectId(existing_group["church_id"])})
    if church.get("managed_by_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Not authorized to manage this group")
    update_data = {k: v for k, v in group_update.dict(exclude_unset=True).items()}
    if update_data:
        await db.small_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    updated_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    return SmallGroup(**{**updated_group, "_id": updated_group["_id"]})

@router.delete("/small-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_small_group(group_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    existing_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not existing_group:
        raise HTTPException(status_code=404, detail="Small group not found")
    church = await db.churches.find_one({"_id": ObjectId(existing_group["church_id"])})
    if church.get("managed_by_email") != current_user.get("email"):
        raise HTTPException(status_code=403, detail="Not authorized to manage this group")
    await db.small_groups.delete_one({"_id": ObjectId(group_id)})
    return None

@router.post("/small-groups/{group_id}/join", status_code=status.HTTP_200_OK)
async def join_small_group(group_id: str, request: JoinRequest):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Small group not found")
    if not group.get("is_open_to_join"):
        raise HTTPException(status_code=400, detail="This group is not accepting new members")
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    subject = f"New Join Request for {group['name']}"
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #9333ea;">New Small Group Join Request</h2>
        <p><strong>{request.name}</strong> is interested in joining your small group: <strong>{group['name']}</strong></p>
        <div style="background: #f5f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Contact Email:</strong> {request.email}</p>
            {f'<p><strong>Message:</strong><br>{request.message}</p>' if request.message else ''}
        </div>
        <p>Church: <strong>{church.get('name', 'Unknown Church')}</strong></p>
        <p style="color: #666; font-size: 14px;">Please reach out to them directly to arrange their visit or provide more information.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">ChurchNavigator.com - Connecting Communities of Faith</p>
    </body>
    </html>
    """
    try:
        await send_email(to_email=group["leader_contact"], subject=subject, html_content=html_content)
        return {"message": "Join request sent successfully", "leader_contact": group["leader_contact"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
