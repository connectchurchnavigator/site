import os
import tempfile
import asyncio
from datetime import datetime
from bson import ObjectId
import requests
from moviepy.editor import *
from moviepy.video.fx.all import fadein, fadeout
import numpy as np
from ..database import get_database
import base64

MUSIC_URLS = {
    "gospel": "https://cdn.pixabay.com/audio/2022/03/10/audio_d1718e8d94.mp3",
    "contemporary": "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    "classical": "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
    "ambient": "https://cdn.pixabay.com/audio/2022/03/15/audio_c8c0732235.mp3",
    "upbeat": "https://cdn.pixabay.com/audio/2022/01/18/audio_d0c2e97c63.mp3"
}

VIDEO_CONFIGS = {
    "church_promo": {"duration": 60, "aspect": "16:9", "size": (1920, 1080)},
    "sunday_announcement": {"duration": 30, "aspect": "16:9", "size": (1920, 1080)},
    "event_promo": {"duration": 30, "aspect": "16:9", "size": (1920, 1080)},
    "pastor_intro": {"duration": 45, "aspect": "16:9", "size": (1920, 1080)},
    "whatsapp_status": {"duration": 30, "aspect": "9:16", "size": (1080, 1920)}
}

async def generate_video_task(job_id: str, request_data: dict, church: dict):
    db = await get_database()
    
    try:
        await update_job_progress(db, job_id, 5, "Downloading images...")
        
        temp_dir = tempfile.mkdtemp()
        image_paths = []
        
        for idx, image_id in enumerate(request_data["image_ids"]):
            image_url = f"https://ik.imagekit.io/cuizrvzly/church_navigator/{image_id}"
            response = requests.get(image_url, timeout=30)
            if response.status_code == 200:
                path = os.path.join(temp_dir, f"image_{idx}.jpg")
                with open(path, "wb") as f:
                    f.write(response.content)
                image_paths.append(path)
        
        if len(image_paths) < 3:
            raise Exception("Failed to download enough images")
        
        await update_job_progress(db, job_id, 15, "Downloading music...")
        
        music_url = MUSIC_URLS.get(request_data["music_style"], MUSIC_URLS["contemporary"])
        music_path = os.path.join(temp_dir, "music.mp3")
        response = requests.get(music_url, timeout=60)
        with open(music_path, "wb") as f:
            f.write(response.content)
        
        await update_job_progress(db, job_id, 30, "Creating video clips...")
        
        config = VIDEO_CONFIGS[request_data["video_type"]]
        total_duration = config["duration"]
        clip_duration = total_duration / len(image_paths)
        
        clips = []
        for img_path in image_paths:
            clip = create_ken_burns_clip(img_path, clip_duration, config["size"])
            clips.append(clip)
        
        await update_job_progress(db, job_id, 50, "Adding transitions...")
        
        video = concatenate_videoclips(clips, method="compose")
        
        await update_job_progress(db, job_id, 65, "Adding text overlays...")
        
        video = add_text_overlays(video, request_data, church, config)
        
        await update_job_progress(db, job_id, 80, "Adding music...")
        
        audio = AudioFileClip(music_path).subclip(0, min(total_duration, 60)).audio_fadeout(2)
        video = video.set_audio(audio)
        
        await update_job_progress(db, job_id, 90, "Rendering video...")
        
        output_path = os.path.join(temp_dir, f"{job_id}.mp4")
        video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=os.path.join(temp_dir, "temp_audio.m4a"),
            remove_temp=True,
            preset="medium"
        )
        
        await update_job_progress(db, job_id, 95, "Uploading video...")
        
        video_url = await upload_to_imagekit(output_path, job_id)
        
        await db.video_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "complete",
                    "progress": 100,
                    "video_url": video_url,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        video.close()
        audio.close()
        for clip in clips:
            clip.close()
        
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
    except Exception as e:
        await db.video_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updated_at": datetime.utcnow()
                }
            }
        )

def create_ken_burns_clip(image_path: str, duration: float, size: tuple):
    img_clip = ImageClip(image_path).set_duration(duration)
    
    w, h = img_clip.size
    target_w, target_h = size
    
    scale = max(target_w / w, target_h / h) * 1.2
    img_clip = img_clip.resize(scale)
    
    def zoom_effect(get_frame, t):
        frame = get_frame(t)
        zoom_factor = 1 + (t / duration) * 0.15
        h, w = frame.shape[:2]
        new_h, new_w = int(h / zoom_factor), int(w / zoom_factor)
        
        top = (h - new_h) // 2
        left = (w - new_w) // 2
        
        cropped = frame[top:top+new_h, left:left+new_w]
        from PIL import Image
        img = Image.fromarray(cropped)
        img = img.resize((w, h), Image.LANCZOS)
        return np.array(img)
    
    img_clip = img_clip.fl(zoom_effect)
    img_clip = img_clip.resize(size)
    img_clip = fadein(img_clip, 0.5)
    img_clip = fadeout(img_clip, 0.5)
    
    return img_clip

def add_text_overlays(video: VideoClip, request_data: dict, church: dict, config: dict):
    video_type = request_data["video_type"]
    
    if video_type == "church_promo":
        title_text = TextClip(
            church.get("name", "Our Church"),
            fontsize=70,
            color="white",
            font="Arial-Bold",
            stroke_color="black",
            stroke_width=2
        ).set_position(("center", 100)).set_duration(5).fadein(0.5).fadeout(0.5)
        
        tagline = church.get("tagline") or church.get("description", "")[:50]
        subtitle_text = TextClip(
            tagline,
            fontsize=40,
            color="white",
            font="Arial",
            stroke_color="black",
            stroke_width=1
        ).set_position(("center", 200)).set_duration(5).fadein(0.5).fadeout(0.5)
        
        video = CompositeVideoClip([video, title_text.set_start(1), subtitle_text.set_start(1.5)])
    
    elif video_type == "sunday_announcement":
        main_text = TextClip(
            "Join Us This Sunday",
            fontsize=80,
            color="white",
            font="Arial-Bold",
            stroke_color="black",
            stroke_width=3
        ).set_position(("center", "center")).set_duration(3).fadein(0.5).fadeout(0.5)
        
        service_time = church.get("service_times", {}).get("sunday_morning", "10:00 AM")
        time_text = TextClip(
            f"Service at {service_time}",
            fontsize=50,
            color="white",
            font="Arial"
        ).set_position(("center", config["size"][1] - 150)).set_duration(video.duration).fadein(1)
        
        video = CompositeVideoClip([video, main_text.set_start(2), time_text])
    
    elif video_type == "pastor_intro":
        pastor_name = church.get("pastor_name", "Our Pastor")
        pastor_text = TextClip(
            f"Meet Pastor {pastor_name}",
            fontsize=70,
            color="white",
            font="Arial-Bold",
            stroke_color="black",
            stroke_width=2
        ).set_position(("center", 100)).set_duration(5).fadein(0.5).fadeout(0.5)
        
        video = CompositeVideoClip([video, pastor_text.set_start(1)])
    
    return video

async def update_job_progress(db, job_id: str, progress: int, status_text: str):
    await db.video_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {
                "progress": progress,
                "status": "rendering",
                "updated_at": datetime.utcnow()
            }
        }
    )

async def upload_to_imagekit(file_path: str, job_id: str):
    IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", "")
    IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY", "")
    IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/cuizrvzly"
    
    with open(file_path, "rb") as f:
        file_content = f.read()
    
    file_base64 = base64.b64encode(file_content).decode()
    
    url = "https://upload.imagekit.io/api/v1/files/upload"
    
    payload = {
        "file": file_base64,
        "fileName": f"video_{job_id}.mp4",
        "folder": "/church_navigator/videos"
    }
    
    response = requests.post(
        url,
        data=payload,
        auth=(IMAGEKIT_PRIVATE_KEY, "")
    )
    
    if response.status_code == 200:
        result = response.json()
        return result.get("url")
    else:
        return f"{IMAGEKIT_URL_ENDPOINT}/church_navigator/videos/video_{job_id}.mp4"