import sys
import asyncio
from pathlib import Path

# Add backend to path to import the server logic
backend_dir = Path(__file__).parent / "backend"
sys.path.append(str(backend_dir))

from server import get_sitemap

async def generate():
    print("Generating dynamic sitemap from database...")
    response = await get_sitemap()
    
    # Extract XML content
    content = response.body.decode("utf-8") if isinstance(response.body, bytes) else response.body
    
    # Write to frontend public directory
    out_path = Path(__file__).parent / "frontend" / "public" / "sitemap.xml"
    out_path.write_text(content, encoding="utf-8")
    
    print(f"Sitemap successfully written to {out_path}")
    print("Now when you build/deploy your frontend, the sitemap will be served correctly!")

if __name__ == "__main__":
    asyncio.run(generate())
