import os
import anthropic
from typing import Dict, List
from datetime import datetime

class SiteGenerator:
    def __init__(self, db):
        self.db = db
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    async def generate_site(self, church_slug: str, church_data: Dict = None):
        if not church_data:
            church_data = await self.db.churches.find_one({'slug': church_slug})
        
        if not church_data:
            return {'success': False, 'error': 'Church not found'}
        
        site = await self.db.church_sites.find_one({'church_slug': church_slug})
        template = site.get('template', 'modern') if site else 'modern'
        domain = site.get('domain', f"{church_slug}.churchnavigator.com") if site else f"{church_slug}.churchnavigator.com"
        
        pages = {}
        page_names = ['home', 'about', 'team', 'events', 'sermons', 'contact']
        
        for page_name in page_names:
            await self.db.church_sites.update_one(
                {'church_slug': church_slug},
                {'$set': {f'generation_status.{page_name}': 'generating'}},
                upsert=True
            )
            
            html = await self._generate_page(page_name, church_data, template, domain)
            pages[page_name] = html
            
            await self.db.church_sites.update_one(
                {'church_slug': church_slug},
                {'$set': {f'pages.{page_name}': html, f'generation_status.{page_name}': 'complete'}}
            )
        
        await self.db.church_sites.update_one(
            {'church_slug': church_slug},
            {'$set': {
                'pages': pages,
                'generated_at': datetime.now(),
                'hosting_status': 'ready'
            }}
        )
        
        return {'success': True, 'pages': list(pages.keys())}
    
    async def _generate_page(self, page_name: str, church: Dict, template: str, domain: str) -> str:
        prompt = self._build_prompt(page_name, church, template, domain)
        
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            html = message.content[0].text
            return html
            
        except Exception as e:
            return self._fallback_page(page_name, church, domain)
    
    def _build_prompt(self, page_name: str, church: Dict, template: str, domain: str) -> str:
        name = church.get('name', 'Church')
        description = church.get('description', '')
        denomination = church.get('denomination', '')
        worship_style = church.get('worship_style', '')
        address = church.get('address', {})
        contact = church.get('contact', {})
        
        base_prompt = f"""Generate a complete, production-ready HTML page for {name}.

Church Info:
- Name: {name}
- Description: {description}
- Denomination: {denomination}
- Worship Style: {worship_style}
- Address: {address.get('street', '')}, {address.get('city', '')}, {address.get('postcode', '')}
- Phone: {contact.get('phone', '')}
- Email: {contact.get('email', '')}

Template: {template} (modern and clean design)
Domain: {domain}

Requirements:
- Complete HTML with inline CSS and JavaScript
- Mobile responsive
- Modern UI with gradients and shadows
- Include navigation menu linking to other pages
- Lavender/purple color scheme (#7c3aed primary)
- Professional typography
- All images use placeholder.com
- NO external CSS/JS files -- everything inline
"""
        
        if page_name == 'home':
            return base_prompt + """\n\nPage: HOME\n- Hero section with church name and tagline\n- Next service countdown\n- 3 value cards (Welcome/Community/Faith)\n- Upcoming events section\n- Photo gallery\n- Contact info footer\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        elif page_name == 'about':
            return base_prompt + """\n\nPage: ABOUT\n- Church story section\n- Vision and values\n- History timeline\n- Denomination info\n- Photo gallery\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        elif page_name == 'team':
            pastor = church.get('pastor_name', 'Our Pastor')
            return base_prompt + f"""\n\nPage: TEAM\n- Leadership team section\n- Pastor card: {pastor}\n- Ministry team grid\n- Contact the team form\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        elif page_name == 'events':
            return base_prompt + """\n\nPage: EVENTS\n- Upcoming events grid\n- Event cards with date, time, location\n- Filter: Upcoming / Past\n- Register buttons\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        elif page_name == 'sermons':
            return base_prompt + """\n\nPage: SERMONS\n- Recent sermons grid\n- YouTube video embeds (use placeholder)\n- Series grouping\n- Subscribe on YouTube CTA\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        elif page_name == 'contact':
            return base_prompt + f"""\n\nPage: CONTACT\n- Contact form (name, email, subject, message)\n- Full address with map embed\n- Service times table\n- Phone: {contact.get('phone', '')}\n- Email: {contact.get('email', '')}\n- Social media links\n- Navigation: Home | About | Team | Events | Sermons | Contact"""
        
        return base_prompt
    
    def _fallback_page(self, page_name: str, church: Dict, domain: str) -> str:
        name = church.get('name', 'Church')
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_name.title()} - {name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; }}
        nav {{ background: linear-gradient(135deg, #7c3aed, #a78bfa); padding: 1rem 2rem; }}
        nav a {{ color: white; text-decoration: none; margin: 0 1rem; }}
        .container {{ max-width: 1200px; margin: 0 auto; padding: 2rem; }}
        h1 {{ font-size: 2.5rem; margin-bottom: 1rem; color: #7c3aed; }}
    </style>
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/team">Team</a>
        <a href="/events">Events</a>
        <a href="/sermons">Sermons</a>
        <a href="/contact">Contact</a>
    </nav>
    <div class="container">
        <h1>{page_name.title()}</h1>
        <p>Welcome to {name}. This page is currently being generated.</p>
    </div>
</body>
</html>"""

site_generator = None

def get_site_generator(db):
    global site_generator
    if site_generator is None:
        site_generator = SiteGenerator(db)
    return site_generator