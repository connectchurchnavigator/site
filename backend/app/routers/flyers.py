from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import requests
from io import BytesIO
import os
import base64
from ..database import get_database
from ..auth import get_current_church
import textwrap
import colorsys

router = APIRouter(prefix="/api/flyers", tags=["flyers"])

class FlyerRequest(BaseModel):
    church_id: str
    flyer_type: str
    size: str
    event_id: Optional[str] = None
    custom_text: Optional[dict] = None

class FlyerResponse(BaseModel):
    flyer_id: str
    flyer_url: str
    preview_url: str
    flyer_type: str
    size: str
    created_at: datetime

SIZE_CONFIGS = {
    "a4": (2480, 3508),
    "a5": (1748, 2480),
    "square": (1080, 1080),
    "story": (1080, 1920),
    "banner": (1200, 630)
}

FLYER_TEMPLATES = {
    "sunday_service": {
        "title": "Join Us This Sunday",
        "fields": ["service_times", "address", "contact"]
    },
    "event": {
        "title": "You're Invited",
        "fields": ["event_name", "event_date", "event_time", "address"]
    },
    "pastor_intro": {
        "title": "Meet Our Pastor",
        "fields": ["pastor_name", "pastor_bio", "contact"]
    },
    "church_intro": {
        "title": "You're Invited to",
        "fields": ["church_description", "service_times", "address"]
    },
    "first_visitor": {
        "title": "Welcome!",
        "fields": ["welcome_message", "service_times", "contact"]
    },
    "prayer_request": {
        "title": "Prayer Line",
        "fields": ["prayer_message", "contact", "prayer_times"]
    }
}

def extract_colors_from_image(image_url: str):
    try:
        response = requests.get(image_url, timeout=5)
        img = Image.open(BytesIO(response.content)).convert('RGB')
        img = img.resize((150, 150))
        pixels = list(img.getdata())
        avg_color = tuple(sum(c) // len(pixels) for c in zip(*pixels))
        h, s, v = colorsys.rgb_to_hsv(avg_color[0]/255, avg_color[1]/255, avg_color[2]/255)
        vibrant = tuple(int(c * 255) for c in colorsys.hsv_to_rgb(h, min(s * 1.3, 1), min(v * 1.2, 1)))
        dark = tuple(int(c * 0.3) for c in avg_color)
        return {"primary": avg_color, "vibrant": vibrant, "dark": dark}
    except:
        return {"primary": (41, 128, 185), "vibrant": (52, 152, 219), "dark": (44, 62, 80)}

def load_font(size: int):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    return ImageFont.load_default()

def wrap_text(text: str, font, max_width: int, draw):
    lines = []
    words = text.split()
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    return lines

def generate_flyer_image(church_data: dict, flyer_type: str, size: str, event_data: dict = None, custom_text: dict = None):
    width, height = SIZE_CONFIGS[size]
    template_style = "vibrant" if church_data.get("logo") else "light"
    
    colors = extract_colors_from_image(church_data.get("logo", ""))
    
    if template_style == "dark":
        bg_color = (44, 62, 80)
        text_color = (255, 255, 255)
        accent_color = colors["vibrant"]
    elif template_style == "vibrant":
        bg_color = colors["vibrant"]
        text_color = (255, 255, 255)
        accent_color = (255, 255, 255)
    else:
        bg_color = (255, 255, 255)
        text_color = (44, 62, 80)
        accent_color = colors["primary"]
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    margin = int(width * 0.08)
    content_width = width - (margin * 2)
    
    if church_data.get("cover_image"):
        try:
            response = requests.get(church_data["cover_image"], timeout=5)
            cover = Image.open(BytesIO(response.content))
            cover_height = int(height * 0.35)
            cover = cover.resize((width, cover_height), Image.Resampling.LANCZOS)
            overlay = Image.new('RGBA', cover.size, (*bg_color, 180))
            cover = Image.alpha_composite(cover.convert('RGBA'), overlay)
            img.paste(cover.convert('RGB'), (0, 0))
        except:
            pass
    
    y_pos = margin + int(height * 0.1)
    
    if church_data.get("logo"):
        try:
            response = requests.get(church_data["logo"], timeout=5)
            logo = Image.open(BytesIO(response.content)).convert('RGBA')
            logo_size = int(width * 0.2)
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            logo_x = (width - logo.width) // 2
            if logo.mode == 'RGBA':
                img.paste(logo, (logo_x, y_pos), logo)
            else:
                img.paste(logo, (logo_x, y_pos))
            y_pos += logo.height + margin
        except:
            pass
    
    title_font = load_font(int(width * 0.08))
    church_font = load_font(int(width * 0.06))
    body_font = load_font(int(width * 0.04))
    small_font = load_font(int(width * 0.035))
    
    template = FLYER_TEMPLATES[flyer_type]
    title_text = custom_text.get("title", template["title"]) if custom_text else template["title"]
    title_lines = wrap_text(title_text, title_font, content_width, draw)
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        line_width = bbox[2] - bbox[0]
        draw.text(((width - line_width) // 2, y_pos), line, fill=accent_color, font=title_font)
        y_pos += bbox[3] - bbox[1] + 10
    
    y_pos += margin // 2
    
    church_name = church_data.get("name", "")
    church_lines = wrap_text(church_name, church_font, content_width, draw)
    for line in church_lines:
        bbox = draw.textbbox((0, 0), line, font=church_font)
        line_width = bbox[2] - bbox[0]
        draw.text(((width - line_width) // 2, y_pos), line, fill=text_color, font=church_font)
        y_pos += bbox[3] - bbox[1] + 5
    
    y_pos += margin
    
    if flyer_type == "event" and event_data:
        event_name = custom_text.get("event_name", event_data.get("title", "")) if custom_text else event_data.get("title", "")
        event_lines = wrap_text(event_name, church_font, content_width, draw)
        for line in event_lines:
            bbox = draw.textbbox((0, 0), line, font=church_font)
            line_width = bbox[2] - bbox[0]
            draw.text(((width - line_width) // 2, y_pos), line, fill=accent_color, font=church_font)
            y_pos += bbox[3] - bbox[1] + 5
        y_pos += margin // 2
        
        if event_data.get("date"):
            date_text = f"📅 {event_data['date']}"
            bbox = draw.textbbox((0, 0), date_text, font=body_font)
            draw.text((margin, y_pos), date_text, fill=text_color, font=body_font)
            y_pos += bbox[3] - bbox[1] + 10
        
        if event_data.get("time"):
            time_text = f"🕐 {event_data['time']}"
            bbox = draw.textbbox((0, 0), time_text, font=body_font)
            draw.text((margin, y_pos), time_text, fill=text_color, font=body_font)
            y_pos += bbox[3] - bbox[1] + 10
    
    elif flyer_type == "sunday_service":
        if church_data.get("service_times"):
            services = church_data["service_times"]
            if isinstance(services, list):
                for service in services[:3]:
                    time_text = f"🕐 {service.get('day', 'Sunday')} at {service.get('time', '')}"
                    bbox = draw.textbbox((0, 0), time_text, font=body_font)
                    draw.text((margin, y_pos), time_text, fill=text_color, font=body_font)
                    y_pos += bbox[3] - bbox[1] + 10
    
    elif flyer_type == "pastor_intro":
        if church_data.get("pastor"):
            pastor_name = f"Pastor {church_data['pastor'].get('name', '')}"
            bbox = draw.textbbox((0, 0), pastor_name, font=church_font)
            line_width = bbox[2] - bbox[0]
            draw.text(((width - line_width) // 2, y_pos), pastor_name, fill=accent_color, font=church_font)
            y_pos += bbox[3] - bbox[1] + margin // 2
            
            if church_data['pastor'].get('bio'):
                bio_lines = wrap_text(church_data['pastor']['bio'][:200], body_font, content_width, draw)
                for line in bio_lines[:4]:
                    bbox = draw.textbbox((0, 0), line, font=body_font)
                    draw.text((margin, y_pos), line, fill=text_color, font=body_font)
                    y_pos += bbox[3] - bbox[1] + 5
    
    y_pos += margin
    
    if church_data.get("address"):
        addr = church_data["address"]
        if isinstance(addr, dict):
            address_text = f"📍 {addr.get('street', '')}, {addr.get('city', '')} {addr.get('postcode', '')}"
        else:
            address_text = f"📍 {addr}"
        addr_lines = wrap_text(address_text, small_font, content_width, draw)
        for line in addr_lines:
            bbox = draw.textbbox((0, 0), line, font=small_font)
            draw.text((margin, y_pos), line, fill=text_color, font=small_font)
            y_pos += bbox[3] - bbox[1] + 5
        y_pos += 10
    
    if church_data.get("phone"):
        phone_text = f"📞 {church_data['phone']}"
        bbox = draw.textbbox((0, 0), phone_text, font=small_font)
        draw.text((margin, y_pos), phone_text, fill=text_color, font=small_font)
        y_pos += bbox[3] - bbox[1] + 5
    
    if church_data.get("email"):
        email_text = f"✉️ {church_data['email']}"
        bbox = draw.textbbox((0, 0), email_text, font=small_font)
        draw.text((margin, y_pos), email_text, fill=text_color, font=small_font)
        y_pos += bbox[3] - bbox[1] + 5
    
    if church_data.get("website"):
        web_text = f"🌐 {church_data['website']}"
        bbox = draw.textbbox((0, 0), web_text, font=small_font)
        draw.text((margin, y_pos), web_text, fill=text_color, font=small_font)
    
    footer_text = "ChurchNavigator.com"
    footer_font = load_font(int(width * 0.025))
    bbox = draw.textbbox((0, 0), footer_text, font=footer_font)
    draw.text((margin, height - margin - (bbox[3] - bbox[1])), footer_text, fill=tuple(int(c * 0.6) for c in text_color), font=footer_font)
    
    return img

def upload_to_imagekit(image: Image.Image, filename: str):
    IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", "")
    IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/cuizrvzly/church_navigator/"
    
    buffer = BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)
    
    try:
        import base64
        file_data = base64.b64encode(buffer.read()).decode()
        
        response = requests.post(
            "https://upload.imagekit.io/api/v1/files/upload",
            data={
                "file": file_data,
                "fileName": filename,
                "folder": "/flyers/"
            },
            auth=(IMAGEKIT_PRIVATE_KEY, "")
        )
        
        if response.status_code == 200:
            return response.json().get("url")
    except:
        pass
    
    return f"{IMAGEKIT_URL_ENDPOINT}flyers/{filename}"

@router.post("/generate", response_model=FlyerResponse)
async def generate_flyer(request: FlyerRequest):
    db = get_database()
    
    church = db.churches.find_one({"_id": request.church_id})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    event_data = None
    if request.event_id:
        event_data = db.events.find_one({"_id": request.event_id})
    
    if request.flyer_type not in FLYER_TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid flyer type")
    
    if request.size not in SIZE_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid size")
    
    flyer_image = generate_flyer_image(
        church_data=church,
        flyer_type=request.flyer_type,
        size=request.size,
        event_data=event_data,
        custom_text=request.custom_text
    )
    
    flyer_id = f"{request.church_id}_{request.flyer_type}_{request.size}_{int(datetime.now().timestamp())}"
    filename = f"{flyer_id}.png"
    
    flyer_url = upload_to_imagekit(flyer_image, filename)
    
    preview = flyer_image.copy()
    preview.thumbnail((400, 400), Image.Resampling.LANCZOS)
    preview_filename = f"{flyer_id}_preview.png"
    preview_url = upload_to_imagekit(preview, preview_filename)
    
    flyer_doc = {
        "_id": flyer_id,
        "church_id": request.church_id,
        "flyer_type": request.flyer_type,
        "size": request.size,
        "flyer_url": flyer_url,
        "preview_url": preview_url,
        "event_id": request.event_id,
        "custom_text": request.custom_text,
        "created_at": datetime.now()
    }
    
    db.flyers.insert_one(flyer_doc)
    
    return FlyerResponse(
        flyer_id=flyer_id,
        flyer_url=flyer_url,
        preview_url=preview_url,
        flyer_type=request.flyer_type,
        size=request.size,
        created_at=flyer_doc["created_at"]
    )

@router.get("/{church_id}", response_model=List[FlyerResponse])
async def get_church_flyers(church_id: str):
    db = get_database()
    flyers = list(db.flyers.find({"church_id": church_id}).sort("created_at", -1).limit(50))
    
    return [
        FlyerResponse(
            flyer_id=f["_id"],
            flyer_url=f["flyer_url"],
            preview_url=f["preview_url"],
            flyer_type=f["flyer_type"],
            size=f["size"],
            created_at=f["created_at"]
        )
        for f in flyers
    ]

@router.get("/types/list")
async def list_flyer_types():
    return {
        "types": list(FLYER_TEMPLATES.keys()),
        "sizes": list(SIZE_CONFIGS.keys()),
        "templates": FLYER_TEMPLATES
    }