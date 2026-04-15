# CheckpointHub - Workflow-Driven Service Operations SaaS

> Factory-style checkpoints | Role-Based Access | Evidence Tracking | API-First Design

A white-label, multi-tenant SaaS platform for managing service operations through configurable checkpoint workflows. Built for car detailing, auto repair, electronics repair, appliance service, furniture restoration, equipment maintenance — any industry with sequential service stages.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS 3, Shadcn/UI, Phosphor Icons |
| **Backend** | Python 3.11, FastAPI, Motor (async MongoDB driver) |
| **Database** | MongoDB 7 |
| **Auth** | JWT (httpOnly cookies) + Google OAuth (Emergent Auth) |
| **Typography** | Barlow Condensed (headings), IBM Plex Sans (body) |
| **Package Manager** | yarn (frontend), pip (backend) |

---

## Features

### Multi-Tenant Architecture
- Super Admin provisions independent tenant instances
- Each tenant has isolated data, users, checkpoints, and roles
- White-label ready — configurable per tenant

### Checkpoint Workflow Engine
- Configurable sequential stages (Intake → Wash → Paint → Interior → Inspection → Delivery)
- Subtasks within each checkpoint with evidence requirements
- Blocking logic — cannot advance until evidence is uploaded
- Automatic progression to next checkpoint when all subtasks complete

### Role-Based Access Control (RBAC)
| Role | Access |
|------|--------|
| Super Admin | Full platform — create/manage all tenants |
| Tenant Admin | Full tenant — checkpoints, users, items, roles |
| Supervisor | Assign technicians to workflows, view all items |
| Receptionist | Register clients, create items, assign vehicles |
| Technician | Complete assigned tasks, upload evidence |
| Inspector | Quality review, approve/reject work |
| Client | View item progress, register items, request quotes |
| Viewer | Read-only access |

### Evidence Management
- Before/during/after photo uploads per subtask
- Document and note attachments
- Evidence required before task completion (configurable)

### Multi-Language Support
- English and Spanish built-in
- Language toggle on all pages
- Bilingual checkpoint/subtask names

### Client Features
- Self-registration and item submission
- Real-time progress tracking with percentage
- Quote request form (public)
- Visual checkpoint timeline

### Pricing Tiers
| Plan | Price | Tenants | Users | Checkpoints |
|------|-------|---------|-------|-------------|
| Starter | $49/mo | 1 | 5 | 3 |
| Pro | $149/mo | 3 | 25 | Unlimited |
| Enterprise | $399/mo | Unlimited | Unlimited | Unlimited |

---

## Installation

### Prerequisites
- Node.js 18+ with yarn
- Python 3.11+
- MongoDB 7+

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env   # or create .env with:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="checkpointhub"
# JWT_SECRET="your-64-char-hex-secret"
# ADMIN_EMAIL="admin@checkpointhub.com"
# ADMIN_PASSWORD="admin123"
# FRONTEND_URL="http://localhost:3000"

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.example .env   # or create .env with:
# REACT_APP_BACKEND_URL=http://localhost:8001

yarn install
yarn start
```

### 3. Seed Demo Data

After both services are running:

```bash
# Login as super admin
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@checkpointhub.com","password":"admin123"}'

# Seed full demo (creates tenant, users, vehicles, checkpoints)
curl -b cookies.txt -X POST http://localhost:8001/api/admin/seed-full-demo
```

---

## Deployment

### Docker (Recommended)

The application is designed to run in a containerized environment:

```bash
# Backend
docker run -d --name checkpointhub-backend \
  -e MONGO_URL=mongodb://mongo:27017 \
  -e DB_NAME=checkpointhub \
  -e JWT_SECRET=your-secret \
  -e FRONTEND_URL=https://yourdomain.com \
  -p 8001:8001 \
  checkpointhub-backend

# Frontend
docker run -d --name checkpointhub-frontend \
  -e REACT_APP_BACKEND_URL=https://api.yourdomain.com \
  -p 3000:3000 \
  checkpointhub-frontend
```

### Kubernetes / Emergent Platform

The app is pre-configured for Kubernetes with:
- Backend on port 8001 (ingress routes `/api/*`)
- Frontend on port 3000 (ingress routes everything else)
- MongoDB via `MONGO_URL` environment variable
- Supervisor manages both processes with hot reload

### Environment Variables

**Backend (`/app/backend/.env`)**
| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | 64-char hex secret for JWT signing |
| `ADMIN_EMAIL` | Super admin email (seeded on startup) |
| `ADMIN_PASSWORD` | Super admin password |
| `FRONTEND_URL` | Frontend URL for CORS |

**Frontend (`/app/frontend/.env`)**
| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | Backend API base URL |

---

## API Reference

### Public Endpoints (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/public/quote-request` | Submit quote request |
| POST | `/api/public/tenant-signup` | Self-service tenant registration |

### Auth Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/session` | Google OAuth session exchange |

### Super Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tenants` | List all tenants |
| POST | `/api/admin/tenants` | Create tenant |
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/{id}/role` | Update user role/tenant |
| GET | `/api/admin/stats` | Platform statistics |
| POST | `/api/admin/seed-full-demo` | Seed demo data |

### Tenant Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tenant/checkpoints` | CRUD checkpoints |
| GET/POST | `/api/tenant/checkpoints/{id}/subtasks` | CRUD subtasks |
| GET/POST | `/api/tenant/users` | Manage tenant users |
| GET | `/api/tenant/roles` | List roles |
| GET/POST | `/api/tenant/items` | Manage items |
| POST | `/api/tenant/items/assign` | Assign item to client by email |
| GET | `/api/tenant/quotes` | View quote requests |

### Worker Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/worker/tasks` | Get assigned tasks |
| GET | `/api/worker/items/{id}` | Item detail with checkpoints |
| POST | `/api/worker/items/{id}/progress` | Update task progress |
| POST | `/api/worker/items/{id}/evidence` | Upload evidence |

### Client Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/client/items` | List client's items |
| POST | `/api/client/items` | Register new item |
| GET | `/api/client/items/{id}` | Item progress detail |

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application (all endpoints)
│   ├── .env               # Environment variables
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main app, routing, auth, i18n
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── SuperAdminDashboard.jsx
│   │   │   ├── TenantAdminDashboard.jsx
│   │   │   ├── WorkerPortal.jsx
│   │   │   ├── ClientPortal.jsx
│   │   │   └── DemoShowcase.jsx
│   │   ├── components/
│   │   │   ├── LanguageToggle.jsx
│   │   │   └── ui/          # Shadcn components
│   │   ├── index.css        # Tailwind + custom styles
│   │   └── index.js
│   ├── .env
│   └── package.json
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
└── README.md
```

---

## Demo Credentials

| Role | Email | Password | URL |
|------|-------|----------|-----|
| Super Admin | admin@checkpointhub.com | admin123 | /admin |
| Tenant Admin | carlos@elitedetail.com | demo123 | /tenant |
| Supervisor | miguel@elitedetail.com | demo123 | /worker |
| Technician | roberto@elitedetail.com | demo123 | /worker |
| Inspector | pedro@elitedetail.com | demo123 | /worker |
| Client | maria@cliente.com | demo123 | /client |
| Client | juan@cliente.com | demo123 | /client |

**Demo Showcase**: `/demo` — interactive page with screenshots and one-click login

---

## License

Proprietary. All rights reserved.
