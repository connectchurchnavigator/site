from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
import time
import logging
import hashlib
from services.cache_service import cache_get, cache_set, cache_delete_pattern
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(tags=["church-sites"])

def inject_signature(html: str, church_slug: str, domain: str) -> str:
    signature = f'<div style="position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:white;padding:8px 12px;border-radius:4px;font-size:11px;z-index:9999;">Powered by <a href="https://churchnavigator.com/churches/{church_slug}" target="_blank" style="color:#4CAF50;text-decoration:none;">ChurchNavigator.com</a></div>'
    if "</body>" in html:
        return html.replace("</body>", f"{signature}</body>")
    return html + signature

@router.get("/sites/{domain}/{page_path:path}")
async def serve_church_site(domain: str, page_path: str = ""):
    start = time.time()
    page = page_path or "home"
    cache_key = f"site:{domain}:{page}"
    
    cached = await cache_get(cache_key)
    if cached:
        elapsed = (time.time() - start) * 1000
        logger.info(f"Cache hit: {cache_key} in {elapsed:.1f}ms")
        return HTMLResponse(content=cached)
    
    db = await get_database()
    site = await db.church_sites.find_one({"domain": domain, "hosting_status": "active"})
    
    if not site:
        raise HTTPException(status_code=404, detail="Church site not found")
    
    church = await db.churches.find_one({"_id": site["church_id"]})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    
    html = site.get("pages", {}).get(page)
    if not html:
        html = site.get("pages", {}).get("home", "<html><body><h1>Page not found</h1></body></html>")
    
    html = inject_signature(html, church.get("slug", ""), domain)
    
    await cache_set(cache_key, html, ttl=86400)
    
    elapsed = (time.time() - start) * 1000
    if elapsed > 200:
        logger.warning(f"SLOW: serve_church_site took {elapsed:.0f}ms")
    else:
        logger.info(f"serve_church_site took {elapsed:.0f}ms")
    
    return HTMLResponse(content=html)

@router.post("/sites/{domain}/clear-cache")
async def clear_site_cache(domain: str):
    deleted = await cache_delete_pattern(f"site:{domain}:*")
    return {"ok": True, "message": f"Cleared {deleted} cached pages for {domain}"}