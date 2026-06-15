from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from .routers import churches, events, sites, stripe_webhook
from .database import get_database

app = FastAPI(title="ChurchNavigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(churches.router)
app.include_router(events.router)
app.include_router(sites.router)
app.include_router(stripe_webhook.router)

def inject_signature(html: str, church_slug: str, domain: str) -> str:
    signature_meta = f'''<!-- ChurchNavigator Signature -->
<link rel="canonical" href="https://churchnavigator.com/churches/{church_slug}"/>
<meta name="generator" content="ChurchNavigator Sites"/>'''
    
    signature_html = f'''<div style="background:linear-gradient(135deg,#1e0a4a,#3b1f8c);padding:20px 40px;text-align:center;border-top:3px solid #7c3aed;margin-top:60px">
  <a href="https://churchnavigator.com?ref=sites&utm_source={domain}&utm_medium=footer_badge&utm_campaign=church_sites&utm_content={church_slug}" target="_blank" rel="dofollow" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;padding:12px 24px;background:rgba(124,58,237,.2);border:1px solid rgba(167,139,250,.4);border-radius:14px;backdrop-filter:blur(10px)">
    <span style="font-size:28px">⛪</span>
    <div style="text-align:left">
      <div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:.02em">Built with ChurchNavigator</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:2px">Discover 30,000+ UK churches • churchnavigator.com</div>
    </div>
    <div style="margin-left:8px;font-size:11px;color:#a78bfa;font-weight:700;background:rgba(124,58,237,.3);padding:4px 10px;border-radius:8px">FREE DIRECTORY -></div>
  </a>
  <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.3)">Is this your church? <a href="https://churchnavigator.com/churches/{church_slug}?ref=sites_claim&utm_source={domain}&utm_medium=footer_claim" style="color:rgba(167,139,250,.7);text-decoration:none">Manage your listing on ChurchNavigator</a></div>
</div>'''
    
    html = html.replace("</head>", signature_meta + "</head>", 1)
    html = html.replace("</body>", signature_html + "</body>", 1)
    return html

@app.middleware("http")
async def sites_middleware(request: Request, call_next):
    host = request.headers.get("host", "")
    
    db = await get_database()
    site = await db.church_sites.find_one({
        "domain": host,
        "hosting_status": "active"
    })
    
    if site:
        path = request.url.path.strip("/").replace(".html", "") or "home"
        pages = site.get("pages", {})
        html = pages.get(path, pages.get("home", ""))
        
        if html:
            church_slug = site.get("church_slug", "")
            domain = site.get("domain", "")
            html = inject_signature(html, church_slug, domain)
            
            await db.site_referrals.insert_one({
                "domain": domain,
                "church_slug": church_slug,
                "page": path,
                "visited_at": datetime.now(),
                "ip_hash": hash(request.client.host)
            })
            
            return HTMLResponse(content=html)
    
    return await call_next(request)

@app.get("/")
async def root():
    return {"message": "ChurchNavigator API", "version": "2.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}