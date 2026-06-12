from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from models import Church
from typing import List, Dict, Any
from datetime import datetime
import anthropic
import os
import json
from bson import ObjectId

router = APIRouter(prefix="/api/admin", tags=["admin"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY environment variable not set")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

batch_jobs = {}


def create_enrichment_prompt(church_data: Dict[str, Any], task_type: str) -> str:
    name = church_data.get("name", "")
    denomination = church_data.get("denomination", "Christian")
    city = church_data.get("city", "")
    ministries = church_data.get("ministries", [])
    worship_styles = church_data.get("worship_styles", [])
    
    if task_type == "bio":
        ministries_str = ", ".join(ministries[:5]) if ministries else "various ministries"
        return f"""Write a warm, welcoming 2-paragraph description for {name}, a {denomination} church in {city}. They offer {ministries_str}. Write in second person, inviting tone. Focus on community, faith, and welcome. Keep it under 200 words. Return ONLY the description text, no preamble."""
    
    elif task_type == "tagline":
        worship_str = ", ".join(worship_styles[:2]) if worship_styles else "worship"
        return f"""Create a punchy, memorable tagline for {name}, a {denomination} church with {worship_str}. Maximum 10 words. Inspiring and welcoming. Return ONLY the tagline, no quotes or explanation."""
    
    elif task_type == "ministries":
        if not ministries:
            return ""
        ministries_list = ", ".join(ministries[:10])
        return f"""For each ministry, write a one-sentence description (15-25 words). Ministries: {ministries_list}. Return ONLY valid JSON format: {{"ministry_name": "description", ...}}. No markdown, no explanation."""
    
    elif task_type == "seo":
        return f"""Write a compelling SEO meta description for {name}, a {denomination} church in {city}. Exactly 150-155 characters. Include keywords: church, {city}, {denomination}. Return ONLY the meta description text."""
    
    return ""


@router.post("/enrich/run")
async def run_enrichment(db: AsyncIOMotorDatabase = Depends(get_database)):
    churches_cursor = db.churches.find({
        "$or": [
            {"description": {"$exists": False}},
            {"description": ""},
            {"description": {"$regex": "^.{0,49}$"}}
        ],
        "name": {"$exists": True, "$ne": ""}
    }).limit(500)
    
    churches = await churches_cursor.to_list(length=500)
    
    if not churches:
        return {"message": "No churches need enrichment", "count": 0}
    
    requests = []
    church_map = {}
    
    for idx, church in enumerate(churches):
        church_id = str(church["_id"])
        church_map[f"bio_{idx}"] = {"church_id": church_id, "task": "bio"}
        church_map[f"tagline_{idx}"] = {"church_id": church_id, "task": "tagline"}
        church_map[f"seo_{idx}"] = {"church_id": church_id, "task": "seo"}
        
        requests.append({
            "custom_id": f"bio_{idx}",
            "params": {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 300,
                "messages": [
                    {"role": "user", "content": create_enrichment_prompt(church, "bio")}
                ]
            }
        })
        
        requests.append({
            "custom_id": f"tagline_{idx}",
            "params": {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 50,
                "messages": [
                    {"role": "user", "content": create_enrichment_prompt(church, "tagline")}
                ]
            }
        })
        
        requests.append({
            "custom_id": f"seo_{idx}",
            "params": {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 100,
                "messages": [
                    {"role": "user", "content": create_enrichment_prompt(church, "seo")}
                ]
            }
        })
        
        if church.get("ministries"):
            church_map[f"ministries_{idx}"] = {"church_id": church_id, "task": "ministries"}
            requests.append({
                "custom_id": f"ministries_{idx}",
                "params": {
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": 500,
                    "messages": [
                        {"role": "user", "content": create_enrichment_prompt(church, "ministries")}
                    ]
                }
            })
    
    try:
        message_batch = client.messages.batches.create(
            requests=requests
        )
        
        batch_id = message_batch.id
        batch_jobs[batch_id] = {
            "status": "processing",
            "created_at": datetime.utcnow().isoformat(),
            "church_count": len(churches),
            "request_count": len(requests),
            "church_map": church_map
        }
        
        return {
            "message": "Batch enrichment started",
            "batch_id": batch_id,
            "churches_processing": len(churches),
            "total_requests": len(requests)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch creation failed: {str(e)}")


@router.get("/enrich/status/{batch_id}")
async def get_enrichment_status(batch_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    if batch_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Batch job not found")
    
    try:
        batch = client.messages.batches.retrieve(batch_id)
        
        status_info = {
            "batch_id": batch_id,
            "status": batch.processing_status,
            "request_counts": {
                "processing": batch.request_counts.processing,
                "succeeded": batch.request_counts.succeeded,
                "errored": batch.request_counts.errored,
                "canceled": batch.request_counts.canceled,
                "expired": batch.request_counts.expired
            },
            "created_at": batch_jobs[batch_id]["created_at"],
            "church_count": batch_jobs[batch_id]["church_count"]
        }
        
        if batch.processing_status == "ended":
            results_url = batch.results_url
            if results_url and batch_jobs[batch_id]["status"] != "completed":
                await process_batch_results(batch_id, db)
                batch_jobs[batch_id]["status"] = "completed"
                status_info["status"] = "completed"
        
        return status_info
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


async def process_batch_results(batch_id: str, db: AsyncIOMotorDatabase):
    try:
        results = []
        for result in client.messages.batches.results(batch_id):
            results.append(result)
        
        church_map = batch_jobs[batch_id]["church_map"]
        enrichments = {}
        
        for result in results:
            if result.result.type == "succeeded":
                custom_id = result.custom_id
                if custom_id not in church_map:
                    continue
                
                church_id = church_map[custom_id]["church_id"]
                task = church_map[custom_id]["task"]
                
                content = result.result.message.content[0].text.strip()
                
                if church_id not in enrichments:
                    enrichments[church_id] = {}
                
                if task == "bio":
                    enrichments[church_id]["description"] = content
                elif task == "tagline":
                    enrichments[church_id]["tagline"] = content
                elif task == "seo":
                    enrichments[church_id]["seo_meta_description"] = content[:155]
                elif task == "ministries":
                    try:
                        ministries_data = json.loads(content)
                        enrichments[church_id]["ministry_descriptions"] = ministries_data
                    except:
                        pass
        
        for church_id, data in enrichments.items():
            data["enriched_by_ai"] = True
            data["enriched_at"] = datetime.utcnow()
            
            await db.churches.update_one(
                {"_id": ObjectId(church_id)},
                {"$set": data}
            )
        
        batch_jobs[batch_id]["enriched_count"] = len(enrichments)
        
    except Exception as e:
        print(f"Error processing batch results: {str(e)}")
        batch_jobs[batch_id]["status"] = "error"
        batch_jobs[batch_id]["error"] = str(e)


@router.get("/enrich/jobs")
async def list_enrichment_jobs():
    return {
        "jobs": [
            {
                "batch_id": bid,
                "status": info["status"],
                "created_at": info["created_at"],
                "church_count": info["church_count"],
                "enriched_count": info.get("enriched_count", 0)
            }
            for bid, info in batch_jobs.items()
        ]
    }
