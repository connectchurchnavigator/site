from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
import uuid
from ..database import get_database
from ..dependencies import get_current_church

router = APIRouter(prefix="/api/videos", tags=["videos"])

class VideoGenerateRequest(BaseModel):
    church_id: str
    video_type: str
    image_ids: List[str]
    music_style: str
    event_id: Optional[str] = None
    custom_text: Optional[str] = None

class VideoStatusResponse(BaseModel):
    status: str
    progress: int
    video_url: Optional[str] = None
    error: Optional[str] = None

@router.post("/generate")
async def generate_video(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_database),
    current_church=Depends(get_current_church)
):
    if request.church_id != str(current_church["_id"]):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    church = await db.churches.find_one({"_id": ObjectId(request.church_id)})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if request.video_type not in ["church_promo", "sunday_announcement", "event_promo", "pastor_intro", "whatsapp_status"]:
        raise HTTPException(status_code=400, detail="Invalid video type")
    
    if request.music_style not in ["gospel", "contemporary", "classical", "ambient", "upbeat"]:
        raise HTTPException(status_code=400, detail="Invalid music style")
    
    if len(request.image_ids) < 3 or len(request.image_ids) > 10:
        raise HTTPException(status_code=400, detail="Must provide 3-10 images")
    
    job_id = str(uuid.uuid4())
    
    video_job = {
        "_id": ObjectId(),
        "job_id": job_id,
        "church_id": ObjectId(request.church_id),
        "video_type": request.video_type,
        "image_ids": request.image_ids,
        "music_style": request.music_style,
        "event_id": ObjectId(request.event_id) if request.event_id else None,
        "custom_text": request.custom_text,
        "status": "pending",
        "progress": 0,
        "video_url": None,
        "error": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.video_jobs.insert_one(video_job)
    
    from ..services.video_generator import generate_video_task
    background_tasks.add_task(generate_video_task, job_id, request.dict(), church)
    
    estimated_seconds = 45 if request.video_type == "whatsapp_status" else 90
    
    return {
        "job_id": job_id,
        "estimated_seconds": estimated_seconds,
        "status": "pending"
    }

@router.get("/status/{job_id}")
async def get_video_status(
    job_id: str,
    db=Depends(get_database),
    current_church=Depends(get_current_church)
):
    job = await db.video_jobs.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if str(job["church_id"]) != str(current_church["_id"]):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return VideoStatusResponse(
        status=job["status"],
        progress=job["progress"],
        video_url=job.get("video_url"),
        error=job.get("error")
    )

@router.get("/{church_id}")
async def list_videos(
    church_id: str,
    skip: int = 0,
    limit: int = 20,
    db=Depends(get_database),
    current_church=Depends(get_current_church)
):
    if church_id != str(current_church["_id"]):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    videos = await db.video_jobs.find(
        {"church_id": ObjectId(church_id), "status": "complete"},
        {"job_id": 1, "video_type": 1, "video_url": 1, "created_at": 1}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for video in videos:
        video["_id"] = str(video["_id"])
    
    return {"videos": videos, "count": len(videos)}

@router.delete("/{job_id}")
async def delete_video(
    job_id: str,
    db=Depends(get_database),
    current_church=Depends(get_current_church)
):
    job = await db.video_jobs.find_one({"job_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if str(job["church_id"]) != str(current_church["_id"]):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.video_jobs.delete_one({"job_id": job_id})
    
    return {"message": "Video deleted successfully"}