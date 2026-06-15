from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from backend.models.small_group import (
    SmallGroupCreate, SmallGroupUpdate, SmallGroupResponse, 
    JoinRequest, SmallGroupInDB, JoinRequestInDB
)
from backend.database import get_database
from backend.services.email_service import send_email
from backend.auth import get_current_user

router = APIRouter(prefix="/api", tags=["small_groups"])

@router.get("/churches/{slug}/small-groups", response_model=List[SmallGroupResponse])
async def get_church_small_groups(slug: str, is_open: Optional[bool] = None):
    db = await get_database()
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    query = {"church_id": str(church["_id"])}
    if is_open is not None:
        query["is_open_to_join"] = is_open
    
    groups = await db.small_groups.find(query).sort("name", 1).to_list(100)
    response = []
    for group in groups:
        group_dict = SmallGroupInDB(**group).dict(by_alias=True)
        group_dict["id"] = str(group["_id"])
        group_dict["church_name"] = church.get("name")
        response.append(SmallGroupResponse(**group_dict))
    return response

@router.post("/churches/{slug}/small-groups", response_model=SmallGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_small_group(slug: str, group: SmallGroupCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church.get("owner_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized to manage this church")
    
    group_dict = group.dict()
    group_dict["church_id"] = str(church["_id"])
    group_dict["created_at"] = datetime.utcnow()
    group_dict["_id"] = ObjectId()
    
    await db.small_groups.insert_one(group_dict)
    group_dict["id"] = str(group_dict.pop("_id"))
    group_dict["church_name"] = church.get("name")
    return SmallGroupResponse(**group_dict)

@router.get("/small-groups/{group_id}", response_model=SmallGroupResponse)
async def get_small_group(group_id: str):
    db = await get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    group["id"] = str(group.pop("_id"))
    group["church_name"] = church.get("name") if church else None
    return SmallGroupResponse(**group)

@router.put("/small-groups/{group_id}", response_model=SmallGroupResponse)
async def update_small_group(group_id: str, group_update: SmallGroupUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    if not church or str(church.get("owner_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in group_update.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.small_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    
    updated_group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    updated_group["id"] = str(updated_group.pop("_id"))
    updated_group["church_name"] = church.get("name")
    return SmallGroupResponse(**updated_group)

@router.delete("/small-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_small_group(group_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    if not church or str(church.get("owner_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.small_groups.delete_one({"_id": ObjectId(group_id)})
    await db.join_requests.delete_many({"group_id": group_id})
    return None

@router.post("/small-groups/{group_id}/join", status_code=status.HTTP_201_CREATED)
async def join_small_group(group_id: str, request: JoinRequest):
    db = await get_database()
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.small_groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if not group.get("is_open_to_join"):
        raise HTTPException(status_code=400, detail="Group is not accepting new members")
    
    church = await db.churches.find_one({"_id": ObjectId(group["church_id"])})
    
    join_request_dict = request.dict()
    join_request_dict["group_id"] = group_id
    join_request_dict["church_id"] = str(group["church_id"])
    join_request_dict["created_at"] = datetime.utcnow()
    join_request_dict["status"] = "pending"
    join_request_dict["_id"] = ObjectId()
    
    await db.join_requests.insert_one(join_request_dict)
    
    email_subject = f"New Small Group Join Request - {group['name']}"
    email_body = f"""Hello {group['leader_name']},

A new person has expressed interest in joining your small group '{group['name']}'.

Name: {request.name}
Email: {request.email}
Message: {request.message or 'No message provided'}

Please reach out to them directly to coordinate next steps.

Church: {church.get('name', 'Unknown')}

Best regards,
ChurchNavigator Team"""
    
    try:
        await send_email(group["leader_contact"], email_subject, email_body)
    except Exception as e:
        pass
    
    return {"message": "Join request submitted successfully", "id": str(join_request_dict["_id"])}

@router.get("/churches/{slug}/join-requests", response_model=List[dict])
async def get_church_join_requests(slug: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if str(church.get("owner_id")) != str(current_user.get("id")):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    requests = await db.join_requests.find({"church_id": str(church["_id"])}).sort("created_at", -1).to_list(500)
    
    result = []
    for req in requests:
        group = await db.small_groups.find_one({"_id": ObjectId(req["group_id"])})
        req["id"] = str(req.pop("_id"))
        req["group_name"] = group.get("name") if group else "Unknown Group"
        result.append(req)
    
    return result