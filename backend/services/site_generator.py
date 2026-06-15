import anthropic
import os
from typing import Dict, List
import json

class SiteGenerator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    async def generate_site(self, church_data: Dict, template: str = 'modern') -> Dict:
        pages = {}
        
        prompts = {
            'home': self._build_home_prompt(church_data, template),
            'about': self._build_about_prompt(church_data, template),
            'team': self._build_team_prompt(church_data, template),
            'events': self._build_events_prompt(church_data, template),
            'sermons': self._build_sermons_prompt(church_data, template),
            'contact': self._build_contact_prompt(church_data, template)
        }
        
        for page_name, prompt in prompts.items():
            html = await self._generate_page(prompt, church_data, template)
            pages[page_name] = html
        
        return pages
    
    async def _generate_page(self, prompt: str, church_data: Dict, template: str) -> str:
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        html = message.content[0].text
        html = self._inject_base_styles(html, template)
        return html
    
    def _build_home_prompt(self, church: Dict, template: str) -> str:
        return f"""Generate a complete HTML page for a church home page.

Church: {church.get('name')}
Tagline: {church.get('tagline', 'Welcome to our church community')}
Description: {church.get('description', '')}
Next Service: {church.get('service_times', [{}])[0] if church.get('service_times') else 'Sunday 10:00 AM'}
Address: {church.get('address', {})}

Template style: {template}

Include:
1. Hero section with church name and tagline
2. Next service countdown
3. 3 value cards (Welcome, Community, Faith)
4. Upcoming events section
5. Photo gallery strip
6. Map embed using lat/lng
7. Footer with contact

Return ONLY the complete HTML with inline CSS. Use modern responsive design."""
    
    def _build_about_prompt(self, church: Dict, template: str) -> str:
        return f"""Generate a complete HTML about page.

Church: {church.get('name')}
Description: {church.get('description', '')}
Denomination: {church.get('denomination', '')}
Year Established: {church.get('year_established', '')}
Ministries: {', '.join(church.get('ministries', []))}

Template style: {template}

Include:
1. Church story section
2. Vision & values
3. Photo gallery (masonry grid)
4. History timeline if year_established exists
5. Denomination info

Return ONLY complete HTML with inline CSS."""
    
    def _build_team_prompt(self, church: Dict, template: str) -> str:
        pastor = church.get('pastor_name', 'Our Pastor')
        return f"""Generate a complete HTML team page.

Church: {church.get('name')}
Senior Pastor: {pastor}
Pastor Bio: {church.get('pastor_bio', '')}

Template style: {template}

Include:
1. Senior pastor card with photo placeholder
2. Leadership team section
3. Ministry team
4. Contact form

Return ONLY complete HTML with inline CSS."""
    
    def _build_events_prompt(self, church: Dict, template: str) -> str:
        return f"""Generate a complete HTML events page.

Church: {church.get('name')}

Template style: {template}

Include:
1. Events will be loaded dynamically from ChurchNavigator API
2. Filter tabs: Upcoming / Past
3. Event card grid
4. Register buttons linking to ChurchNavigator
5. Empty state message

Return ONLY complete HTML with inline CSS and JavaScript for API calls."""
    
    def _build_sermons_prompt(self, church: Dict, template: str) -> str:
        return f"""Generate a complete HTML sermons page.

Church: {church.get('name')}
YouTube: {church.get('youtube_url', '')}

Template style: {template}

Include:
1. Latest sermon videos (YouTube embeds)
2. Series grouping
3. Subscribe CTA
4. Link to ChurchNavigator for more

Return ONLY complete HTML with inline CSS."""
    
    def _build_contact_prompt(self, church: Dict, template: str) -> str:
        address = church.get('address', {})
        return f"""Generate a complete HTML contact page.

Church: {church.get('name')}
Address: {address.get('street', '')}, {address.get('city', '')}, {address.get('postcode', '')}
Phone: {church.get('phone', '')}
Email: {church.get('email', '')}
Service Times: {church.get('service_times', [])}

Template style: {template}

Include:
1. Contact form (name, email, subject, message)
2. Full address with map embed
3. Service times table
4. Phone, email, social links
5. Directions CTA

Return ONLY complete HTML with inline CSS and form handling JavaScript."""
    
    def _inject_base_styles(self, html: str, template: str) -> str:
        base_css = """
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
a { text-decoration: none; color: inherit; }
img { max-width: 100%; height: auto; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
@media (max-width: 768px) { .container { padding: 0 15px; } }
</style>
"""
        if '<head>' in html:
            html = html.replace('</head>', base_css + '</head>', 1)
        return html

site_generator = SiteGenerator()