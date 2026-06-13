from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

async def generate_sitemap():
    MONGODB_URI = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(MONGODB_URI)
    db_name = "ChurchNavigator" if os.getenv("ENVIRONMENT") == "production" else "DEV-ChurchNavigator"
    db = client[db_name]
    
    base_url = "https://churchnavigator.com"
    urls = [
        f'<url><loc>{base_url}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>',
        f'<url><loc>{base_url}/churches</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'<url><loc>{base_url}/pastors</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'<url><loc>{base_url}/worship-leaders</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'<url><loc>{base_url}/media-teams</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'<url><loc>{base_url}/events</loc><changefreq>daily</changefreq><priority>0.9</priority></url>',
        f'<url><loc>{base_url}/bible-colleges</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        f'<url><loc>{base_url}/planner</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        f'<url><loc>{base_url}/tools</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
    ]
    
    churches = await db.churches.find({}, {"slug": 1}).to_list(length=10000)
    for church in churches:
        urls.append(f'<url><loc>{base_url}/churches/{church["slug"]}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    
    pastors = await db.pastors.find({}, {"slug": 1}).to_list(length=10000)
    for pastor in pastors:
        urls.append(f'<url><loc>{base_url}/pastors/{pastor["slug"]}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>')
    
    worship_leaders = await db.worship_leaders.find({}, {"slug": 1}).to_list(length=5000)
    for wl in worship_leaders:
        urls.append(f'<url><loc>{base_url}/worship-leaders/{wl["slug"]}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>')
    
    media_teams = await db.media_teams.find({}, {"slug": 1}).to_list(length=5000)
    for mt in media_teams:
        urls.append(f'<url><loc>{base_url}/media-teams/{mt["slug"]}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>')
    
    events = await db.events.find({}, {"slug": 1}).to_list(length=10000)
    for event in events:
        urls.append(f'<url><loc>{base_url}/events/{event["slug"]}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>')
    
    colleges = await db.bible_colleges.find({}, {"slug": 1}).to_list(length=1000)
    for college in colleges:
        urls.append(f'<url><loc>{base_url}/bible-colleges/{college["slug"]}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>')
    
    trips = await db.planner_trips.find({"is_public": True}, {"trip_id": 1}).to_list(length=5000)
    for trip in trips:
        urls.append(f'<url><loc>{base_url}/planner/share/{trip["trip_id"]}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>')
    
    cities = ["london", "manchester", "birmingham", "liverpool", "leeds", "glasgow", "edinburgh", "cardiff", "belfast", "bristol"]
    for city in cities:
        urls.append(f'<url><loc>{base_url}/city/{city}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>')
    
    sitemap_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>'''
    
    with open("frontend/public/sitemap.xml", "w") as f:
        f.write(sitemap_xml)
    
    await client.close()
    return len(urls)

if __name__ == "__main__":
    import asyncio
    count = asyncio.run(generate_sitemap())
    print(f"Sitemap generated with {count} URLs")
