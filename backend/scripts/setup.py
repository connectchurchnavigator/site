import os
import sys
import asyncio
from typing import Dict, List, Tuple
import stripe
import anthropic
import resend
from pymongo import MongoClient, ASCENDING, DESCENDING
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import requests
import argparse
from colorama import init, Fore, Style
import json

init(autoreset=True)

class SetupAutomation:
    def __init__(self):
        self.results = []
        self.env_vars = {}
        self.stripe_ids = {}
        self.manual_steps = []
        
    def log_success(self, msg: str):
        print(f"{Fore.GREEN}✓ {msg}{Style.RESET_ALL}")
        self.results.append(("success", msg))
        
    def log_error(self, msg: str):
        print(f"{Fore.RED}✗ {msg}{Style.RESET_ALL}")
        self.results.append(("error", msg))
        
    def log_warning(self, msg: str):
        print(f"{Fore.YELLOW}⚠ {msg}{Style.RESET_ALL}")
        self.results.append(("warning", msg))
        
    def log_info(self, msg: str):
        print(f"{Fore.CYAN}ℹ {msg}{Style.RESET_ALL}")
        
    def check_env_vars(self) -> Dict[str, bool]:
        self.log_info("\n=== CHECKING ENVIRONMENT VARIABLES ===")
        
        required_vars = {
            "STRIPE_SECRET_KEY": {
                "how_to_get": "stripe.com -> Developers -> API Keys -> Secret key",
                "example": "sk_live_... or sk_test_...",
                "critical": True
            },
            "STRIPE_PUBLISHABLE_KEY": {
                "how_to_get": "stripe.com -> Developers -> API Keys -> Publishable key",
                "example": "pk_live_... or pk_test_...",
                "critical": True
            },
            "NAMECHEAP_API_KEY": {
                "how_to_get": "namecheap.com -> Profile -> Tools -> API Access",
                "example": "abc123def456...",
                "critical": False
            },
            "NAMECHEAP_API_USER": {
                "how_to_get": "Your Namecheap username",
                "example": "churchnavigator",
                "critical": False
            },
            "ANTHROPIC_API_KEY": {
                "how_to_get": "console.anthropic.com -> API Keys",
                "example": "sk-ant-...",
                "critical": True
            },
            "RESEND_API_KEY": {
                "how_to_get": "resend.com -> API Keys",
                "example": "re_...",
                "critical": True
            },
            "MONGO_URL": {
                "how_to_get": "MongoDB Atlas -> Connect -> Drivers",
                "example": "mongodb+srv://...",
                "critical": True
            },
            "GITHUB_TOKEN": {
                "how_to_get": "github.com -> Settings -> Developer Settings -> Personal Access Tokens",
                "example": "ghp_...",
                "critical": False
            },
            "JWT_SECRET": {
                "how_to_get": "Generate: python -c 'import secrets; print(secrets.token_urlsafe(32))'",
                "example": "random_string_32_chars_or_more",
                "critical": True
            },
            "OWNER_EMAIL": {
                "how_to_get": "Your email for admin notifications",
                "example": "admin@churchnavigator.com",
                "critical": True
            },
            "RAILWAY_TOKEN": {
                "how_to_get": "railway.app -> Account Settings -> Tokens",
                "example": "railway_token_...",
                "critical": False
            }
        }
        
        status = {}
        for var, info in required_vars.items():
            value = os.environ.get(var)
            if value:
                self.log_success(f"{var} is set")
                self.env_vars[var] = value
                status[var] = True
            else:
                if info["critical"]:
                    self.log_error(f"{var} is MISSING (CRITICAL)")
                else:
                    self.log_warning(f"{var} is MISSING (optional for now)")
                print(f"  How to get: {info['how_to_get']}")
                print(f"  Example: {info['example']}")
                status[var] = False
                
        return status
    
    async def create_stripe_products(self) -> bool:
        self.log_info("\n=== CREATING STRIPE PRODUCTS ===")
        
        if "STRIPE_SECRET_KEY" not in self.env_vars:
            self.log_error("Cannot create Stripe products: STRIPE_SECRET_KEY not set")
            return False
            
        try:
            stripe.api_key = self.env_vars["STRIPE_SECRET_KEY"]
            
            # Check if products already exist
            existing = stripe.Product.list(limit=10)
            existing_names = {p.name for p in existing.data}
            
            # Create Planner Standard
            if "ChurchNavigator Planner Standard" not in existing_names:
                self.log_info("Creating Planner Standard...")
                standard = stripe.Product.create(
                    name="ChurchNavigator Planner Standard",
                    description="Unlimited visits, AI planning, PDF export",
                    metadata={"type": "planner", "tier": "standard"}
                )
                standard_monthly = stripe.Price.create(
                    product=standard.id,
                    unit_amount=900,
                    currency="gbp",
                    recurring={"interval": "month", "trial_period_days": 14}
                )
                standard_annual = stripe.Price.create(
                    product=standard.id,
                    unit_amount=8100,
                    currency="gbp",
                    recurring={"interval": "year"}
                )
                self.stripe_ids["STRIPE_PLANNER_STANDARD_PRICE_ID"] = standard_monthly.id
                self.stripe_ids["STRIPE_PLANNER_STANDARD_ANNUAL_PRICE_ID"] = standard_annual.id
                self.log_success(f"Created Planner Standard: {standard_monthly.id}")
            else:
                self.log_warning("Planner Standard already exists")
                
            # Create Planner Premium
            if "ChurchNavigator Planner Premium" not in existing_names:
                self.log_info("Creating Planner Premium...")
                premium = stripe.Product.create(
                    name="ChurchNavigator Planner Premium",
                    description="Full AI intelligence, unlimited collaboration",
                    metadata={"type": "planner", "tier": "premium"}
                )
                premium_monthly = stripe.Price.create(
                    product=premium.id,
                    unit_amount=1900,
                    currency="gbp",
                    recurring={"interval": "month", "trial_period_days": 14}
                )
                self.stripe_ids["STRIPE_PLANNER_PREMIUM_PRICE_ID"] = premium_monthly.id
                self.log_success(f"Created Planner Premium: {premium_monthly.id}")
            else:
                self.log_warning("Planner Premium already exists")
                
            # Create Sites Standard
            if "ChurchNavigator Sites Standard" not in existing_names:
                self.log_info("Creating Sites Standard...")
                sites = stripe.Product.create(
                    name="ChurchNavigator Sites Standard",
                    description="Custom domain website, hosted by ChurchNavigator",
                    metadata={"type": "sites", "tier": "standard"}
                )
                sites_monthly = stripe.Price.create(
                    product=sites.id,
                    unit_amount=900,
                    currency="gbp",
                    recurring={"interval": "month"}
                )
                self.stripe_ids["STRIPE_SITES_PRICE_ID"] = sites_monthly.id
                self.log_success(f"Created Sites Standard: {sites_monthly.id}")
            else:
                self.log_warning("Sites Standard already exists")
                
            # Create webhook
            self.log_info("Creating Stripe webhook...")
            webhook_url = "https://api.churchnavigator.com/api/stripe/webhook"
            existing_webhooks = stripe.WebhookEndpoint.list(limit=10)
            webhook_exists = any(w.url == webhook_url for w in existing_webhooks.data)
            
            if not webhook_exists:
                webhook = stripe.WebhookEndpoint.create(
                    url=webhook_url,
                    enabled_events=[
                        "customer.subscription.created",
                        "customer.subscription.updated",
                        "customer.subscription.deleted",
                        "invoice.paid",
                        "invoice.payment_failed",
                        "customer.subscription.trial_will_end"
                    ]
                )
                self.stripe_ids["STRIPE_WEBHOOK_SECRET"] = webhook.secret
                self.log_success(f"Created webhook: {webhook.id}")
            else:
                self.log_warning("Webhook already exists")
                
            # Save to .env.stripe
            if self.stripe_ids:
                with open(".env.stripe", "w") as f:
                    for key, value in self.stripe_ids.items():
                        f.write(f"{key}={value}\n")
                self.log_success("Saved Stripe IDs to .env.stripe")
                
            return True
            
        except Exception as e:
            self.log_error(f"Stripe setup failed: {str(e)}")
            return False
    
    async def test_connections(self) -> Dict[str, bool]:
        self.log_info("\n=== TESTING CONNECTIONS ===")
        results = {}
        
        # Test MongoDB
        if "MONGO_URL" in self.env_vars:
            try:
                client = MongoClient(self.env_vars["MONGO_URL"], serverSelectionTimeoutMS=5000)
                client.server_info()
                self.log_success("MongoDB connection OK")
                results["mongodb"] = True
            except Exception as e:
                self.log_error(f"MongoDB connection failed: {str(e)}")
                results["mongodb"] = False
        else:
            results["mongodb"] = False
            
        # Test Stripe
        if "STRIPE_SECRET_KEY" in self.env_vars:
            try:
                stripe.api_key = self.env_vars["STRIPE_SECRET_KEY"]
                stripe.Product.list(limit=1)
                self.log_success("Stripe API OK")
                results["stripe"] = True
            except Exception as e:
                self.log_error(f"Stripe API failed: {str(e)}")
                results["stripe"] = False
        else:
            results["stripe"] = False
            
        # Test Anthropic
        if "ANTHROPIC_API_KEY" in self.env_vars:
            try:
                client = anthropic.Anthropic(api_key=self.env_vars["ANTHROPIC_API_KEY"])
                response = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "test"}]
                )
                self.log_success("Anthropic API OK")
                results["anthropic"] = True
            except Exception as e:
                self.log_error(f"Anthropic API failed: {str(e)}")
                results["anthropic"] = False
        else:
            results["anthropic"] = False
            
        # Test Resend
        if "RESEND_API_KEY" in self.env_vars and "OWNER_EMAIL" in self.env_vars:
            try:
                resend.api_key = self.env_vars["RESEND_API_KEY"]
                email = resend.Emails.send({
                    "from": "ChurchNavigator <noreply@churchnavigator.com>",
                    "to": [self.env_vars["OWNER_EMAIL"]],
                    "subject": "ChurchNavigator Setup Test",
                    "html": "<p>Your ChurchNavigator setup is working! This is a test email.</p>"
                })
                self.log_success(f"Resend API OK (test email sent to {self.env_vars['OWNER_EMAIL']})")
                results["resend"] = True
            except Exception as e:
                self.log_error(f"Resend API failed: {str(e)}")
                results["resend"] = False
        else:
            results["resend"] = False
            
        # Test Namecheap (optional)
        if "NAMECHEAP_API_KEY" in self.env_vars and "NAMECHEAP_API_USER" in self.env_vars:
            try:
                url = "https://api.namecheap.com/xml.response"
                params = {
                    "ApiUser": self.env_vars["NAMECHEAP_API_USER"],
                    "ApiKey": self.env_vars["NAMECHEAP_API_KEY"],
                    "UserName": self.env_vars["NAMECHEAP_API_USER"],
                    "Command": "namecheap.domains.check",
                    "ClientIp": "0.0.0.0",
                    "DomainList": "test123456789.com"
                }
                response = requests.get(url, params=params, timeout=10)
                if "Status=\"OK\"" in response.text:
                    self.log_success("Namecheap API OK")
                    results["namecheap"] = True
                else:
                    self.log_warning("Namecheap API responded but check logs")
                    results["namecheap"] = False
            except Exception as e:
                self.log_warning(f"Namecheap API failed (optional): {str(e)}")
                results["namecheap"] = False
        else:
            results["namecheap"] = False
            
        return results
    
    async def setup_database(self) -> bool:
        self.log_info("\n=== SETTING UP DATABASE ===")
        
        if "MONGO_URL" not in self.env_vars:
            self.log_error("Cannot setup database: MONGO_URL not set")
            return False
            
        try:
            client = AsyncIOMotorClient(self.env_vars["MONGO_URL"])
            db = client.ChurchNavigator
            
            # Create indexes
            self.log_info("Creating indexes...")
            
            # Churches indexes
            await db.churches.create_index([("slug", ASCENDING)], unique=True)
            await db.churches.create_index([("location", "2dsphere")])
            await db.churches.create_index([("denomination", ASCENDING)])
            await db.churches.create_index([("is_featured", DESCENDING), ("name", ASCENDING)])
            self.log_success("Created churches indexes")
            
            # Users indexes
            await db.users.create_index([("email", ASCENDING)], unique=True)
            await db.users.create_index([("google_id", ASCENDING)], sparse=True)
            await db.users.create_index([("facebook_id", ASCENDING)], sparse=True)
            self.log_success("Created users indexes")
            
            # Subscriptions indexes
            await db.subscriptions.create_index([("user_id", ASCENDING)])
            await db.subscriptions.create_index([("stripe_subscription_id", ASCENDING)])
            await db.subscriptions.create_index([("church_id", ASCENDING)])
            self.log_success("Created subscriptions indexes")
            
            # Homepage activity TTL index (30 days)
            await db.homepage_activity.create_index(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=2592000
            )
            self.log_success("Created homepage_activity TTL index (30 days)")
            
            # Visitor tracking TTL index (90 days)
            await db.visitor_tracking.create_index(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=7776000
            )
            self.log_success("Created visitor_tracking TTL index (90 days)")
            
            # Seed featured churches if none exist
            count = await db.churches.count_documents({"is_featured": True})
            if count == 0:
                self.log_info("Seeding featured churches...")
                featured = [
                    {
                        "name": "St Mary's Church",
                        "slug": "st-marys-church-london",
                        "denomination": "Church of England",
                        "address": "High Street, London",
                        "postcode": "SW1A 1AA",
                        "location": {"type": "Point", "coordinates": [-0.127758, 51.507351]},
                        "phone": "020 1234 5678",
                        "email": "info@stmarys.org.uk",
                        "website": "https://stmarys.org.uk",
                        "description": "Historic church in the heart of London",
                        "service_times": [{"day": "Sunday", "time": "10:00 AM", "type": "Main Service"}],
                        "is_featured": True,
                        "created_at": datetime.utcnow()
                    }
                ]
                await db.churches.insert_many(featured)
                self.log_success(f"Seeded {len(featured)} featured churches")
            else:
                self.log_info(f"Featured churches already exist ({count})")
                
            return True
            
        except Exception as e:
            self.log_error(f"Database setup failed: {str(e)}")
            return False
    
    def update_railway_env(self) -> bool:
        self.log_info("\n=== UPDATING RAILWAY ENVIRONMENT ===")
        
        if "RAILWAY_TOKEN" not in self.env_vars:
            self.log_warning("RAILWAY_TOKEN not set - skipping automatic Railway update")
            self.log_info("Manually add .env.stripe variables to Railway dashboard")
            return False
            
        if not self.stripe_ids:
            self.log_warning("No Stripe IDs to upload")
            return False
            
        try:
            # Railway API would go here - currently Railway doesn't have public API
            # for env var updates, so this is a placeholder
            self.log_warning("Railway API integration pending - add vars manually")
            self.log_info("Copy .env.stripe contents to Railway dashboard:")
            self.log_info("railway.app -> your project -> Variables")
            return False
            
        except Exception as e:
            self.log_error(f"Railway update failed: {str(e)}")
            return False
    
    def generate_reports(self):
        self.log_info("\n=== GENERATING REPORTS ===")
        
        # Generate SETUP_REPORT.md
        report = "# ChurchNavigator Setup Report\n\n"
        report += f"Generated: {datetime.utcnow().isoformat()}\n\n"
        report += "## Automated Setup Results\n\n"
        
        for status, msg in self.results:
            icon = "✓" if status == "success" else "✗" if status == "error" else "⚠"
            report += f"{icon} {msg}\n"
            
        if self.stripe_ids:
            report += "\n## Stripe Product IDs\n\n"
            for key, value in self.stripe_ids.items():
                report += f"- {key}: `{value}`\n"
                
        report += "\n## Next Steps\n\n"
        report += "1. Add environment variables from .env.stripe to Railway\n"
        report += "2. Follow STEP_BY_STEP_GUIDE.md for manual setup tasks\n"
        report += "3. Test the application locally before deploying\n"
        
        with open("SETUP_REPORT.md", "w") as f:
            f.write(report)
        self.log_success("Created SETUP_REPORT.md")
        
        # Generate STEP_BY_STEP_GUIDE.md
        guide = self.generate_manual_guide()
        with open("STEP_BY_STEP_GUIDE.md", "w") as f:
            f.write(guide)
        self.log_success("Created STEP_BY_STEP_GUIDE.md")
    
    def generate_manual_guide(self) -> str:
        return """# ChurchNavigator Manual Setup Guide

This guide covers setup tasks that require human verification.

## 1. Stripe Account Setup (1-2 days)

**Time Required:** 30 minutes + 1-2 days approval
**Status:** Required for payment processing

### Steps:
1. Go to https://stripe.com and create account
2. Complete business verification:
   - Business name: ChurchNavigator
   - Business address: [Your address]
   - Bank account details for payouts
3. Wait for Stripe approval (usually same day)
4. Once approved, go to Dashboard -> Developers -> API Keys
5. Copy Secret Key and Publishable Key
6. Add to Railway environment:
   - STRIPE_SECRET_KEY=sk_live_...
   - STRIPE_PUBLISHABLE_KEY=pk_live_...

**Why Manual:** Requires identity and banking verification

---

## 2. Namecheap Reseller Account (2-3 days)

**Time Required:** 30 minutes + 2-3 days approval
**Status:** Required for custom domain management

### Steps:
1. Go to https://namecheap.com/reseller
2. Sign up for reseller account
3. Complete identity verification (driver's license, etc)
4. Wait for Namecheap approval (1-3 business days)
5. Once approved:
   - Go to Profile -> Tools -> API Access
   - Enable API access
   - Get your API key
   - Whitelist Railway's outbound IP (see Railway dashboard -> Settings)
6. Add to Railway environment:
   - NAMECHEAP_API_USER=[your username]
   - NAMECHEAP_API_KEY=[your api key]

**Why Manual:** Requires identity verification by Namecheap

---

## 3. Google OAuth Setup (30 minutes)

**Time Required:** 30 minutes
**Status:** Required for "Sign in with Google"

### Steps:
1. Go to https://console.cloud.google.com
2. Create new project "ChurchNavigator"
3. Enable Google+ API
4. Go to Credentials -> Create Credentials -> OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized JavaScript origins:
   - https://churchnavigator.com
   - http://localhost:3000 (for dev)
7. Authorized redirect URIs:
   - https://churchnavigator.com/auth/google/callback
   - http://localhost:3000/auth/google/callback
8. Copy Client ID and Client Secret
9. Add to Railway environment:
   - GOOGLE_CLIENT_ID=[your client id]
   - GOOGLE_CLIENT_SECRET=[your client secret]

**Why Manual:** Requires Google account and domain verification

---

## 4. Facebook OAuth Setup (1-2 weeks)

**Time Required:** 30 minutes + 1-2 weeks review
**Status:** Optional (can launch without it)

### Steps:
1. Go to https://developers.facebook.com
2. Create new app
3. Add Facebook Login product
4. Configure:
   - Valid OAuth Redirect URIs: https://churchnavigator.com/auth/facebook/callback
   - App Domains: churchnavigator.com
5. Submit app for review (required for production)
6. Wait for Meta approval (1-2 weeks)
7. Once approved, copy App ID and App Secret
8. Add to Railway environment:
   - FACEBOOK_APP_ID=[your app id]
   - FACEBOOK_APP_SECRET=[your app secret]

**Why Manual:** Requires Meta app review process

**Note:** You can launch without Facebook login initially

---

## 5. Railway Configuration

**Time Required:** 10 minutes
**Status:** Required

### Steps:
1. Go to https://railway.app
2. Find your backend service
3. Go to Settings -> get Networking -> Outbound IP
4. Copy this IP address
5. Add this IP to:
   - MongoDB Atlas IP whitelist
   - Namecheap API whitelist (Profile -> Tools -> API Access)
6. Add all environment variables from .env.stripe to Railway:
   - Go to your service -> Variables
   - Paste each variable
7. Trigger redeploy

**Why Manual:** Railway IP must be manually copied and whitelisted

---

## 6. MongoDB Atlas Configuration

**Time Required:** 5 minutes
**Status:** Should already be done

### Verify:
1. Go to MongoDB Atlas dashboard
2. Check Network Access -> IP Access List
3. Ensure Railway IP is whitelisted (or 0.0.0.0/0 for dev)
4. Check Database Access -> ensure user has readWrite permissions

---

## 7. Domain DNS Configuration

**Time Required:** 5 minutes (+ propagation time)
**Status:** Already done if site is live

### Verify:
1. churchnavigator.com -> CNAME to Railway frontend
2. api.churchnavigator.com -> CNAME to Railway backend
3. Propagation takes 5-60 minutes

---

## Setup Checklist

- [ ] Stripe account verified
- [ ] Stripe products created (automated)
- [ ] Namecheap reseller approved
- [ ] Google OAuth configured
- [ ] Facebook OAuth configured (optional)
- [ ] Railway IP whitelisted in MongoDB
- [ ] Railway IP whitelisted in Namecheap
- [ ] All env vars added to Railway
- [ ] Database indexes created (automated)
- [ ] Test email received from Resend
- [ ] Deploy to Railway and test

---

## Testing After Setup

1. Visit https://churchnavigator.com
2. Test search functionality
3. Test user signup
4. Test Google login
5. Test subscription flow (use test mode)
6. Check email delivery
7. Test custom domain flow (if Namecheap ready)

---

## Support

If you encounter issues:
1. Check SETUP_REPORT.md for error details
2. Review Railway logs
3. Check MongoDB Atlas metrics
4. Test API endpoints manually

"""

async def main():
    parser = argparse.ArgumentParser(description="ChurchNavigator Auto-Setup")
    parser.add_argument("--check-only", action="store_true", help="Only check env vars")
    parser.add_argument("--stripe-only", action="store_true", help="Only setup Stripe")
    parser.add_argument("--db-only", action="store_true", help="Only setup database")
    parser.add_argument("--guide", action="store_true", help="Generate guide only")
    parser.add_argument("--full", action="store_true", help="Full setup (default)")
    args = parser.parse_args()
    
    if not any([args.check_only, args.stripe_only, args.db_only, args.guide]):
        args.full = True
    
    setup = SetupAutomation()
    
    print(f"{Fore.MAGENTA}{'='*60}")
    print(f"  ChurchNavigator Auto-Setup")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Always check env vars first
    env_status = setup.check_env_vars()
    
    if args.check_only:
        print("\n✓ Environment check complete")
        return
    
    if args.guide:
        setup.generate_reports()
        print("\n✓ Guide generated")
        return
    
    # Stripe setup
    if args.full or args.stripe_only:
        await setup.create_stripe_products()
    
    # Database setup
    if args.full or args.db_only:
        await setup.setup_database()
    
    # Test connections
    if args.full:
        await setup.test_connections()
        setup.update_railway_env()
    
    # Generate reports
    setup.generate_reports()
    
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"  Setup Complete!")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    print("Next steps:")
    print("1. Review SETUP_REPORT.md")
    print("2. Add .env.stripe variables to Railway")
    print("3. Follow STEP_BY_STEP_GUIDE.md for manual tasks")
    print("4. Deploy to Railway\n")

if __name__ == "__main__":
    asyncio.run(main())
