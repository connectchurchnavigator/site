import os
import anthropic
from typing import Dict, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

class SiteGenerator:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
    async def generate_site(self, church_slug: str, template: str = 'modern') -> Dict:
        church = await self.db.churches.find_one({'slug': church_slug})
        if not church:
            raise Exception('Church not found')
        
        site = await self.db.church_sites.find_one({'church_slug': church_slug})
        if not site:
            raise Exception('Site configuration not found')
        
        events = await self.db.events.find({'church_id': str(church['_id'])}).sort('date', -1).limit(6).to_list(length=6)
        reviews = await self.db.reviews.find({'church_id': str(church['_id']), 'approved': True}).sort('created_at', -1).limit(3).to_list(length=3)
        
        context = self._build_context(church, events, reviews, template)
        
        pages = {}
        page_names = ['home', 'about', 'team', 'events', 'sermons', 'contact']
        
        for page_name in page_names:
            await self.db.church_sites.update_one(
                {'church_slug': church_slug},
                {'$set': {f'generation_status.{page_name}': 'generating'}}
            )
            
            html = await self._generate_page(page_name, context)
            pages[page_name] = html
            
            await self.db.church_sites.update_one(
                {'church_slug': church_slug},
                {'$set': {f'pages.{page_name}': html, f'generation_status.{page_name}': 'complete'}}
            )
        
        await self.db.church_sites.update_one(
            {'church_slug': church_slug},
            {'$set': {
                'generated_at': datetime.utcnow(),
                'hosting_status': 'active',
                'template': template
            }}
        )
        
        return {'success': True, 'pages': list(pages.keys())}
    
    def _build_context(self, church: Dict, events: List[Dict], reviews: List[Dict], template: str) -> Dict:
        return {
            'church': {
                'name': church.get('name', ''),
                'slug': church.get('slug', ''),
                'tagline': church.get('tagline', 'Welcome to our church family'),
                'description': church.get('description', ''),
                'denomination': church.get('denomination', ''),
                'worship_style': church.get('worship_style', ''),
                'address': church.get('address', {}),
                'contact': church.get('contact', {}),
                'service_times': church.get('service_times', []),
                'pastor_name': church.get('pastor_name', ''),
                'pastor_bio': church.get('pastor_bio', ''),
                'cover_image': church.get('cover_image', ''),
                'gallery_images': church.get('gallery_images', []),
                'social_media': church.get('social_media', {}),
                'location': church.get('location', {}),
                'year_established': church.get('year_established', ''),
                'ministries': church.get('ministries', []),
                'video_url': church.get('video_url', '')
            },
            'events': [{
                'title': e.get('title', ''),
                'date': e.get('date', ''),
                'time': e.get('time', ''),
                'description': e.get('description', ''),
                'location': e.get('location', '')
            } for e in events],
            'reviews': [{
                'author': r.get('author_name', 'Anonymous'),
                'text': r.get('text', ''),
                'rating': r.get('rating', 5)
            } for r in reviews],
            'template': template
        }
    
    async def _generate_page(self, page_name: str, context: Dict) -> str:
        prompts = {
            'home': self._get_home_prompt(context),
            'about': self._get_about_prompt(context),
            'team': self._get_team_prompt(context),
            'events': self._get_events_prompt(context),
            'sermons': self._get_sermons_prompt(context),
            'contact': self._get_contact_prompt(context)
        }
        
        prompt = prompts.get(page_name, '')
        
        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        html = message.content[0].text
        return html
    
    def _get_home_prompt(self, ctx: Dict) -> str:
        return f"""Generate a complete, production-ready HTML home page for {ctx['church']['name']}.

Church details:
- Name: {ctx['church']['name']}
- Tagline: {ctx['church']['tagline']}
- Description: {ctx['church']['description']}
- Cover image: {ctx['church']['cover_image']}
- Service times: {ctx['church']['service_times']}
- Location: {ctx['church']['location']}
- Events: {len(ctx['events'])} upcoming
- Reviews: {len(ctx['reviews'])} testimonials

Template style: {ctx['template']}

Requirements:
1. Full HTML5 document with embedded CSS (no external files)
2. Hero section with cover image, church name, tagline
3. "Join Us This Sunday" with next service countdown timer
4. 3 value cards (Welcome, Community, Faith)
5. Upcoming events section (show {len(ctx['events'])} events)
6. Testimonials section
7. Google Maps embed using location
8. Footer with contact info and social links
9. Fully mobile responsive (use CSS media queries)
10. Navigation bar linking to: Home | About | Team | Events | Sermons | Contact
11. Modern design with gradients, shadows, animations

Return ONLY the complete HTML, no explanations."""
    
    def _get_about_prompt(self, ctx: Dict) -> str:
        return f"""Generate a complete About page for {ctx['church']['name']}.

Details:
- Description: {ctx['church']['description']}
- Denomination: {ctx['church']['denomination']}
- Worship style: {ctx['church']['worship_style']}
- Year established: {ctx['church']['year_established']}
- Ministries: {ctx['church']['ministries']}
- Gallery images: {len(ctx['church']['gallery_images'])} photos

Include:
1. Church story (rewrite description engagingly)
2. Vision & values
3. Photo gallery in masonry grid
4. History timeline if year_established exists
5. Denomination and worship style info
6. Same navigation and footer as home page

Return complete HTML with embedded CSS."""
    
    def _get_team_prompt(self, ctx: Dict) -> str:
        return f"""Generate a Team page for {ctx['church']['name']}.

Pastor: {ctx['church']['pastor_name']}
Bio: {ctx['church']['pastor_bio']}

Include:
1. Senior Pastor card with photo, name, bio
2. Leadership team section
3. "Contact the team" form
4. Same navigation and footer

Return complete HTML."""
    
    def _get_events_prompt(self, ctx: Dict) -> str:
        events_list = '\n'.join([f"- {e['title']}: {e['date']} at {e['time']}" for e in ctx['events']])
        return f"""Generate an Events page for {ctx['church']['name']}.

Upcoming events:
{events_list}

Include:
1. Event cards with date, time, location, description
2. Filter: Upcoming / Past
3. Register buttons linking to ChurchNavigator event page
4. Same navigation and footer

Return complete HTML."""
    
    def _get_sermons_prompt(self, ctx: Dict) -> str:
        return f"""Generate a Sermons page for {ctx['church']['name']}.

Video URL: {ctx['church']['video_url']}

Include:
1. YouTube video embeds
2. Latest 6 videos in grid
3. Subscribe on YouTube CTA
4. Watch on ChurchNavigator link
5. Same navigation and footer

Return complete HTML."""
    
    def _get_contact_prompt(self, ctx: Dict) -> str:
        return f"""Generate a Contact page for {ctx['church']['name']}.

Contact details:
- Address: {ctx['church']['address']}
- Phone: {ctx['church']['contact'].get('phone', '')}
- Email: {ctx['church']['contact'].get('email', '')}
- Service times: {ctx['church']['service_times']}
- Location: {ctx['church']['location']}

Include:
1. Contact form (name, email, subject, message)
2. Full address with Google Maps embed
3. Service times table
4. Phone, email, social media links with icons
5. Directions CTA
6. Same navigation and footer

Return complete HTML."""
