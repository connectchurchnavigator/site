from fastapi import APIRouter
from fastapi.responses import Response
from database import db
from datetime import datetime
import re

router = APIRouter(tags=["sitemap"])

def city_to_slug(city: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', city.lower()).strip('-')

@router.get("/sitemap.xml")
async def get_sitemap():
    base_url = "https://churchnavigator.com"
    
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    xml_lines.append(f'''
  <url>
    <loc>{base_url}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>''')
    
    churches = list(db.churches.find(
        {"status": "active"},
        {"_id": 1, "updatedAt": 1}
    ))
    
    for church in churches:
        lastmod = church.get("updatedAt", datetime.now()).strftime("%Y-%m-%d")
        xml_lines.append(f'''
  <url>
    <loc>{base_url}/church/{str(church["_id"])}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>''')
    
    cities_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$city",
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gte": 3}}}
    ]
    
    cities = list(db.churches.aggregate(cities_pipeline))
    
    for city in cities:
        if city["_id"]:
            city_slug = city_to_slug(city["_id"])
            xml_lines.append(f'''
  <url>
    <loc>{base_url}/churches/{city_slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>''')
    
    xml_lines.append('</urlset>')
    
    xml_content = ''.join(xml_lines)
    
    return Response(content=xml_content, media_type="application/xml")
