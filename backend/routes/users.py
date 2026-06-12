from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from datetime import datetime
from bson import ObjectId

from models import User, UserListing, ListingAdd
from database import get_database
from auth import get_current_active_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/me/listings")
async def get_user_listings(current_user: User = Depends(get_current_active_user)):
    return {"listings": current_user.listings}

@router.post("/me/listings", status_code=status.HTTP_201_CREATED)
async def add_user_listing(
    listing_data: ListingAdd,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    valid_types = ["church", "pastor", "worship_leader", "media_team", "college"]
    if listing_data.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid listing type. Must be one of: {', '.join(valid_types)}")
    
    valid_roles = ["owner", "admin", "contributor", "viewer"]
    if listing_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    for existing_listing in current_user.listings:
        if existing_listing.listing_id == listing_data.listing_id and existing_listing.type == listing_data.type:
            raise HTTPException(status_code=400, detail="Listing already added to your account")
    
    listing = None
    listing_name = ""
    listing_slug = ""
    listing_avatar = None
    is_parent = False
    parent_id = None
    
    if listing_data.type == "church":
        listing = db.churches.find_one({"_id": ObjectId(listing_data.listing_id)})
        if listing:
            listing_name = listing.get("name", "")
            listing_slug = listing.get("slug", "")
            listing_avatar = listing.get("avatar")
            is_parent = listing.get("is_parent", False)
            parent_id = listing.get("parent_id")
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    new_listing = UserListing(
        type=listing_data.type,
        listing_id=listing_data.listing_id,
        listing_slug=listing_slug,
        listing_name=listing_name,
        listing_avatar=listing_avatar,
        role=listing_data.role,
        is_parent=is_parent,
        parent_id=parent_id
    )
    
    db.users.update_one(
        {"_id": current_user.id},
        {
            "$push": {"listings": new_listing.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Listing added successfully", "listing": new_listing.dict()}

@router.delete("/me/listings/{listing_type}/{listing_id}")
async def remove_user_listing(
    listing_type: str,
    listing_id: str,
    current_user: User = Depends(get_current_active_user)
):
    db = get_database()
    
    listing_found = False
    for listing in current_user.listings:
        if listing.type == listing_type and listing.listing_id == listing_id:
            listing_found = True
            if listing.role == "owner":
                raise HTTPException(
                    status_code=403,
                    detail="Cannot remove owner role. Transfer ownership first."
                )
            break
    
    if not listing_found:
        raise HTTPException(status_code=404, detail="Listing not found in your account")
    
    db.users.update_one(
        {"_id": current_user.id},
        {
            "$pull": {
                "listings": {
                    "type": listing_type,
                    "listing_id": listing_id
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Listing removed successfully"}

@router.get("/me")
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    user_dict = current_user.dict(by_alias=True)
    user_dict["_id"] = str(user_dict["_id"])
    user_dict.pop("hashed_password", None)
    return user_dict