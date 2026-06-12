import os
import resend
from datetime import datetime

resend.api_key = os.getenv("RESEND_API_KEY")

def send_email(to: str, subject: str, body: str):
    try:
        params = {
            "from": "ChurchNavigator <noreply@churchnavigator.com>",
            "to": [to],
            "subject": subject,
            "html": f"<div style='font-family: Arial, sans-serif; padding: 20px;'>{body}</div>"
        }
        email = resend.Emails.send(params)
        return email
    except Exception as e:
        print(f"Email send failed: {e}")
        raise