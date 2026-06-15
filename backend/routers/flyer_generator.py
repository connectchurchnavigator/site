from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import anthropic
import os
import qrcode
import io
import base64
from weasyprint import HTML
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/tools/flyer-generator", tags=["flyer-generator"])

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "DEV-ChurchNavigator")
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
events_collection = db["events"]
flyers_collection = db["flyers"]

anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

TEMPLATE_STYLES = {
    "bold": "Modern, high-contrast design with large typography, vibrant colors (deep purple #5B21B6, gold #F59E0B), bold sans-serif fonts, geometric shapes, and strong visual hierarchy. Event name dominates the top third.",
    "minimal": "Clean, minimalist design with ample white space, thin elegant serif fonts, muted colors (navy #1E293B, warm gray #78716C), simple lines, understated elegance. Focus on typography and spacing.",
    "elegant": "Sophisticated design with ornamental borders, script/serif font combinations, soft color palette (burgundy #881337, cream #FEF3C7, sage green #84CC16), decorative elements, refined and formal aesthetic.",
    "gospel": "Traditional gospel style with warm earth tones (burnt orange #EA580C, golden yellow #FCD34D, deep brown #78350F), inspirational imagery suggestions (dove, cross, light rays in CSS), bold serif fonts, welcoming and spiritual feel."
}

class GenerateFlyerRequest(BaseModel):
    template: str = "bold"

def generate_qr_code(url: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

@router.post("/generate/{event_slug}")
async def generate_flyer(event_slug: str, request: GenerateFlyerRequest):
    event = await events_collection.find_one({"slug": event_slug})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if request.template not in TEMPLATE_STYLES:
        raise HTTPException(status_code=400, detail="Invalid template")
    
    event_url = f"https://churchnavigator.com/events/{event_slug}"
    qr_base64 = generate_qr_code(event_url)
    
    existing_flyer = await flyers_collection.find_one({
        "event_id": str(event["_id"]),
        "template": request.template
    })
    
    if existing_flyer and (datetime.utcnow() - existing_flyer["generated_at"]).days < 7:
        return {
            "event_slug": event_slug,
            "template": request.template,
            "html_content": existing_flyer["html_content"],
            "share_url": f"https://churchnavigator.com/flyers/{event_slug}",
            "cached": True
        }
    
    event_date = event.get("date", "TBA")
    if isinstance(event_date, datetime):
        event_date = event_date.strftime("%A, %B %d, %Y")
    
    speakers_text = ""
    if event.get("speakers"):
        speakers_text = "Speakers: " + ", ".join(event["speakers"])
    
    price_text = "FREE" if event.get("is_free", True) else f"£{event.get('price', '0')}"
    
    prompt = f"""Generate a complete, self-contained HTML flyer for this event. Return ONLY the HTML code, no explanations.

EVENT DETAILS:
- Name: {event.get('name', 'Untitled Event')}
- Date: {event_date}
- Time: {event.get('time', 'TBA')}
- Venue: {event.get('venue', 'TBA')}
- Church: {event.get('church_name', 'Church')}
- Description: {event.get('description', '')[:200]}
- {speakers_text}
- Price: {price_text}

STYLE: {TEMPLATE_STYLES[request.template]}

REQUIREMENTS:
1. A5 portrait format (148mm x 210mm = 595px x 842px at 96dpi)
2. Single HTML file with inline CSS (no external dependencies)
3. Event name prominent at top
4. Date/time/venue clearly displayed
5. Price badge (green for FREE, gold for paid) positioned top-right
6. Include this QR code as base64 img: data:image/png;base64,{qr_base64}
7. QR code labeled "Scan to Register"
8. Church name at bottom
9. Small footer: "Powered by ChurchNavigator.com"
10. Print-ready quality
11. All fonts must be web-safe or use Google Fonts CDN
12. Responsive but optimized for A5 print

Return complete HTML starting with <!DOCTYPE html>."""
    
    try:
        message = anthropic_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        html_content = message.content[0].text.strip()
        
        if not html_content.startswith("<!DOCTYPE") and not html_content.startswith("<html"):
            html_content = "<!DOCTYPE html>\n" + html_content
        
        flyer_doc = {
            "event_id": str(event["_id"]),
            "event_slug": event_slug,
            "template": request.template,
            "html_content": html_content,
            "generated_at": datetime.utcnow()
        }
        
        if existing_flyer:
            await flyers_collection.update_one(
                {"_id": existing_flyer["_id"]},
                {"$set": flyer_doc}
            )
        else:
            await flyers_collection.insert_one(flyer_doc)
        
        return {
            "event_slug": event_slug,
            "template": request.template,
            "html_content": html_content,
            "share_url": f"https://churchnavigator.com/flyers/{event_slug}",
            "cached": False
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flyer: {str(e)}")

@router.get("/pdf/{event_slug}")
async def download_pdf(event_slug: str, template: str = "bold"):
    flyer = await flyers_collection.find_one({
        "event_slug": event_slug,
        "template": template
    })
    
    if not flyer:
        raise HTTPException(status_code=404, detail="Flyer not found. Generate it first.")
    
    try:
        pdf_bytes = HTML(string=flyer["html_content"]).write_pdf()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={event_slug}-flyer.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.get("/share/{event_slug}")
async def get_shareable_flyer(event_slug: str, template: str = "bold"):
    flyer = await flyers_collection.find_one({
        "event_slug": event_slug,
        "template": template
    })
    
    if not flyer:
        raise HTTPException(status_code=404, detail="Flyer not found")
    
    return Response(
        content=flyer["html_content"],
        media_type="text/html"
    )
