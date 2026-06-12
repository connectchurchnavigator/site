import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import requests
from jinja2 import Template

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "hello@churchnavigator.com")
FROM_NAME = os.getenv("FROM_NAME", "ChurchNavigator")
BASE_URL = os.getenv("BASE_URL", "https://churchnavigator.com")

USE_SENDGRID = bool(SENDGRID_API_KEY)

def load_template(template_name: str) -> str:
    template_path = f"backend/templates/email/{template_name}.html"
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()

def send_email_smtp(to_email: str, subject: str, html_content: str) -> bool:
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

def send_email_sendgrid(to_email: str, subject: str, html_content: str) -> bool:
    try:
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": FROM_EMAIL, "name": FROM_NAME},
            "subject": subject,
            "content": [{"type": "text/html", "value": html_content}]
        }
        response = requests.post(url, json=data, headers=headers)
        return response.status_code == 202
    except Exception as e:
        print(f"SendGrid Error: {e}")
        return False

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    if USE_SENDGRID:
        return send_email_sendgrid(to_email, subject, html_content)
    else:
        return send_email_smtp(to_email, subject, html_content)

def send_welcome(user_email: str, user_name: str) -> bool:
    template = load_template('welcome')
    html = Template(template).render(
        user_name=user_name,
        base_url=BASE_URL,
        explore_url=f"{BASE_URL}/explore",
        profile_url=f"{BASE_URL}/profile"
    )
    return send_email(user_email, "Welcome to ChurchNavigator 🙏", html)

def send_visit_confirmed(user_email: str, user_name: str, church_name: str, church_slug: str, visit_date: str) -> bool:
    template = load_template('visit_confirmed')
    html = Template(template).render(
        user_name=user_name,
        church_name=church_name,
        visit_date=visit_date,
        church_url=f"{BASE_URL}/church/{church_slug}",
        base_url=BASE_URL
    )
    return send_email(user_email, f"Visit Confirmed: {church_name}", html)

def send_message_notification(recipient_email: str, recipient_name: str, sender_name: str, listing_type: str, listing_name: str, message_preview: str, listing_url: str) -> bool:
    template = load_template('message_received')
    html = Template(template).render(
        recipient_name=recipient_name,
        sender_name=sender_name,
        listing_type=listing_type,
        listing_name=listing_name,
        message_preview=message_preview[:100],
        listing_url=listing_url,
        base_url=BASE_URL
    )
    return send_email(recipient_email, f"New Message: {listing_name}", html)

def send_event_reminder(user_email: str, user_name: str, event_name: str, event_date: str, event_time: str, event_location: str, event_url: str) -> bool:
    template = load_template('event_reminder')
    html = Template(template).render(
        user_name=user_name,
        event_name=event_name,
        event_date=event_date,
        event_time=event_time,
        event_location=event_location,
        event_url=event_url,
        base_url=BASE_URL
    )
    return send_email(user_email, f"Reminder: {event_name} Tomorrow", html)

def send_weekly_digest(user_email: str, user_name: str, followed_updates: List[Dict]) -> bool:
    template = load_template('weekly_digest')
    html = Template(template).render(
        user_name=user_name,
        followed_updates=followed_updates,
        base_url=BASE_URL,
        profile_url=f"{BASE_URL}/profile"
    )
    return send_email(user_email, "Your Weekly ChurchNavigator Digest 📬", html)

def send_space_enquiry(church_email: str, church_name: str, enquirer_name: str, enquirer_email: str, enquirer_phone: str, space_name: str, enquiry_message: str, space_url: str) -> bool:
    template = load_template('space_enquiry')
    html = Template(template).render(
        church_name=church_name,
        enquirer_name=enquirer_name,
        enquirer_email=enquirer_email,
        enquirer_phone=enquirer_phone,
        space_name=space_name,
        enquiry_message=enquiry_message,
        space_url=space_url,
        base_url=BASE_URL
    )
    return send_email(church_email, f"Space Enquiry: {space_name}", html)