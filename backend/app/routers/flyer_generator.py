from fastapi import APIRouter, HTTPException, Response
from app.database import db
from anthropic import Anthropic
import os
from datetime import datetime
from weasyprint import HTML, CSS
import qrcode
import io
import base64
from bson import ObjectId

router = APIRouter(prefix="/api/tools/flyer-generator", tags=["flyer-generator"])
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

TEMPLATE_STYLES = {
    "bold": "Modern, high-contrast design with bold colors, large typography, and geometric shapes. Use vibrant accent colors.",
    "minimal": "Clean, simple design with plenty of white space, subtle colors, and elegant sans-serif fonts. Focus on clarity.",
    "elegant": "Sophisticated design with serif fonts, muted colors, and refined layout. Professional and timeless.",
    "gospel": "Warm, welcoming design with traditional church aesthetics, script fonts for accents, and inspirational imagery through CSS."
}

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
async def generate_flyer(event_slug: str, template: str = "bold"):
    if template not in TEMPLATE_STYLES:
        raise HTTPException(status_code=400, detail="Invalid template")
    
    event = await db.events.find_one({"slug": event_slug})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    church = await db.churches.find_one({"_id": ObjectId(event["church_id"])})
    church_name = church["name"] if church else "Church"
    church_logo = church.get("logo_url", "") if church else ""
    
    event_url = f"https://churchnavigator.com/events/{event_slug}"
    qr_data = generate_qr_code(event_url)
    
    speakers_text = ""
    if event.get("speakers"):
        speakers_list = "\n".join([f"- {s['name']} ({s.get('role', 'Speaker')})" for s in event["speakers"]])
        speakers_text = f"Speakers:\n{speakers_list}"
    
    price_text = "FREE" if event.get("is_free", True) else f"£{event.get('price', 0)}"
    
    prompt = f"""Generate a complete, self-contained HTML flyer for this event. The HTML must be a single file with all CSS inline in a <style> tag.

EVENT DETAILS:
- Name: {event['name']}
- Date: {event.get('start_date', 'TBA')}
- Time: {event.get('start_time', 'TBA')}
- Venue: {event.get('venue', 'TBA')}
- Description: {event.get('description', '')[:200]}
- Price: {price_text}
- {speakers_text}
- Church: {church_name}

DESIGN STYLE: {TEMPLATE_STYLES[template]}

REQUIREMENTS:
1. A5 portrait format (148mm x 210mm = 559px x 794px at 96dpi)
2. Responsive, print-ready layout
3. Include QR code as: <img src="data:image/png;base64,{qr_data}" alt="QR Code" style="width:80px;height:80px;">
4. Display church logo if available: {church_logo}
5. Price badge styled prominently (green if FREE, gold if paid)
6. All CSS must be inline in <style> tag - no external resources
7. Use web-safe fonts only (Arial, Georgia, Helvetica, Times New Roman)
8. Footer: "Powered by ChurchNavigator.com" in small text
9. Use CSS for all visual elements - no external images except logo and QR
10. Make it beautiful and print-ready

Return ONLY the complete HTML, nothing else."""
    
    message = anthropic_client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    html_content = message.content[0].text
    
    flyer_doc = {
        "event_id": str(event["_id"]),
        "event_slug": event_slug,
        "template": template,
        "html_content": html_content,
        "generated_at": datetime.utcnow()
    }
    
    await db.flyers.update_one(
        {"event_slug": event_slug, "template": template},
        {"$set": flyer_doc},
        upsert=True
    )
    
    return {
        "success": True,
        "html_content": html_content,
        "share_url": f"https://churchnavigator.com/flyers/{event_slug}?template={template}",
        "template": template
    }

@router.get("/pdf/{event_slug}")
async def download_pdf(event_slug: str, template: str = "bold"):
    flyer = await db.flyers.find_one({"event_slug": event_slug, "template": template})
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
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.get("/share/{event_slug}")
async def get_flyer_html(event_slug: str, template: str = "bold"):
    flyer = await db.flyers.find_one({"event_slug": event_slug, "template": template})
    if not flyer:
        raise HTTPException(status_code=404, detail="Flyer not found")
    
    return Response(content=flyer["html_content"], media_type="text/html")

@router.get("/list/{event_slug}")
async def list_flyers(event_slug: str):
    flyers = await db.flyers.find({"event_slug": event_slug}).to_list(length=10)
    return {
        "event_slug": event_slug,
        "flyers": [
            {
                "template": f["template"],
                "generated_at": f["generated_at"],
                "share_url": f"https://churchnavigator.com/flyers/{event_slug}?template={f['template']}"
            }
            for f in flyers
        ]
    }