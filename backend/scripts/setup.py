#!/usr/bin/env python3
import os
import sys
import json
import stripe
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import requests
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure
import anthropic
import resend
from colorama import init, Fore, Style

init(autoreset=True)

class SetupScript:
    def __init__(self):
        self.results = []
        self.errors = []
        self.warnings = []
        self.stripe_ids = {}
        
    def log_ok(self, msg: str):
        print(f"{Fore.GREEN}✓ {msg}{Style.RESET_ALL}")
        self.results.append(("OK", msg))
        
    def log_error(self, msg: str):
        print(f"{Fore.RED}✗ {msg}{Style.RESET_ALL}")
        self.errors.append(msg)
        
    def log_warning(self, msg: str):
        print(f"{Fore.YELLOW}⚠ {msg}{Style.RESET_ALL}")
        self.warnings.append(msg)
        
    def log_info(self, msg: str):
        print(f"{Fore.CYAN}ℹ {msg}{Style.RESET_ALL}")

    def check_env_vars(self) -> bool:
        self.log_info("\nChecking environment variables...")
        
        required_vars = {
            "STRIPE_SECRET_KEY": {
                "how_to_get": "stripe.com -> Developers -> API Keys -> Secret key",
                "example": "sk_live_...",
                "critical": True
            },
            "STRIPE_PUBLISHABLE_KEY": {
                "how_to_get": "stripe.com -> Developers -> API Keys -> Publishable key",
                "example": "pk_live_...",
                "critical": True
            },
            "MONGO_URL": {
                "how_to_get": "MongoDB Atlas -> Connect -> Drivers",
                "example": "mongodb+srv://...",
                "critical": True
            },
            "JWT_SECRET": {
                "how_to_get": "Generate random: openssl rand -hex 32",
                "example": "a1b2c3d4...",
                "critical": True
            },
            "ANTHROPIC_API_KEY": {
                "how_to_get": "console.anthropic.com -> API Keys",
                "example": "sk-ant-...",
                "critical": False
            },
            "RESEND_API_KEY": {
                "how_to_get": "resend.com -> API Keys",
                "example": "re_...",
                "critical": False
            },
            "NAMECHEAP_API_KEY": {
                "how_to_get": "namecheap.com -> Profile -> Tools -> API Access",
                "example": "abc123...",
                "critical": False
            },
            "NAMECHEAP_API_USER": {
                "how_to_get": "Your Namecheap username",
                "example": "churchnavigator",
                "critical": False
            },
            "GITHUB_TOKEN": {
                "how_to_get": "github.com -> Settings -> Developer Settings -> Tokens",
                "example": "ghp_...",
                "critical": False
            },
            "GOOGLE_CLIENT_ID": {
                "how_to_get": "console.cloud.google.com -> Credentials -> OAuth 2.0 Client IDs",
                "example": "123456789.apps.googleusercontent.com",
                "critical": False
            },
            "GOOGLE_CLIENT_SECRET": {
                "how_to_get": "console.cloud.google.com -> Credentials -> OAuth 2.0 Client IDs",
                "example": "GOCSPX-...",
                "critical": False
            },
            "OWNER_EMAIL": {
                "how_to_get": "Your admin email address",
                "example": "admin@churchnavigator.com",
                "critical": True
            }
        }
        
        missing_critical = []
        missing_optional = []
        
        for var, info in required_vars.items():
            value = os.environ.get(var)
            if value:
                self.log_ok(f"{var} is set")
            else:
                if info["critical"]:
                    self.log_error(f"{var} is MISSING (CRITICAL)")
                    missing_critical.append((var, info))
                else:
                    self.log_warning(f"{var} is missing (optional)")
                    missing_optional.append((var, info))
        
        if missing_critical or missing_optional:
            print(f"\n{Fore.YELLOW}Missing environment variables:{Style.RESET_ALL}")
            for var, info in missing_critical + missing_optional:
                print(f"\n{Fore.CYAN}{var}:{Style.RESET_ALL}")
                print(f"  How to get: {info['how_to_get']}")
                print(f"  Example: {info['example']}")
        
        return len(missing_critical) == 0

    def create_stripe_products(self) -> bool:
        self.log_info("\nCreating Stripe products and prices...")
        
        try:
            stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
            
            # Check existing products first
            existing = stripe.Product.list(limit=100)
            existing_names = {p.name: p for p in existing.data}
            
            # Planner Standard
            if "ChurchNavigator Planner Standard" in existing_names:
                standard = existing_names["ChurchNavigator Planner Standard"]
                self.log_warning("Planner Standard product already exists")
            else:
                standard = stripe.Product.create(
                    name="ChurchNavigator Planner Standard",
                    description="Unlimited visits, AI planning, PDF export"
                )
                self.log_ok(f"Created Planner Standard product: {standard.id}")
            
            # Get or create prices for Standard
            prices = stripe.Price.list(product=standard.id, limit=10)
            monthly_price = None
            annual_price = None
            
            for price in prices.data:
                if price.recurring and price.recurring.interval == "month":
                    monthly_price = price
                elif price.recurring and price.recurring.interval == "year":
                    annual_price = price
            
            if not monthly_price:
                monthly_price = stripe.Price.create(
                    product=standard.id,
                    unit_amount=900,
                    currency="gbp",
                    recurring={"interval": "month", "trial_period_days": 14}
                )
                self.log_ok(f"Created Planner Standard monthly price: {monthly_price.id}")
            else:
                self.log_warning("Planner Standard monthly price already exists")
            
            if not annual_price:
                annual_price = stripe.Price.create(
                    product=standard.id,
                    unit_amount=8100,
                    currency="gbp",
                    recurring={"interval": "year"}
                )
                self.log_ok(f"Created Planner Standard annual price: {annual_price.id}")
            else:
                self.log_warning("Planner Standard annual price already exists")
            
            self.stripe_ids["STRIPE_PLANNER_STANDARD_PRICE_ID"] = monthly_price.id
            self.stripe_ids["STRIPE_PLANNER_STANDARD_ANNUAL_PRICE_ID"] = annual_price.id
            
            # Planner Premium
            if "ChurchNavigator Planner Premium" in existing_names:
                premium = existing_names["ChurchNavigator Planner Premium"]
                self.log_warning("Planner Premium product already exists")
            else:
                premium = stripe.Product.create(
                    name="ChurchNavigator Planner Premium",
                    description="Full AI intelligence, unlimited collaboration"
                )
                self.log_ok(f"Created Planner Premium product: {premium.id}")
            
            prices = stripe.Price.list(product=premium.id, limit=10)
            premium_price = next((p for p in prices.data if p.recurring and p.recurring.interval == "month"), None)
            
            if not premium_price:
                premium_price = stripe.Price.create(
                    product=premium.id,
                    unit_amount=1900,
                    currency="gbp",
                    recurring={"interval": "month", "trial_period_days": 14}
                )
                self.log_ok(f"Created Planner Premium monthly price: {premium_price.id}")
            else:
                self.log_warning("Planner Premium monthly price already exists")
            
            self.stripe_ids["STRIPE_PLANNER_PREMIUM_PRICE_ID"] = premium_price.id
            
            # Sites Standard
            if "ChurchNavigator Sites Standard" in existing_names:
                sites = existing_names["ChurchNavigator Sites Standard"]
                self.log_warning("Sites Standard product already exists")
            else:
                sites = stripe.Product.create(
                    name="ChurchNavigator Sites Standard",
                    description="Custom domain website, hosted by ChurchNavigator"
                )
                self.log_ok(f"Created Sites Standard product: {sites.id}")
            
            prices = stripe.Price.list(product=sites.id, limit=10)
            sites_price = next((p for p in prices.data if p.recurring and p.recurring.interval == "month"), None)
            
            if not sites_price:
                sites_price = stripe.Price.create(
                    product=sites.id,
                    unit_amount=900,
                    currency="gbp",
                    recurring={"interval": "month"}
                )
                self.log_ok(f"Created Sites Standard monthly price: {sites_price.id}")
            else:
                self.log_warning("Sites Standard monthly price already exists")
            
            self.stripe_ids["STRIPE_SITES_PRICE_ID"] = sites_price.id
            
            # Create or update webhook
            webhooks = stripe.WebhookEndpoint.list(limit=100)
            webhook_url = "https://api.churchnavigator.com/api/stripe/webhook"
            existing_webhook = next((w for w in webhooks.data if w.url == webhook_url), None)
            
            events = [
                "customer.subscription.created",
                "customer.subscription.updated",
                "customer.subscription.deleted",
                "invoice.paid",
                "invoice.payment_failed",
                "customer.subscription.trial_will_end"
            ]
            
            if existing_webhook:
                self.log_warning("Webhook already exists")
                self.stripe_ids["STRIPE_WEBHOOK_SECRET"] = "<already exists - get from Stripe dashboard>"
            else:
                webhook = stripe.WebhookEndpoint.create(
                    url=webhook_url,
                    enabled_events=events
                )
                self.log_ok(f"Created webhook: {webhook.id}")
                self.stripe_ids["STRIPE_WEBHOOK_SECRET"] = webhook.secret
            
            # Save to file
            env_content = "\n".join([f"{k}={v}" for k, v in self.stripe_ids.items()])
            with open(".env.stripe", "w") as f:
                f.write(env_content)
            
            self.log_ok("Stripe IDs saved to .env.stripe")
            return True
            
        except stripe.error.StripeError as e:
            self.log_error(f"Stripe error: {e}")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error creating Stripe products: {e}")
            return False

    def test_connections(self) -> Dict[str, bool]:
        self.log_info("\nTesting API connections...")
        results = {}
        
        # MongoDB
        try:
            mongo_url = os.environ.get("MONGO_URL")
            if not mongo_url:
                self.log_error("MongoDB: MONGO_URL not set")
                results["mongodb"] = False
            else:
                client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
                client.admin.command('ping')
                self.log_ok("MongoDB connection successful")
                results["mongodb"] = True
        except Exception as e:
            self.log_error(f"MongoDB connection failed: {e}")
            results["mongodb"] = False
        
        # Stripe
        try:
            stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
            if not stripe.api_key:
                self.log_error("Stripe: STRIPE_SECRET_KEY not set")
                results["stripe"] = False
            else:
                stripe.Product.list(limit=1)
                self.log_ok("Stripe API connection successful")
                results["stripe"] = True
        except Exception as e:
            self.log_error(f"Stripe API connection failed: {e}")
            results["stripe"] = False
        
        # Anthropic
        try:
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                self.log_warning("Anthropic: ANTHROPIC_API_KEY not set (optional)")
                results["anthropic"] = False
            else:
                client = anthropic.Anthropic(api_key=api_key)
                message = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=10,
                    messages=[{"role": "user", "content": "Hi"}]
                )
                self.log_ok("Anthropic API connection successful")
                results["anthropic"] = True
        except Exception as e:
            self.log_warning(f"Anthropic API connection failed: {e}")
            results["anthropic"] = False
        
        # Resend
        try:
            api_key = os.environ.get("RESEND_API_KEY")
            owner_email = os.environ.get("OWNER_EMAIL")
            if not api_key:
                self.log_warning("Resend: RESEND_API_KEY not set (optional)")
                results["resend"] = False
            elif not owner_email:
                self.log_warning("Resend: OWNER_EMAIL not set, skipping test email")
                results["resend"] = False
            else:
                resend.api_key = api_key
                params = {
                    "from": "ChurchNavigator <noreply@churchnavigator.com>",
                    "to": [owner_email],
                    "subject": "ChurchNavigator Setup Test",
                    "html": "<p>Setup script test email - everything working!</p>"
                }
                resend.Emails.send(params)
                self.log_ok(f"Resend test email sent to {owner_email}")
                results["resend"] = True
        except Exception as e:
            self.log_warning(f"Resend test failed: {e}")
            results["resend"] = False
        
        # GitHub
        try:
            token = os.environ.get("GITHUB_TOKEN")
            if not token:
                self.log_warning("GitHub: GITHUB_TOKEN not set (optional)")
                results["github"] = False
            else:
                headers = {"Authorization": f"token {token}"}
                resp = requests.get("https://api.github.com/user/repos", headers=headers, timeout=5)
                if resp.status_code == 200:
                    self.log_ok("GitHub API connection successful")
                    results["github"] = True
                else:
                    self.log_warning(f"GitHub API returned status {resp.status_code}")
                    results["github"] = False
        except Exception as e:
            self.log_warning(f"GitHub API connection failed: {e}")
            results["github"] = False
        
        return results

    def setup_database(self) -> bool:
        self.log_info("\nSetting up database indexes and seed data...")
        
        try:
            mongo_url = os.environ.get("MONGO_URL")
            if not mongo_url:
                self.log_error("MONGO_URL not set")
                return False
            
            client = MongoClient(mongo_url)
            db = client.get_database()
            
            # Churches collection indexes
            churches = db["churches"]
            churches.create_index([("slug", ASCENDING)], unique=True)
            churches.create_index([("location", "2dsphere")])
            churches.create_index([("denomination", ASCENDING)])
            churches.create_index([("verified", ASCENDING)])
            churches.create_index([("featured", ASCENDING)])
            self.log_ok("Created churches collection indexes")
            
            # Users collection indexes
            users = db["users"]
            users.create_index([("email", ASCENDING)], unique=True)
            users.create_index([("google_id", ASCENDING)], sparse=True)
            users.create_index([("facebook_id", ASCENDING)], sparse=True)
            self.log_ok("Created users collection indexes")
            
            # Subscriptions collection indexes
            subscriptions = db["subscriptions"]
            subscriptions.create_index([("user_id", ASCENDING)])
            subscriptions.create_index([("stripe_customer_id", ASCENDING)])
            subscriptions.create_index([("stripe_subscription_id", ASCENDING)])
            subscriptions.create_index([("status", ASCENDING)])
            self.log_ok("Created subscriptions collection indexes")
            
            # Homepage activity TTL index (30 days)
            homepage_activity = db["homepage_activity"]
            homepage_activity.create_index(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=2592000
            )
            self.log_ok("Created homepage_activity TTL index (30 days)")
            
            # Visitor tracking TTL index (90 days)
            visitors = db["visitors"]
            visitors.create_index(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=7776000
            )
            visitors.create_index([("church_id", ASCENDING)])
            visitors.create_index([("qr_code", ASCENDING)])
            self.log_ok("Created visitors TTL index (90 days)")
            
            # Payment failures tracking
            payment_failures = db["payment_failures"]
            payment_failures.create_index([("subscription_id", ASCENDING)])
            payment_failures.create_index([("failure_date", ASCENDING)])
            self.log_ok("Created payment_failures indexes")
            
            # Church websites hosting
            church_websites = db["church_websites"]
            church_websites.create_index([("church_id", ASCENDING)], unique=True)
            church_websites.create_index([("domain", ASCENDING)], unique=True)
            church_websites.create_index([("hosting_status", ASCENDING)])
            self.log_ok("Created church_websites indexes")
            
            self.log_ok("Database setup complete")
            return True
            
        except Exception as e:
            self.log_error(f"Database setup failed: {e}")
            return False

    def generate_reports(self):
        self.log_info("\nGenerating setup reports...")
        
        # Setup Report
        report = f"""# ChurchNavigator Setup Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

✅ Successful: {len([r for r in self.results if r[0] == 'OK'])}
⚠️  Warnings: {len(self.warnings)}
❌ Errors: {len(self.errors)}

## Completed Tasks

"""
        for status, msg in self.results:
            report += f"- {msg}\n"
        
        if self.warnings:
            report += "\n## Warnings\n\n"
            for warning in self.warnings:
                report += f"- {warning}\n"
        
        if self.errors:
            report += "\n## Errors\n\n"
            for error in self.errors:
                report += f"- {error}\n"
        
        if self.stripe_ids:
            report += "\n## Stripe Product IDs\n\n"
            report += "Add these to Railway environment variables:\n\n"
            for key, value in self.stripe_ids.items():
                report += f"```\n{key}={value}\n```\n\n"
        
        report += "\n## Next Steps\n\n"
        report += "1. Review STEP_BY_STEP_GUIDE.md for manual tasks\n"
        report += "2. Add Stripe IDs from .env.stripe to Railway\n"
        report += "3. Test the application end-to-end\n"
        report += "4. Monitor logs for any issues\n"
        
        with open("SETUP_REPORT.md", "w") as f:
            f.write(report)
        
        self.log_ok("Generated SETUP_REPORT.md")
        
        # Step-by-step guide
        guide = """# ChurchNavigator Manual Setup Guide

These tasks require human verification and cannot be automated.

## 1. Namecheap Reseller Account (30 mins, one-time)

**Why needed:** To automatically register and manage church domains

**Steps:**
1. Go to https://www.namecheap.com/reseller/
2. Click "Sign Up" and create reseller account
3. Complete identity verification form
4. Wait 1-2 business days for approval email
5. Once approved, go to Profile → Tools → API Access
6. Enable API access and generate API key
7. Get your Railway service IP:
   - Railway → Your service → Settings → Networking → Outbound IP
8. Add Railway IP to Namecheap API whitelist
9. Add to Railway environment:
   - NAMECHEAP_API_USER=your_username
   - NAMECHEAP_API_KEY=your_api_key

**Why can't automate:** Requires identity and business verification by Namecheap

---

## 2. Stripe Account Verification (1-2 days, one-time)

**Why needed:** To process subscription payments

**Steps:**
1. Create account at https://stripe.com
2. Go to Account Settings → Business settings
3. Complete business verification:
   - Business name and address
   - Tax ID/VAT number
   - Bank account details
4. Wait for Stripe approval (usually same day)
5. Once approved, go to Developers → API Keys
6. Copy Secret Key and Publishable Key
7. Add to Railway environment:
   - STRIPE_SECRET_KEY=sk_live_...
   - STRIPE_PUBLISHABLE_KEY=pk_live_...

**Why can't automate:** Requires banking and identity verification

---

## 3. Google OAuth App (30 mins, one-time)

**Why needed:** For "Sign in with Google" functionality

**Steps:**
1. Go to https://console.cloud.google.com
2. Create new project: "ChurchNavigator"
3. Enable APIs:
   - Go to APIs & Services → Library
   - Search and enable "Google+ API"
4. Create OAuth credentials:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - https://churchnavigator.com/auth/google/callback
     - https://api.churchnavigator.com/api/auth/google/callback
5. Copy Client ID and Client Secret
6. Add to Railway environment:
   - GOOGLE_CLIENT_ID=...
   - GOOGLE_CLIENT_SECRET=...

**Why can't automate:** Requires Google account and domain verification

---

## 4. Facebook OAuth App (1-2 weeks for review)

**Why needed:** For "Sign in with Facebook" functionality

**Steps:**
1. Go to https://developers.facebook.com
2. Create new app: "ChurchNavigator"
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - https://churchnavigator.com/auth/facebook/callback
   - https://api.churchnavigator.com/api/auth/facebook/callback
5. Submit app for review (required for production use)
6. Wait 1-2 weeks for Meta approval
7. Once approved, copy App ID and App Secret
8. Add to Railway environment:
   - FACEBOOK_APP_ID=...
   - FACEBOOK_APP_SECRET=...

**Why can't automate:** Requires Meta app review process

---

## 5. Railway IP Whitelisting

**Why needed:** External APIs require IP whitelisting

**Steps:**
1. Get Railway outbound IP:
   - Railway → Your service → Settings → Networking
   - Copy the Outbound IP address
2. Add to Namecheap API whitelist:
   - Namecheap → Profile → Tools → API Access → IP Whitelist
3. Add to MongoDB Atlas:
   - MongoDB Atlas → Network Access → Add IP Address
   - Enter Railway IP
4. Add to any other services that require whitelisting

**Why can't automate:** Railway IP must be manually retrieved

---

## 6. Resend Email Setup (15 mins)

**Why needed:** For sending transactional emails

**Steps:**
1. Go to https://resend.com and create account
2. Verify your domain:
   - Add DNS records provided by Resend
   - Wait for verification (usually 5-10 minutes)
3. Create API key
4. Add to Railway environment:
   - RESEND_API_KEY=re_...
5. Set sender email:
   - OWNER_EMAIL=admin@churchnavigator.com

---

## 7. Anthropic API Key (5 mins)

**Why needed:** For AI church visit planning

**Steps:**
1. Go to https://console.anthropic.com
2. Create account and add payment method
3. Generate API key
4. Add to Railway environment:
   - ANTHROPIC_API_KEY=sk-ant-...

---

## Estimated Total Time

- If all accounts already exist: ~1 hour
- If starting from scratch: 2-3 weeks (due to verification delays)

## Priority Order

1. **Critical (app won't work without):**
   - Stripe (payments)
   - MongoDB (already set up)
   - JWT Secret (generate: `openssl rand -hex 32`)

2. **Important (core features):**
   - Google OAuth (user login)
   - Resend (emails)
   - Anthropic (AI features)

3. **Can add later:**
   - Facebook OAuth (alternative login)
   - Namecheap (custom domains)
   - GitHub (deployment automation)
"""
        
        with open("STEP_BY_STEP_GUIDE.md", "w") as f:
            f.write(guide)
        
        self.log_ok("Generated STEP_BY_STEP_GUIDE.md")

def main():
    parser = argparse.ArgumentParser(description="ChurchNavigator Setup Script")
    parser.add_argument("--check-only", action="store_true", help="Only check environment variables")
    parser.add_argument("--stripe-only", action="store_true", help="Only create Stripe products")
    parser.add_argument("--db-only", action="store_true", help="Only set up database")
    parser.add_argument("--guide", action="store_true", help="Generate guides only")
    parser.add_argument("--full", action="store_true", help="Run full setup (default)")
    
    args = parser.parse_args()
    
    # Default to full if no flags
    if not any([args.check_only, args.stripe_only, args.db_only, args.guide]):
        args.full = True
    
    setup = SetupScript()
    
    print(f"{Fore.CYAN}{'='*60}")
    print(f"ChurchNavigator Setup Script")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    if args.guide:
        setup.generate_reports()
        return
    
    # Always check environment variables first
    env_ok = setup.check_env_vars()
    
    if args.check_only:
        return
    
    if not env_ok:
        setup.log_error("\nCritical environment variables missing. Fix these before continuing.")
        return
    
    if args.stripe_only or args.full:
        setup.create_stripe_products()
    
    if args.db_only or args.full:
        setup.setup_database()
    
    if args.full:
        setup.test_connections()
    
    # Always generate reports at the end
    setup.generate_reports()
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"Setup Complete!")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    if setup.errors:
        print(f"{Fore.RED}⚠️  {len(setup.errors)} error(s) occurred. Review SETUP_REPORT.md{Style.RESET_ALL}")
    else:
        print(f"{Fore.GREEN}✓ All automated tasks completed successfully!{Style.RESET_ALL}")
    
    print(f"\n{Fore.CYAN}Next steps:{Style.RESET_ALL}")
    print("1. Review SETUP_REPORT.md for details")
    print("2. Add Stripe IDs from .env.stripe to Railway")
    print("3. Follow STEP_BY_STEP_GUIDE.md for manual tasks")
    print("4. Run: railway up (to deploy)\n")

if __name__ == "__main__":
    main()
