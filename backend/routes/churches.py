from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId
import re

from models import Church, ChurchCreate, ChurchUpdate, BranchCreate, NetworkResponse, ChurchStats, User
from database import get_database
from auth import get_current_user, get_current_active_user

router = APIRouter(prefix="/api/churches", tags=["churches"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

def has_church_access(user: User, church_slug: str, required_roles: List[str] = ["owner", "admin"]) -> bool:
    for listing in user.listings:
        if listing.type == "church" and listing.listing_slug == church_slug:
            return listing.role in required_roles
    return False

def get_user_church_role(user: User, church_slug: str) -> str:
    for listing in user.listings:
        if listing.type == "church" and listing.listing_slug == church_slug:
            return listing.role
    return None

@router.get("/")
async def get_churches(
    skip: int = 0,
    limit: int = 20,
    city: str = None,
    county: str = None,
    denomination: str = None,
    search: str = None
):
    db = get_database()
    query = {}
    
    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}
    if county:
        query["location.county"] = {"$regex": county, "$options": "i"}
    if denomination:
        query["denomination"] = {"$regex": denomination, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location.city": {"$regex": search, "$options": "i"}}
        ]
    
    churches = list(db.churches.find(query).skip(skip).limit(limit))
    total = db.churches.count_documents(query)
    
    for church in churches:
        church["_id"] = str(church["_id"])
    
    return {"churches": churches, "total": total, "skip": skip, "limit": limit}

@router.get("/{slug}")
async def get_church(slug: str):
    db = get_database()
    church = db.churches.find_one({"slug": slug})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    db.churches.update_one(
        {"slug": slug},
        {"$inc": {"stats.views": 1}}
    )
    
    church["_id"] = str(church["_id"])
    return church

@router.get("/{slug}/network")
async def get_church_network(slug: str):
    db = get_database()
    church = db.churches.find_one({"slug": slug})
    
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    response = {
        "parent": None,
        "branches": [],
        "combined_stats": {
            "total_views": 0,
            "total_checkins": 0,
            "total_followers": 0,
            "total_messages": 0,
            "total_events": 0
        }
    }
    
    if church.get("is_parent"):
        church["_id"] = str(church["_id"])
        response["parent"] = church
        
        if church.get("branches"):
            branches = list(db.churches.find({"slug": {"$in": church["branches"]}}))
            for branch in branches:
                branch["_id"] = str(branch["_id"])
                response["branches"].append(branch)
                
                stats = branch.get("stats", {})
                response["combined_stats"]["total_views"] += stats.get("views", 0)
                response["combined_stats"]["total_checkins"] += stats.get("checkins", 0)
                response["combined_stats"]["total_followers"] += stats.get("followers", 0)
                response["combined_stats"]["total_messages"] += stats.get("messages", 0)
                response["combined_stats"]["total_events"] += stats.get("events", 0)
        
        parent_stats = church.get("stats", {})
        response["combined_stats"]["total_views"] += parent_stats.get("views", 0)
        response["combined_stats"]["total_checkins"] += parent_stats.get("checkins", 0)
        response["combined_stats"]["total_followers"] += parent_stats.get("followers", 0)
        response["combined_stats"]["total_messages"] += parent_stats.get("messages", 0)
        response["combined_stats"]["total_events"] += parent_stats.get("events", 0)
    
    elif church.get("is_branch") and church.get("parent_id"):
        parent = db.churches.find_one({"slug": church["parent_id"]})
        if parent:
            parent["_id"] = str(parent["_id"])
            response["parent"] = parent
            
            if parent.get("branches"):
                branches = list(db.churches.find({"slug": {"$in": parent["branches"]}}))
                for branch in branches:
                    branch["_id"] = str(branch["_id"])
                    response["branches"].append(branch)
                    
                    stats = branch.get("stats", {})
                    response["combined_stats"]["total_views"] += stats.get("views", 0)
                    response["combined_stats"]["total_checkins"] += stats.get("checkins", 0)
                    response["combined_stats"]["total_followers"] += stats.get("followers", 0)
                    response["combined_stats"]["total_messages"] += stats.get("messages", 0)
                    response["combined_stats"]["total_events"] += stats.get("events", 0)
            
            parent_stats = parent.get("stats", {})
            response["combined_stats"]["total_views"] += parent_stats.get("views", 0)
            response["combined_stats"]["total_checkins"] += parent_stats.get("checkins", 0)
            response["combined_stats"]["total_followers"] += parent_stats.get("followers", 0)
            response["combined_stats"]["total_messages"] += parent_stats.get("messages", 0)
            response["combined_stats"]["total_events"] += parent_stats.get("events", 0)
    else:
        church["_id"] = str(church["_id"])
        response["parent"] = church
        stats = church.get("stats", {})
        response["combined_stats"]["total_views"] = stats.get("views", 0)
        response["combined_stats"]["total_checkins"] = stats.get("checkins", 0)
        response["combined_stats"]["total_followers"] = stats.get("followers", 0)
        response["combined_stats"]["total_messages"] = stats.get("messages", 0)
        response["combined_stats"]["total_events"] = stats.get("events", 0)
    
    return response

@router.post("/{slug}/branches", status_code=status.HTTP_201_CREATED)
async def add_branch(
    slug: str,
    branch_data: BranchCreate,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    if not has_church_access(current_user, slug, ["owner", "admin"]):
        raise HTTPException(status_code=403, detail="Only parent church admins can add branches")
    
    parent = db.churches.find_one({"slug": slug})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent church not found")
    
    branch = db.churches.find_one({"slug": branch_data.branch_slug})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch church not found")
    
    if branch.get("is_branch") or branch.get("parent_id"):
        raise HTTPException(status_code=400, detail="Church is already a branch")
    
    db.churches.update_one(
        {"slug": slug},
        {
            "$set": {"is_parent": True, "updated_at": datetime.utcnow()},
            "$addToSet": {"branches": branch_data.branch_slug}
        }
    )
    
    branch_update = {
        "is_branch": True,
        "parent_id": slug,
        "branch_label": branch_data.branch_label,
        "updated_at": datetime.utcnow()
    }
    
    if branch_data.branch_pastor_id:
        branch_update["branch_pastor_id"] = branch_data.branch_pastor_id
    
    if parent.get("network_name"):
        branch_update["network_name"] = parent["network_name"]
    
    db.churches.update_one(
        {"slug": branch_data.branch_slug},
        {"$set": branch_update}
    )
    
    return {"message": "Branch added successfully", "branch_slug": branch_data.branch_slug}

@router.delete("/{slug}/branches/{branch_slug}")
async def remove_branch(
    slug: str,
    branch_slug: str,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    if not has_church_access(current_user, slug, ["owner", "admin"]):
        raise HTTPException(status_code=403, detail="Only parent church admins can remove branches")
    
    parent = db.churches.find_one({"slug": slug})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent church not found")
    
    if branch_slug not in parent.get("branches", []):
        raise HTTPException(status_code=404, detail="Branch not found in parent church")
    
    db.churches.update_one(
        {"slug": slug},
        {
            "$pull": {"branches": branch_slug},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    result = db.churches.update_one(
        {"slug": slug},
        {"$set": {"updated_at": datetime.utcnow()}}
    )
    
    updated_parent = db.churches.find_one({"slug": slug})
    if not updated_parent.get("branches"):
        db.churches.update_one(
            {"slug": slug},
            {"$set": {"is_parent": False, "updated_at": datetime.utcnow()}}
        )
    
    db.churches.update_one(
        {"slug": branch_slug},
        {
            "$set": {
                "is_branch": False,
                "parent_id": None,
                "branch_label": None,
                "branch_pastor_id": None,
                "network_name": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Branch removed successfully"}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_church(
    church_data: ChurchCreate,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    slug = slugify(church_data.name)
    existing = db.churches.find_one({"slug": slug})
    
    if existing:
        counter = 1
        while db.churches.find_one({"slug": f"{slug}-{counter}"}):
            counter += 1
        slug = f"{slug}-{counter}"
    
    church = Church(
        name=church_data.name,
        slug=slug,
        denomination=church_data.denomination,
        location=church_data.location,
        contact=church_data.contact,
        description=church_data.description,
        pastor_name=church_data.pastor_name,
        pastor_email=church_data.pastor_email,
        owner_id=str(current_user.id)
    )
    
    result = db.churches.insert_one(church.dict(by_alias=True, exclude={"id"}))
    
    db.users.update_one(
        {"_id": current_user.id},
        {
            "$push": {
                "listings": {
                    "type": "church",
                    "listing_id": str(result.inserted_id),
                    "listing_slug": slug,
                    "listing_name": church_data.name,
                    "listing_avatar": None,
                    "role": "owner",
                    "is_parent": False,
                    "parent_id": None
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    created_church = db.churches.find_one({"_id": result.inserted_id})
    created_church["_id"] = str(created_church["_id"])
    
    return created_church

@router.put("/{slug}")
async def update_church(
    slug: str,
    church_data: ChurchUpdate,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    if not has_church_access(current_user, slug, ["owner", "admin", "contributor"]):
        raise HTTPException(status_code=403, detail="You don't have permission to update this church")
    
    church = db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    update_data = church_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    db.churches.update_one({"slug": slug}, {"$set": update_data})
    
    updated_church = db.churches.find_one({"slug": slug})
    updated_church["_id"] = str(updated_church["_id"])
    
    return updated_church