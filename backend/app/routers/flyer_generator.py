from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import anthropic
import os
from datetime import datetime
import qrcode
import io
import base64
from weasyprint import HTML
import tempfile

router = APIRouter(prefix="/api/tools/flyer-generator", tags=["flyer-generator"])

from ..database import get_database

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

class FlyerRequest(BaseModel):
    template: str = "bold"

def generate_qr_code(url: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

def get_flyer_prompt(event_data: dict, template: str, qr_base64: str) -> str:
    speakers_text = ""
    if event_data.get("speakers"):
        speakers_text = "Speakers: " + ", ".join([s.get("name", "Unknown") for s in event_data["speakers"]])
    
    price_text = "FREE" if event_data.get("is_free") else f"£{event_data.get('price', 0)}"
    
    return f"""Generate a complete, self-contained HTML flyer for this church event. Use ONLY inline CSS, no external resources.

Event Details:
- Name: {event_data.get('name', 'Event')}
- Date: {event_data.get('start_date', 'TBA')}
- Time: {event_data.get('start_time', 'TBA')}
- Venue: {event_data.get('venue', {}).get('name', 'TBA')}
- Address: {event_data.get('venue', {}).get('address', '')}
- {speakers_text}
- Price: {price_text}
- Description: {event_data.get('description', '')[:200]}
- Church: {event_data.get('church_name', 'Church')}

Template Style: {template.upper()}
- bold: Vibrant colors, large fonts, energetic (use reds, oranges, blacks)
- minimal: Clean white space, simple typography, modern (use grays, whites, one accent color)
- elegant: Sophisticated serif fonts, muted colors (use burgundy, navy, gold accents)
- gospel: Traditional church aesthetic, crosses, warm tones (use purples, golds, whites)

Requirements:
1. A5 portrait format (148mm x 210mm = 559px x 794px at 96dpi)
2. All CSS inline in <style> tag
3. Event name in LARGE bold text (40-60px)
4. Date/time/venue prominently displayed
5. Price badge: {"green 'FREE' badge" if event_data.get('is_free') else "gold price badge"}
6. Include this QR code (base64): data:image/png;base64,{qr_base64}
7. Small footer: "Powered by ChurchNavigator.com"
8. Church name: {event_data.get('church_name', 'Church')}
9. Use the {template} style template exactly
10. Make it print-ready and visually stunning

Return ONLY the complete HTML, starting with <!DOCTYPE html>. No explanations."""

@router.post("/generate/{event_slug}")
async def generate_flyer(event_slug: str, request: FlyerRequest):
    db = get_database()
    event = db.events.find_one({"slug": event_slug})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_url = f"https://churchnavigator.com/events/{event_slug}"
    qr_base64 = generate_qr_code(event_url)
    
    prompt = get_flyer_prompt(event, request.template, qr_base64)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )
        html_content = message.content[0].text
        
        if not html_content.strip().startswith("<!DOCTYPE") and not html_content.strip().startswith("<html"):
            html_content = "<!DOCTYPE html>\n" + html_content
        
        flyer_doc = {
            "event_id": str(event["_id"]),
            "event_slug": event_slug,
            "template": request.template,
            "html_content": html_content,
            "generated_at": datetime.utcnow(),
            "qr_code": qr_base64
        }
        
        db.flyers.update_one(
            {"event_slug": event_slug, "template": request.template},
            {"$set": flyer_doc},
            upsert=True
        )
        
        return {
            "success": True,
            "html_content": html_content,
            "share_url": f"https://churchnavigator.com/flyers/{event_slug}",
            "template": request.template
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flyer generation failed: {str(e)}")

@router.get("/pdf/{event_slug}")
async def download_pdf(event_slug: str, template: str = "bold"):
    db = get_database()
    flyer = db.flyers.find_one({"event_slug": event_slug, "template": template})
    
    if not flyer:
        raise HTTPException(status_code=404, detail="Flyer not found. Generate it first.")
    
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as html_file:
            html_file.write(flyer["html_content"])
            html_path = html_file.name
        
        pdf_path = html_path.replace('.html', '.pdf')
        HTML(html_path).write_pdf(pdf_path)
        
        os.unlink(html_path)
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"{event_slug}-flyer.pdf",
            background=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.get("/share/{event_slug}", response_class=HTMLResponse)
async def share_flyer(event_slug: str, template: str = "bold"):
    db = get_database()
    flyer = db.flyers.find_one({"event_slug": event_slug, "template": template})
    
    if not flyer:
        return HTMLResponse(
            content="<html><body><h1>Flyer not found</h1><p>This flyer has not been generated yet.</p></body></html>",
            status_code=404
        )
    
    return HTMLResponse(content=flyer["html_content"])

@router.get("/templates")
async def get_templates():
    return {
        "templates": [
            {"id": "bold", "name": "Bold", "description": "Vibrant and energetic"},
            {"id": "minimal", "name": "Minimal", "description": "Clean and modern"},
            {"id": "elegant", "name": "Elegant", "description": "Sophisticated design"},
            {"id": "gospel", "name": "Gospel", "description": "Traditional church aesthetic"}
        ]
    }