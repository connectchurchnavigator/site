from fastapi import Request
from fastapi.responses import HTMLResponse
from database import db

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

def inject_signature(html: str, church_slug: str, domain: str) -> str:
    meta_signature = f'''<link rel="canonical" href="https://churchnavigator.com/churches/{church_slug}"/>
<meta name="generator" content="ChurchNavigator Sites"/>'''
    html = html.replace('</head>', meta_signature + '</head>', 1)
    html = html.replace('</body>', SIGNATURE_HTML.format(church_slug=church_slug, domain=domain) + '</body>', 1)
    return html

async def sites_middleware(request: Request, call_next):
    host = request.headers.get('host', '')
    
    site = await db.church_sites.find_one({
        'domain': host,
        'hosting_status': 'active'
    })
    
    if site:
        path = request.url.path.strip('/')
        page = path if path else 'home'
        
        pages = site.get('pages', {})
        html = pages.get(page, pages.get('home', ''))
        
        if html:
            html = inject_signature(html, site.get('church_slug', ''), site.get('domain', ''))
            
            await db.site_visits.insert_one({
                'domain': host,
                'church_slug': site.get('church_slug', ''),
                'page': page,
                'visited_at': datetime.utcnow(),
                'user_agent': request.headers.get('user-agent', ''),
                'referer': request.headers.get('referer', '')
            })
            
            return HTMLResponse(content=html)
    
    response = await call_next(request)
    return response
