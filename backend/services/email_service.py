import os
import resend
from typing import Dict, Optional

resend.api_key = os.getenv('RESEND_API_KEY')

class EmailService:
    @staticmethod
    async def send_email(to: str, subject: str, html: str, from_email: str = 'ChurchNavigator <noreply@churchnavigator.com>') -> bool:
        try:
            resend.Emails.send({
                'from': from_email,
                'to': to,
                'subject': subject,
                'html': html
            })
            return True
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    @staticmethod
    async def send_weekly_digest(to: str, church_name: str, stats: Dict, summary: str) -> bool:
        subject = f"Your Weekly ChurchNavigator Report - {church_name}"
        html = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .stats {{ background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .stat {{ display: inline-block; width: 45%; margin: 10px 2%; text-align: center; }}
        .stat-number {{ font-size: 32px; font-weight: bold; color: #4F46E5; }}
        .stat-label {{ font-size: 14px; color: #6b7280; }}
        .message {{ background: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weekly Report - {church_name}</h1>
            <p>Your church's activity this week</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">{stats.get('views', 0)}</div>
                <div class="stat-label">Profile Views</div>
            </div>
            <div class="stat">
                <div class="stat-number">{stats.get('followers', 0)}</div>
                <div class="stat-label">New Followers</div>
            </div>
            <div class="stat">
                <div class="stat-number">{stats.get('registrations', 0)}</div>
                <div class="stat-label">Event Registrations</div>
            </div>
            <div class="stat">
                <div class="stat-number">{stats.get('checkins', 0)}</div>
                <div class="stat-label">Check-ins</div>
            </div>
        </div>
        
        <div class="message">
            <p>{summary}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://churchnavigator.com/dashboard" style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Dashboard</a>
        </div>
        
        <div class="footer">
            <p>ChurchNavigator.com - UK's Leading Church Directory</p>
            <p><a href="https://churchnavigator.com/settings">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>"""
        return await EmailService.send_email(to, subject, html)

    @staticmethod
    async def send_followup_message(to: str, visitor_name: str, church_name: str, message: str) -> bool:
        subject = f"Thank you for visiting {church_name}"
        html = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .message {{ background: #f9fafb; padding: 25px; border-radius: 8px; border-left: 4px solid #4F46E5; }}
        .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{church_name}</h2>
        </div>
        
        <div class="message">
            <p>Dear {visitor_name},</p>
            <p>{message}</p>
        </div>
        
        <div class="footer">
            <p>Sent via ChurchNavigator.com</p>
        </div>
    </div>
</body>
</html>"""
        return await EmailService.send_email(to, subject, html)

email_service = EmailService()
