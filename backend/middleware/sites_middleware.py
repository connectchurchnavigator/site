from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import HTMLResponse
from database import db
import re

SIGNATURE_HTML = '''
<div style="background:linear-gradient(135deg,#1e0a4a,#3b1f8c);padding:20px 40px;text-align:center;border-top:3px solid #7c3aed;margin-top:60px">
  <a href="https://churchnavigator.com?ref=sites&utm_source={domain}&utm_medium=footer_badge&utm_campaign=church_sites&utm_content={church_slug}" target="_blank" rel="dofollow" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;padding:12px 24px;background:rgba(124,58,237,.2);border:1px solid rgba(167,139,250,.4);border-radius:14px;backdrop-filter:blur(10px)">
    <span style="font-size:28px">⛪</span>
    <div style="text-align:left">
      <div style="font-size:14px;font-weight:800;color:#fff;letter-spacing:.02em">Built with ChurchNavigator</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:2px">Discover 30,000+ UK churches • churchnavigator.com</div>
    </div>
    <div style="margin-left:8px;font-size:11px;color:#a78bfa;font-weight:700;background:rgba(124,58,237,.3);padding:4px 10px;border-radius:8px">FREE DIRECTORY -></div>
  </a>
  <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.3)">Is this your church? <a href="https://churchnavigator.com/churches/{church_slug}?ref=sites_claim&utm_source={domain}&utm_medium=footer_claim" style="color:rgba(167,139,250,.7);text-decoration:none">Manage your listing on ChurchNavigator</a></div>
</div>
'''

META_SIGNATURE = '''
<link rel="canonical" href="https://churchnavigator.com/churches/{church_slug}"/>
<meta name="generator" content="ChurchNavigator Sites"/>
'''

class SitesMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        host = request.headers.get('host', '')
        
        if host.startswith('www.'):
            host = host[4:]
        
        site = await db.church_sites.find_one({
            'domain': host,
            'hosting_status': 'active'
        })
        
        if site:
            church = await db.churches.find_one({'_id': site['church_id']})
            if not church:
                return await call_next(request)
            
            path = request.url.path.strip('/')
            
            if not path or path == 'index.html':
                page = 'home'
            else:
                page = path.replace('.html', '')
            
            html = site.get('pages', {}).get(page, site.get('pages', {}).get('home', '<h1>Site not found</h1>'))
            
            html = self._inject_signature(html, church['slug'], host)
            
            await db.site_analytics.update_one(
                {'church_id': site['church_id'], 'date': {'$gte': datetime.utcnow().replace(hour=0, minute=0, second=0)}},
                {'$inc': {'page_views': 1, f'pages.{page}': 1}},
                upsert=True
            )
            
            return HTMLResponse(content=html)
        
        return await call_next(request)
    
    def _inject_signature(self, html: str, church_slug: str, domain: str) -> str:
        meta_sig = META_SIGNATURE.format(church_slug=church_slug)
        if '<head>' in html and '</head>' in html:
            html = html.replace('</head>', meta_sig + '</head>', 1)
        
        footer_sig = SIGNATURE_HTML.format(church_slug=church_slug, domain=domain)
        if '</body>' in html:
            html = html.replace('</body>', footer_sig + '</body>', 1)
        
        return html

from datetime import datetime