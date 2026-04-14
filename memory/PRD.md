# CheckpointHub - Workflow-Driven Service Operations SaaS

## Original Problem Statement
Multi-tenant SaaS platform for factory-style checkpoint workflows. Any service operation (car detailing, auto repair, electronics repair, etc.) managed through configurable checkpoint stages with evidence tracking, RBAC, and audit logging.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + Shadcn UI + Tailwind CSS
- **Auth**: JWT (httpOnly cookies) + Google OAuth (Emergent Auth)
- **Design**: Dark industrial theme (Barlow Condensed + IBM Plex Sans)

## What's Been Implemented (April 14, 2026)
### Phase 1 MVP - Complete
- Multi-tenant architecture (Super Admin creates tenants, each isolated)
- JWT + Google OAuth authentication with brute-force protection
- Configurable checkpoint workflow engine with subtasks
- Evidence upload (photos, documents, notes) with before/during/after tagging
- Blocking logic (evidence required before task completion)
- Role-based access control per tenant (admin, supervisor, technician, inspector, viewer, client)
- Client portal with real-time progress tracking
- Worker portal with task management and evidence upload
- Tenant admin dashboard (checkpoints, subtasks, users, roles, items management)
- Super admin dashboard (tenant CRUD, user management, stats)
- Audit logging on all operations
- Multi-language support (EN/ES, Spanish as default)
- Sample car detailing template with 6 checkpoints, 23 subtasks
- Assign items to clients by email
- Data archival endpoint for daily operations

### Demo Data Seeded
- "Elite Auto Detailing" tenant with 7 users, 4 vehicles, full workflow

## User Personas
1. **Super Admin**: Manages platform, creates tenants, provisions instances
2. **Tenant Admin**: Configures workflows, manages team, monitors operations
3. **Worker** (Technician/Inspector/Supervisor): Completes tasks, uploads evidence
4. **Client**: Registers items, tracks progress in real-time

## Prioritized Backlog
### P0 (Critical)
- [x] Multi-tenant checkpoint engine
- [x] RBAC system
- [x] Evidence management
- [x] Client progress tracking

### P1 (Important)
- [ ] Real-time WebSocket updates (Phase 2)
- [ ] Push notifications (FCM/APNS)
- [ ] Advanced analytics dashboard
- [ ] Webhook system for third-party integrations

### P2 (Nice to have)
- [ ] QR/barcode scanning for items
- [ ] Offline-first mobile support
- [ ] OAuth2 / SSO for enterprise
- [ ] SLA tracking and reporting
- [ ] PDF report generation
- [ ] Email notifications on status changes

## Test Credentials
See /app/memory/test_credentials.md
