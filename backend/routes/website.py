from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import hashlib
from backend.database import db
from backend.models import Church

router = APIRouter(prefix="/api/website", tags=["website"])

website_cache: Dict[str, Dict[str, Any]] = {}

THEMES = {
    "classic": {
        "name": "Classic",
        "colors": {"primary": "#1a365d", "secondary": "#2c5282", "accent": "#805ad5", "bg": "#ffffff", "text": "#2d3748"},
        "fonts": {"heading": "Georgia, serif", "body": "Arial, sans-serif"}
    },
    "modern": {
        "name": "Modern",
        "colors": {"primary": "#1a202c", "secondary": "#2d3748", "accent": "#9333ea", "bg": "#0f0f0f", "text": "#e2e8f0"},
        "fonts": {"heading": "'Inter', sans-serif", "body": "'Inter', sans-serif"}
    },
    "warm": {
        "name": "Warm",
        "colors": {"primary": "#78350f", "secondary": "#92400e", "accent": "#d97706", "bg": "#fffbeb", "text": "#451a03"},
        "fonts": {"heading": "'Merriweather', serif", "body": "'Open Sans', sans-serif"}
    },
    "bold": {
        "name": "Bold",
        "colors": {"primary": "#dc2626", "secondary": "#ea580c", "accent": "#f59e0b", "bg": "#fef3c7", "text": "#1f2937"},
        "fonts": {"heading": "'Poppins', sans-serif", "body": "'Roboto', sans-serif"}
    },
    "minimal": {
        "name": "Minimal",
        "colors": {"primary": "#000000", "secondary": "#404040", "accent": "#737373", "bg": "#fafafa", "text": "#171717"},
        "fonts": {"heading": "'Playfair Display', serif", "body": "'Lato', sans-serif"}
    }
}

class WebsiteSettings(BaseModel):
    theme: str = "classic"
    sections: Dict[str, bool] = {
        "hero": True, "about": True, "services": True, "pastor": True,
        "teams": True, "ministries": True, "gallery": True, "events": True,
        "location": True, "contact": True
    }
    custom_domain: Optional[str] = None
    published: bool = False

class CustomDomainRequest(BaseModel):
    domain: str

class ContactFormSubmission(BaseModel):
    name: str
    email: str
    message: str

def get_cache_key(slug: str) -> str:
    return f"website_{slug}"

def invalidate_cache(slug: str):
    key = get_cache_key(slug)
    if key in website_cache:
        del website_cache[key]

def get_cached_html(slug: str) -> Optional[str]:
    key = get_cache_key(slug)
    if key in website_cache:
        cached = website_cache[key]
        if datetime.utcnow() < cached["expires"]:
            return cached["html"]
        else:
            del website_cache[key]
    return None

def set_cached_html(slug: str, html: str):
    key = get_cache_key(slug)
    website_cache[key] = {
        "html": html,
        "expires": datetime.utcnow() + timedelta(hours=1)
    }

def render_website_html(church: dict, settings: dict) -> str:
    theme = THEMES.get(settings.get("theme", "classic"), THEMES["classic"])
    sections = settings.get("sections", {})
    colors = theme["colors"]
    fonts = theme["fonts"]
    
    hero_html = ""
    if sections.get("hero", True):
        cover_image = church.get("cover_image") or (church.get("photos", [{}])[0].get("url") if church.get("photos") else "")
        hero_html = f'''
        <section id="hero" style="position:relative;height:80vh;background:linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('{cover_image}') center/cover;display:flex;align-items:center;justify-content:center;color:#fff;text-align:center;">
            <div style="max-width:800px;padding:0 20px;">
                <h1 style="font-family:{fonts['heading']};font-size:3.5rem;margin:0 0 1rem;text-shadow:2px 2px 4px rgba(0,0,0,0.7);">{church.get('name', '')}</h1>
                <p style="font-size:1.5rem;margin:0 0 2rem;">{church.get('tagline', 'Welcome Home')}</p>
                <a href="#contact" style="background:{colors['accent']};color:#fff;padding:15px 40px;text-decoration:none;border-radius:50px;font-weight:600;display:inline-block;">Visit Us</a>
            </div>
        </section>
        '''
    
    about_html = ""
    if sections.get("about", True) and church.get("description"):
        about_html = f'''
        <section id="about" style="padding:80px 20px;max-width:1200px;margin:0 auto;">
            <h2 style="font-family:{fonts['heading']};color:{colors['primary']};font-size:2.5rem;text-align:center;margin:0 0 3rem;">About Us</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;">
                <div>
                    <p style="font-size:1.1rem;line-height:1.8;color:{colors['text']};">{church.get('description', '')}</p>
                    <div style="margin-top:2rem;">
                        {f"<p><strong>Denomination:</strong> {church.get('denomination', 'N/A')}</p>" if church.get('denomination') else ""}
                        {f"<p><strong>Founded:</strong> {church.get('founded_year', 'N/A')}</p>" if church.get('founded_year') else ""}
                    </div>
                </div>
                <div>
                    <img src="{church.get('photos', [{}])[1].get('url') if len(church.get('photos', [])) > 1 else church.get('cover_image', '')}" style="width:100%;border-radius:10px;" alt="Church">
                </div>
            </div>
        </section>
        '''
    
    services_html = ""
    if sections.get("services", True) and church.get("service_times"):
        services_list = "".join([f"<div style='background:#fff;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;'><h3 style='color:{colors['primary']};margin:0 0 10px;'>{s.get('day', '')}</h3><p style='margin:0;font-size:1.1rem;'>{s.get('time', '')}</p><p style='margin:5px 0 0;color:#666;'>{s.get('type', '')}</p></div>" for s in church.get("service_times", [])])
        services_html = f'''
        <section id="services" style="padding:80px 20px;background:{colors['bg']};">
            <div style="max-width:1200px;margin:0 auto;">
                <h2 style="font-family:{fonts['heading']};color:{colors['primary']};font-size:2.5rem;text-align:center;margin:0 0 3rem;">Service Times</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:30px;">{services_list}</div>
            </div>
        </section>
        '''
    
    pastor_html = ""
    if sections.get("pastor", True) and church.get("pastor_name"):
        pastor_html = f'''
        <section id="pastor" style="padding:80px 20px;max-width:1200px;margin:0 auto;">
            <h2 style="font-family:{fonts['heading']};color:{colors['primary']};font-size:2.5rem;text-align:center;margin:0 0 3rem;">Meet Our Pastor</h2>
            <div style="display:flex;align-items:center;gap:40px;background:#fff;padding:40px;border-radius:15px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                <img src="{church.get('pastor_photo', '')}" style="width:200px;height:200px;border-radius:50%;object-fit:cover;" alt="Pastor">
                <div>
                    <h3 style="color:{colors['primary']};font-size:2rem;margin:0 0 10px;">{church.get('pastor_name', '')}</h3>
                    <p style="color:#666;font-size:1.1rem;margin:0 0 20px;">{church.get('pastor_title', 'Lead Pastor')}</p>
                    <p style="line-height:1.8;">{church.get('pastor_bio', '')}</p>
                </div>
            </div>
        </section>
        '''
    
    location_html = ""
    if sections.get("location", True) and church.get("address"):
        addr = church.get("address", {})
        full_address = f"{addr.get('street', '')}, {addr.get('city', '')}, {addr.get('postcode', '')}"
        location_html = f'''
        <section id="location" style="padding:80px 20px;background:{colors['bg']};">
            <div style="max-width:1200px;margin:0 auto;">
                <h2 style="font-family:{fonts['heading']};color:{colors['primary']};font-size:2.5rem;text-align:center;margin:0 0 3rem;">Find Us</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
                    <div>
                        <h3 style="color:{colors['primary']};margin:0 0 20px;">Address</h3>
                        <p style="font-size:1.1rem;line-height:1.8;">{full_address}</p>
                        {f"<p style='margin-top:20px;'><strong>Phone:</strong> {church.get('phone', '')}</p>" if church.get('phone') else ""}
                        {f"<p><strong>Email:</strong> {church.get('email', '')}</p>" if church.get('email') else ""}
                    </div>
                    <div>
                        <iframe src="https://maps.google.com/maps?q={full_address}&output=embed" width="100%" height="400" style="border:0;border-radius:10px;" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
        </section>
        '''
    
    contact_html = ""
    if sections.get("contact", True):
        contact_html = f'''
        <section id="contact" style="padding:80px 20px;max-width:800px;margin:0 auto;">
            <h2 style="font-family:{fonts['heading']};color:{colors['primary']};font-size:2.5rem;text-align:center;margin:0 0 3rem;">Get In Touch</h2>
            <form id="contactForm" style="background:#fff;padding:40px;border-radius:15px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                <input type="text" name="name" placeholder="Your Name" required style="width:100%;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:5px;font-size:1rem;">
                <input type="email" name="email" placeholder="Your Email" required style="width:100%;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:5px;font-size:1rem;">
                <textarea name="message" placeholder="Your Message" required rows="6" style="width:100%;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:5px;font-size:1rem;resize:vertical;"></textarea>
                <button type="submit" style="background:{colors['accent']};color:#fff;padding:15px 40px;border:none;border-radius:50px;font-size:1.1rem;font-weight:600;cursor:pointer;width:100%;">Send Message</button>
            </form>
        </section>
        <script>
        document.getElementById('contactForm').addEventListener('submit', async (e) => {{
            e.preventDefault();
            const data = {{
                name: e.target.name.value,
                email: e.target.email.value,
                message: e.target.message.value
            }};
            const res = await fetch('/api/website/{church.get('slug', '')}/contact', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify(data)
            }});
            if (res.ok) {{
                alert('Thank you! We will get back to you soon.');
                e.target.reset();
            }} else {{
                alert('Something went wrong. Please try again.');
            }}
        }});
        </script>
        '''
    
    footer_html = f'''
    <footer style="background:{colors['primary']};color:#fff;padding:40px 20px;text-align:center;">
        <div style="max-width:1200px;margin:0 auto;">
            <p style="margin:0 0 20px;font-size:1.1rem;">{church.get('name', '')}</p>
            <div style="margin:20px 0;">
                {f"<a href='{church.get('social_media', {}).get('facebook', '')}' style='color:#fff;margin:0 10px;font-size:1.5rem;'>📘</a>" if church.get('social_media', {}).get('facebook') else ""}
                {f"<a href='{church.get('social_media', {}).get('instagram', '')}' style='color:#fff;margin:0 10px;font-size:1.5rem;'>📷</a>" if church.get('social_media', {}).get('instagram') else ""}
                {f"<a href='{church.get('social_media', {}).get('twitter', '')}' style='color:#fff;margin:0 10px;font-size:1.5rem;'>🐦</a>" if church.get('social_media', {}).get('twitter') else ""}
            </div>
            <p style="margin:20px 0 0;font-size:0.9rem;opacity:0.8;">© {datetime.now().year} {church.get('name', '')}. Powered by <a href="https://churchnavigator.com" style="color:#fff;">ChurchNavigator</a></p>
        </div>
    </footer>
    '''
    
    html = f'''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{church.get('name', '')} - {church.get('tagline', 'Welcome')}</title>
        <meta name="description" content="{church.get('description', '')[:160]}">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&family=Poppins:wght@400;600;700&family=Roboto:wght@400;500&family=Lato:wght@400;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
        <style>
            * {{ margin:0; padding:0; box-sizing:border-box; }}
            body {{ font-family:{fonts['body']}; color:{colors['text']}; background:{colors['bg']}; line-height:1.6; }}
            a {{ color:{colors['accent']}; }}
            @media (max-width: 768px) {{
                #hero h1 {{ font-size: 2rem !important; }}
                #about > div, #location > div > div {{ grid-template-columns: 1fr !important; }}
            }}
        </style>
    </head>
    <body>
        {hero_html}
        {about_html}
        {services_html}
        {pastor_html}
        {location_html}
        {contact_html}
        {footer_html}
    </body>
    </html>
    '''
    return html

@router.get("/{slug}", response_class=HTMLResponse)
async def get_website(slug: str):
    cached = get_cached_html(slug)
    if cached:
        return HTMLResponse(content=cached)
    
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    settings = church.get("website_settings", {})
    if not settings.get("published", False):
        raise HTTPException(status_code=404, detail="Website not published")
    
    html = render_website_html(church, settings)
    set_cached_html(slug, html)
    return HTMLResponse(content=html)

@router.get("/{slug}/preview", response_class=HTMLResponse)
async def preview_website(slug: str, request: Request):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    settings = church.get("website_settings", {})
    html = render_website_html(church, settings)
    return HTMLResponse(content=html)

@router.get("/{slug}/settings")
async def get_website_settings(slug: str):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    settings = church.get("website_settings", {
        "theme": "classic",
        "sections": {"hero": True, "about": True, "services": True, "pastor": True, "teams": True, "ministries": True, "gallery": True, "events": True, "location": True, "contact": True},
        "custom_domain": None,
        "published": False
    })
    return {"settings": settings, "themes": THEMES}

@router.put("/{slug}/settings")
async def update_website_settings(slug: str, settings: WebsiteSettings):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one(
        {"slug": slug},
        {"$set": {"website_settings": settings.dict()}}
    )
    invalidate_cache(slug)
    return {"message": "Settings updated", "settings": settings.dict()}

@router.post("/{slug}/publish")
async def publish_website(slug: str):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    await db.churches.update_one(
        {"slug": slug},
        {"$set": {"website_settings.published": True}}
    )
    invalidate_cache(slug)
    return {"message": "Website published", "url": f"https://churchnavigator.com/site/{slug}"}

@router.post("/{slug}/domain")
async def add_custom_domain(slug: str, domain_request: CustomDomainRequest):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    if not church.get("is_pro", False):
        raise HTTPException(status_code=403, detail="Custom domains require Pro subscription")
    
    await db.churches.update_one(
        {"slug": slug},
        {"$set": {"website_settings.custom_domain": domain_request.domain}}
    )
    return {
        "message": "Custom domain added",
        "domain": domain_request.domain,
        "dns_instructions": {
            "type": "CNAME",
            "name": "www",
            "value": "churchnavigator.com"
        }
    }

@router.post("/{slug}/contact")
async def submit_contact_form(slug: str, submission: ContactFormSubmission):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    contact_data = {
        "church_id": str(church["_id"]),
        "church_slug": slug,
        "name": submission.name,
        "email": submission.email,
        "message": submission.message,
        "submitted_at": datetime.utcnow(),
        "read": False
    }
    
    await db.contact_submissions.insert_one(contact_data)
    return {"message": "Contact form submitted successfully"}

@router.get("/{slug}/embed")
async def get_embed_widget(slug: str):
    church = await db.churches.find_one({"slug": slug})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    embed_html = f'''
    <div style="border:2px solid #e2e8f0;border-radius:10px;padding:20px;max-width:400px;font-family:Arial,sans-serif;">
        <h3 style="margin:0 0 10px;">{church.get('name', '')}</h3>
        <p style="margin:0 0 15px;color:#666;">{church.get('tagline', '')}</p>
        <a href="https://churchnavigator.com/site/{slug}" target="_blank" style="background:#9333ea;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Visit Our Website</a>
    </div>
    '''
    
    return {"html": embed_html, "script": f'<script src="https://churchnavigator.com/embed/{slug}.js"></script>'}
