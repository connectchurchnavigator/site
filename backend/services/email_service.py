import os
import resend
from typing import Dict, Optional

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    def __init__(self):
        self.from_email = "noreply@churchnavigator.com"
    
    async def send_weekly_analytics(self, to_email: str, church_name: str, stats: Dict, digest_text: str) -> bool:
        try:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .stats {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                    .stat-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                    .stat-label {{ font-weight: bold; color: #6b7280; }}
                    .stat-value {{ color: #1e40af; font-size: 1.2em; }}
                    .digest {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }}
                    .footer {{ text-align: center; color: #6b7280; padding: 20px; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Weekly Analytics for {church_name}</h1>
                        <p>Your performance summary for the past 7 days</p>
                    </div>
                    <div class="content">
                        <div class="stats">
                            <h2>This Week's Numbers</h2>
                            <div class="stat-row">
                                <span class="stat-label">Profile Views</span>
                                <span class="stat-value">{stats['views']}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">New Followers</span>
                                <span class="stat-value">{stats['new_followers']}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Event Registrations</span>
                                <span class="stat-value">{stats['event_registrations']}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">New Reviews</span>
                                <span class="stat-value">{stats['new_reviews']}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Visitor Check-ins</span>
                                <span class="stat-value">{stats['visitor_checkins']}</span>
                            </div>
                        </div>
                        <div class="digest">
                            <h3>AI Insights</h3>
                            <p>{digest_text}</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://churchnavigator.com/dashboard" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Dashboard</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is your weekly automated digest from ChurchNavigator.com</p>
                        <p><a href="https://churchnavigator.com/settings">Manage email preferences</a></p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Weekly Analytics for {church_name}",
                "html": html_content
            }
            
            email = resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending weekly analytics email: {e}")
            return False
    
    async def send_followup_message(self, to_email: str, visitor_name: str, church_name: str, message: str) -> bool:
        try:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .message {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                    .footer {{ text-align: center; color: #6b7280; padding: 20px; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Thank You for Visiting {church_name}</h1>
                    </div>
                    <div class="content">
                        <p>Dear {visitor_name},</p>
                        <div class="message">
                            <p>{message}</p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Sent via ChurchNavigator.com</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Thank you for visiting {church_name}",
                "html": html_content
            }
            
            email = resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending followup email: {e}")
            return False
