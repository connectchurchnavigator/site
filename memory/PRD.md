# Church Navigator - Product Requirements Document

## Original Problem Statement
Build a full-stack web application called "Church Navigator" - a scalable, custom-coded platform for listing churches, pastors, and faith-related entities. Replaces existing WordPress/MyListing site for full control over data models, UX, and performance.

## Tech Stack
- **Backend:** FastAPI, Python, Pydantic, MongoDB (Motor), JWT
- **Frontend:** React, react-router-dom, TailwindCSS, axios, Shadcn UI
- **File Handling:** Local file storage with aiofiles
- **Architecture:** RESTful API, SPA

## User Roles
- **Super Admin** (`role: 'super_admin'`): Full website management via `/admin` dashboard - manages users, listings, taxonomies, settings
- **Customer** (`role: 'customer'`): Regular user who creates/manages own church & pastor listings from personal dashboard

## Core Entities
- Churches (collection: `db.churches`)
- Pastors (collection: `db.pastors`)
- Users (collection: `db.users`)
- Taxonomies, Relationships, Bookmarks, Analytics, Admin Logs, Announcements

## Completed Features

### Phase 1 - Core (Complete)
- [x] User auth (register/login/JWT)
- [x] Church CRUD with 3-step creation wizard
- [x] Pastor CRUD with 3-step creation wizard (simplified Dec 2025)
- [x] Explore page with filters
- [x] Church & Pastor detail pages
- [x] User Dashboard
- [x] File uploads (local storage)

### Admin Dashboard (Complete)
- [x] Super Admin dashboard with 11 management pages
- [x] User management (CRUD, role change, suspend, password reset)
- [x] Church management (CRUD, status change, feature, recommend)
- [x] Pastor management (CRUD, status change)
- [x] Taxonomy management
- [x] Bulk actions (delete, publish, feature)
- [x] Admin filters correctly handle "all" values
- [x] Audit logging

### Homepage (Complete - Dec 2025)
- [x] 4 dedicated sections: Featured Churches, Open Churches, Featured Pastors, New Pastors
- [x] Dedicated API endpoints: `/api/homepage/featured-churches`, `/api/homepage/open-churches`, `/api/homepage/featured-pastors`, `/api/homepage/new-pastors`
- [x] Feature button in admin connects to homepage display

### Bug Fixes (Dec 2025)
- [x] Bulk delete for churches working
- [x] Admin filters (role/status/denomination) "all" value returns all results
- [x] User names displayed in admin panel
- [x] File upload path prefix with /api
- [x] Pastor update/delete KeyError fix (owner_id on legacy data)

### Analytics Dashboard (Complete - Dec 2025)
- [x] Comprehensive user dashboard with 4 overview cards (Published, Pending, Promotions, Visits)
- [x] Sitewide vs Account scope filter
- [x] Searchable listing filter dropdown
- [x] Views & Unique Views (24h, 7d, 30d)
- [x] Visits chart with 5 period toggles (recharts)
- [x] Top Referrers, Platforms, Browsers, Devices, Countries
- [x] Button Clicks tracking
- [x] All metrics refresh dynamically when filters change

## Known Issues
- Some uploaded images may show broken due to /uploads static file routing (infrastructure)

## Credentials
- Super Admin: zinxs4@gmail.com / Rut#vik7
- Demo User: demo@test.com

## P1 Upcoming Tasks
1. Mapbox Integration (map views + geocoding)
2. Google OAuth (social login)

## P2 Future Tasks
- Detailed Analytics (real data for admin/user dashboards)
- Event Listings & Bible College Listings
- Review & Rating system
- User-to-user messaging
- Promotions system

## Refactoring Needed
- `server.py` (2000+ lines) -> split into routes/models/services
- `ChurchCreationFlow.js` (1100+ lines) -> component breakdown
