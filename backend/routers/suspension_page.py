from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(tags=["suspension"])

mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = mongo_client.ChurchNavigator

@router.get("/suspended/{domain}")
async def get_suspension_page(domain: str):
    church = await db.churches.find_one({"custom_domain": domain})
    
    if not church:
        return HTMLResponse(content="Church not found", status_code=404)
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{church['name']} - Temporarily Paused</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                max-width: 600px;
                width: 100%;
                padding: 48px;
                text-align: center;
            }}
            .icon {{
                font-size: 64px;
                margin-bottom: 24px;
            }}
            h1 {{
                font-size: 32px;
                color: #2c3e50;
                margin-bottom: 16px;
            }}
            .subtitle {{
                font-size: 18px;
                color: #7f8c8d;
                margin-bottom: 32px;
            }}
            .section {{
                background: #f8f9fa;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: left;
            }}
            .section h2 {{
                font-size: 18px;
                color: #2c3e50;
                margin-bottom: 16px;
            }}
            .section p {{
                color: #555;
                line-height: 1.6;
                margin-bottom: 12px;
            }}
            .contact-info {{
                display: flex;
                flex-direction: column;
                gap: 8px;
            }}
            .contact-item {{
                display: flex;
                align-items: center;
                gap: 8px;
                color: #555;
            }}
            .btn {{
                display: inline-block;
                background: #8b5cf6;
                color: white;
                padding: 14px 32px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                transition: background 0.2s;
                margin: 8px;
            }}
            .btn:hover {{
                background: #7c3aed;
            }}
            .btn-secondary {{
                background: #6c757d;
            }}
            .btn-secondary:hover {{
                background: #5a6268;
            }}
            .footer {{
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #e9ecef;
                color: #7f8c8d;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🙏</div>
            <h1>This church website is temporarily paused</h1>
            <p class="subtitle">{church['name']}</p>
            
            <div class="section">
                <h2>If you are visiting {church['name']}:</h2>
                <div class="contact-info">
                    {f'<div class="contact-item">📧 {church.get("email", "")}</div>' if church.get("email") else ''}
                    {f'<div class="contact-item">📞 {church.get("phone", "")}</div>' if church.get("phone") else ''}
                    {f'<div class="contact-item">📍 {church.get("address", "")}</div>' if church.get("address") else ''}
                </div>
                <div style="margin-top: 16px;">
                    <a href="https://churchnavigator.com/church/{church['slug']}" class="btn btn-secondary">
                        View on ChurchNavigator
                    </a>
                </div>
            </div>
            
            <div class="section">
                <h2>If you are the church owner:</h2>
                <p>Update your payment method to restore your website immediately.</p>
                <a href="https://churchnavigator.com/dashboard/billing" class="btn">
                    Restore Website
                </a>
            </div>
            
            <div class="footer">
                <p>Looking for a church? <a href="https://churchnavigator.com" style="color: #8b5cf6;">Search ChurchNavigator</a></p>
                <p style="margin-top: 8px;">Support: support@churchnavigator.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)
