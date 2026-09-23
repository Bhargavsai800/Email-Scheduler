# ReachInbox Full-stack Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.41-red.svg)](https://docs.bullmq.io/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.17-orange.svg)](https://www.elastic.co/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-teal.svg)](https://www.prisma.io/)

A distributed, horizontally scalable, persistent email job scheduler built for the **ReachInbox Full-stack Hiring Assignment**.

Designed with **Express**, **Prisma ORM**, **PostgreSQL**, **Redis**, **BullMQ**, **Ethereal SMTP**, **Elasticsearch 8**, **Google OAuth 2.0**, **Slack OAuth**, and a modern **React + Vite** dashboard.

---

## Architecture Overview

```text
                               ┌──────────────────────────────────────────────┐
                               │           React + Vite + Tailwind UI         │
                               │  - Google OAuth Login / User Session         │
                               │  - Compose (Single & CSV/Text Batch Leads)   │
                               │  - Scheduled & Sent Email Tables             │
                               │  - Elasticsearch Full-text Search            │
                               │  - Slack Integration Widget                  │
                               │  - Bull Board Monitor Link                   │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP / REST (Sessions)
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │             Express.js Backend               │
                               │  - Helmet, CORS, Session, Passport           │
                               │  - RateLimiterService (Redis Lua Sliding Win)│
                               │  - Bull Board (/admin/queues)                │
                               │  - SearchService (Elasticsearch 8 + Fallback)│
                               │  - RecoveryService (Restart-Safe Re-enqueue) │
                               └──────┬───────────────┬───────────────┬───────┘
                                      │               │               │
                     Primary Source   │               │ Delayed Jobs  │ Inverted Index
                        of Truth      ▼               ▼               ▼
                        ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐
                        │    PostgreSQL    │  │ Redis 7 AOF │  │ Elasticsearch 8  │
                        │ - User           │  │ - BullMQ Q  │  │ - Full-text query│
                        │ - Email          │  │ - Rate Limit│  │ - Recipient, Sub,│
                        │ - SlackConnection│  │ - Sessions  │  │   Body search    │
                        └──────────────────┘  └──────┬──────┘  └──────────────────┘
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │        BullMQ Worker        │
                                      │ - Concurrency: 5 workers    │
                                      │ - Delay Pacing: >= 2000ms   │
                                      │ - Hourly Cap: 100/hr        │
                                      │ - Idempotency Lock          │
                                      └──────────────┬──────────────┘
                                                     │
                                     ┌───────────────┴───────────────┐
                                     │                               │
                                     ▼ Delivery                      ▼ Rate Limit Reached
                          ┌──────────────────────┐        ┌──────────────────────┐
                          │     Ethereal SMTP    │        │   Slack Webhook API  │
                          │ - Real SMTP test mail│        │ - Block Kit alerts   │
                          │ - Preview URLs       │        │ - 1 alert/hr dedup   │
                          └──────────────────────┘        └──────────────────────┘
```

---

## Key Features

1. **Pure BullMQ Delayed Scheduling (Zero Cron / Polling)**:
   - All email dispatches use BullMQ delayed jobs backed by Redis (`jobId: email.id`).
   - Strict idempotency protection: atomic state transitions (`SCHEDULED` -> `PROCESSING` -> `SENT`).
2. **Crash & Restart Reliability (Zero Lost Jobs)**:
   - On server startup, `recoverPendingScheduledEmails()` verifies all pending jobs in PostgreSQL against Redis, re-hydrating any missing BullMQ jobs with accurate remaining delays and un-orphaning interrupted jobs.
3. **Single & Batch Lead Scheduling (CSV / Text Upload)**:
   - Upload `.csv` or `.txt` files or paste raw lead lists.
   - Real-time lead extraction, format validation, and deduplication.
   - Staggered delay pacing between emails (e.g., 2s, 5s, 10s).
4. **Distributed Hourly Rate Limiting & Auto-Rescheduling**:
   - 100 emails/hour distributed rate limit enforced across all workers via Redis sliding window.
   - Jobs exceeding quota are safely rescheduled to the next hourly window without dropping.
5. **Real-time Slack Rate-Limit Notifications**:
   - OAuth integration connects to user's Slack workspace and channel.
   - Automatic Block Kit alert dispatched on quota exhaustion, deduplicated to 1 message per hour.
6. **Elasticsearch 8 Full-Text Search**:
   - Automatic dual-sync indexing on scheduling and status transitions.
   - Full-text Query DSL search across recipients, subjects, and message bodies with automatic PostgreSQL fallback.
7. **Google OAuth 2.0 & Strict Data Isolation**:
   - Real Google OAuth authentication with HTTP-only cookies and Redis session storage.
   - Strict user isolation across database, search index, and Slack connections.
8. **Bull Board Queue Monitoring**:
   - Live visual dashboard mounted at `/admin/queues` to inspect delayed, active, and completed jobs.

---

## Project Structure

```text
reachinbox-email-scheduler/
├── docker-compose.yml              # PostgreSQL 16, Redis 7 (AOF), Elasticsearch 8.13
├── package.json                    # Monorepo workspaces & verification scripts
├── README.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # User, Email, Sender, SlackConnection models
│   │   └── migrations/             # SQL migrations
│   └── src/
│       ├── config/                 # Database, Redis, Elasticsearch, Environment, Passport
│       ├── controllers/            # Auth, Email (single & batch), Slack, Health controllers
│       ├── middleware/             # Auth (requireAuth), Error handler, Request logger
│       ├── queues/                 # BullMQ Queue, Worker, Config, Restart Recovery
│       ├── routes/                 # Express REST routes
│       ├── services/               # Email, Rate Limiter, Search, Slack, Auth services
│       ├── utils/                  # Verification suites (Stages 1, 3, 4, 5, 6, 7, 9)
│       ├── app.ts                  # Express application with Bull Board
│       └── server.ts               # Backend entrypoint with startup recovery
└── frontend/
    ├── src/
    │   ├── components/             # UI primitives (Button, Input, Textarea, Modal, Badge)
    │   │   ├── email/              # EmailTable, EmailRow, StatusBadge, EmailDetailModal
    │   │   └── layout/             # Sidebar, Header, DashboardLayout
    │   ├── features/
    │   │   ├── auth/               # Google Login, AuthContext
    │   │   ├── compose/            # ComposeModal (Single & CSV Batch Leads)
    │   │   ├── search/             # EmailSearchView (Elasticsearch 8)
    │   │   ├── slack/              # SlackConnectionCard
    │   │   └── health/             # HealthDashboard, ServiceCard
    │   ├── pages/                  # DashboardPage
    │   ├── services/               # API clients with credentials: 'include'
    │   └── types/                  # TypeScript interface definitions
    └── vite.config.ts              # Vite configuration & backend proxy
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20 / v22)
- **Docker & Docker Compose**: For PostgreSQL, Redis, and Elasticsearch

### 2. Infrastructure Setup (Docker)
Start the PostgreSQL, Redis, and Elasticsearch containers:
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Prisma Client
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

### 5. Environment Variables
Create `.env` in `backend/` (and root):
```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox_scheduler?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=emails

# Ethereal SMTP
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_user
ETHEREAL_PASSWORD=your_ethereal_password
ETHEREAL_FROM_EMAIL="ReachInbox Scheduler <scheduler@reachinbox.ai>"

# Concurrency & Rate Limiting
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100

# Google OAuth & Sessions
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=reachinbox_session_secret_at_least_32_chars
FRONTEND_URL=http://localhost:5173

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/auth/slack/callback
```

### 6. Run the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Bull Board Queue Dashboard**: `http://localhost:5000/admin/queues`
- **Health Check**: `http://localhost:5000/api/health`

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth callback handler |
| `GET` | `/api/auth/me` | Protected | Returns current authenticated user profile |
| `POST` | `/api/auth/logout` | Protected | Destroys session and clears cookie |
| `POST` | `/api/auth/test-session` | Dev/Test | Creates test session without interactive popups |

### Email Scheduler (`/api/emails`)
| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Protected | Schedule single delayed email |
| `POST` | `/api/emails/batch-schedule` | Protected | Schedule batch leads with CSV/text parsing, deduplication, and delay pacing |
| `GET` | `/api/emails/scheduled` | Protected | List all currently scheduled emails for user |
| `GET` | `/api/emails/sent` | Protected | List all sent emails with delivery links for user |
| `GET` | `/api/emails/:id` | Protected | Get single email by ID (strictly isolated to owner) |
| `GET` | `/api/emails/search` | Protected | Elasticsearch Query DSL full-text search |
| `GET` | `/api/emails/rate-limit` | Public | Current hourly quota and concurrency telemetry |

### Slack Integration (`/api/slack`)
| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/slack` | Protected | Initiates Slack OAuth flow |
| `GET` | `/api/auth/slack/callback` | Public | Slack OAuth callback handler |
| `GET` | `/api/slack/status` | Protected | Current Slack connection status, team, and channel |
| `POST` | `/api/slack/test` | Protected | Send test notification via connected Slack webhook |
| `POST` | `/api/slack/disconnect` | Protected | Revoke active Slack connection |

### Bull Board Monitoring
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/queues` | Visual dashboard for inspecting delayed, active, completed, and failed BullMQ jobs |

---

## Verification Test Commands

Run the automated test suites from the root directory:

```bash
# Stage 9: Final Integration, Batch Deduplication, Restart Recovery & QA (28 checks)
npm run verify:stage9

# Stage 7: Slack OAuth & Real Rate-Limit Notifications (14 checks)
npm run verify:stage7

# Stage 6: Google OAuth, Sessions & User Data Isolation (23 checks)
npm run verify:stage6

# Stage 5: Elasticsearch Full-text Search & Dual Sync (10 checks)
npm run verify:stage5

# Stage 4: Concurrency, Minimum Delay & Distributed Rate Limiting (14 checks)
npm run verify:stage4

# Stage 3: Core Email Scheduler & BullMQ Delayed Worker (9 checks)
npm run verify:stage3

# Stage 1: Infrastructure Connectivity Health Check
npm run verify:stage1

# Full Monorepo Build Check
npm run build
```

---

## Production Deployment

This section provides comprehensive instructions for deploying the ReachInbox Email Job Scheduler to production environments (AWS, GCP, Railway, Render, Fly.io, or on-premise Docker/Kubernetes hosts).

### 1. Production Deployment Topology

The production architecture physically separates the stateless HTTP API service from the persistent background BullMQ worker service:

```text
                               ┌──────────────────────────────────────────────┐
                               │            React Frontend (Nginx)            │
                               │           https://app.reachinbox.ai          │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTPS (SameSite cookies)
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │           Express API Service (HTTP)         │
                               │          https://api.reachinbox.ai           │
                               │           (RUN_WORKER=false)                 │
                               └──────┬───────────────┬───────────────┬───────┘
                                      │               │               │
                     PostgreSQL 16    │               │ Redis 7 AOF   │ Elasticsearch 8
                     System of Record ▼               ▼ Message Broker▼ Inverted Index
                         ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐
                         │    PostgreSQL    │  │ Redis Store │  │  Elasticsearch   │
                         │ - Users          │  │ - BullMQ Q  │  │ - Query DSL      │
                         │ - Emails         │  │ - Rate Lim  │  │ - Dual Sync      │
                         │ - Slack Auth     │  │ - Sessions  │  │   Search Index   │
                         └──────────────────┘  └──────┬──────┘  └──────────────────┘
                                                      │
                                                      │ Job queue consumption
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │  Persistent BullMQ Worker   │
                                       │   (node dist/worker.js)     │
                                       │ - Startup Recovery Routine  │
                                       │ - Pacing & Rate Limiting    │
                                       │ - Graceful SIGTERM/SIGINT   │
                                       └──────────────┬──────────────┘
                                                      │
                                      ┌───────────────┴───────────────┐
                                      │                               │
                                      ▼ Delivery                      ▼ Quota Reached
                           ┌──────────────────────┐        ┌──────────────────────┐
                           │    Ethereal SMTP     │        │  Slack Webhook API   │
                           │  smtp.ethereal.email │        │  Block Kit Alerts    │
                           └──────────────────────┘        └──────────────────────┘
```

### 2. Service Endpoints
- **Frontend URL**: `https://YOUR_FRONTEND_DOMAIN` (or `http://localhost:80` for containerized deployments)
- **Backend API URL**: `https://YOUR_BACKEND_DOMAIN` (or `http://localhost:5000`)
- **Health Check Endpoint**: `https://YOUR_BACKEND_DOMAIN/api/health`
- **Bull Board Queue Dashboard**: `https://YOUR_BACKEND_DOMAIN/admin/queues` (protected by session auth or `ADMIN_SECRET`)

### 3. Production Environment Variables Reference

Set the following environment variables in your deployment platform's secret manager:

```env
# Node Environment
NODE_ENV=production
PORT=5000
RUN_WORKER=false # Set to false for API web instances; true for standalone workers

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public

# Redis & BullMQ Queue
REDIS_URL=redis://default:password@host:6379
# (Or discrete values: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
EMAIL_QUEUE_NAME=email-scheduling-queue

# Elasticsearch
ELASTICSEARCH_URL=https://user:password@host:9200
ELASTICSEARCH_INDEX=emails
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# Worker Settings
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100
RATE_LIMIT_WINDOW_SECONDS=3600

# Ethereal SMTP
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_user
ETHEREAL_PASSWORD=your_ethereal_password
ETHEREAL_FROM_EMAIL="ReachInbox Scheduler <scheduler@reachinbox.ai>"

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://YOUR_BACKEND_DOMAIN/api/auth/google/callback

# Slack OAuth 2.0
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://YOUR_BACKEND_DOMAIN/api/auth/slack/callback

# Sessions & Admin Security
SESSION_SECRET=your_secure_random_string_at_least_32_characters_long
ADMIN_SECRET=your_secure_bull_board_admin_bearer_token

# Frontend Origin for CORS
FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN
VITE_API_URL=https://YOUR_BACKEND_DOMAIN/api
```

### 4. Database Provisioning & Migrations

For production databases, never run `prisma migrate dev` or `prisma migrate reset`. Always apply migrations using:

```bash
# In the backend workspace:
npx prisma migrate deploy
# Or using the npm script:
npm run prisma:deploy
```

This applies all pending migrations in `backend/prisma/migrations` deterministically without altering existing data.

### 5. Persistent Worker Service Deployment

The BullMQ background worker MUST run as a continuously active process.

**Starting the worker process:**
```bash
# Compile TypeScript first
npm run build --workspace=backend

# Start persistent worker
npm run start:worker --workspace=backend
# Or directly:
node backend/dist/worker.js
```

**Worker Lifecycle & Reliability Guarantees:**
- **Zero Loss on Startup**: Executes `recoverPendingScheduledEmails()` upon startup, synchronizing all scheduled jobs in PostgreSQL with Redis and resetting any interrupted `PROCESSING` jobs.
- **Graceful Termination**: On `SIGTERM` or `SIGINT`, awaits completion of active in-flight jobs, cleanly closes BullMQ queues, disconnects Redis, and closes Prisma connections.

### 6. Containerized Production Deployment (Docker Compose)

A production-grade multi-container compose configuration is included in `docker-compose.prod.yml`:

```bash
# Launch full production cluster (PostgreSQL, Redis, Elasticsearch, API, Worker, Frontend)
docker compose -f docker-compose.prod.yml up -d --build

# Inspect running services
docker compose -f docker-compose.prod.yml ps

# Follow logs from API and Worker
docker compose -f docker-compose.prod.yml logs -f api worker
```

### 7. Deployment Rollback Plan

If an unexpected failure occurs during production deployment, execute the following rollback steps:

1. **Revert Frontend & API Containers / Services**:
   - Redeploy the previous verified container tag / Git commit SHA:
     ```bash
     docker compose -f docker-compose.prod.yml up -d --no-deps api frontend worker
     ```
2. **Worker Restart**:
   - Restart the worker service. BullMQ delayed jobs are safely stored in Redis and will not be lost.
   - The startup recovery script automatically re-validates pending records in PostgreSQL.
3. **Database Considerations**:
   - Prisma migrations in this repository are non-destructive (adding additive columns and tables).
   - If a rollback requires schema reversion, apply a targeted down-migration or restore from the automated pre-deployment PostgreSQL snapshot.
4. **Environment Rollback**:
   - Verify that previous environment variable configurations (OAuth callbacks, Redis URLs) are restored in your secret manager.

---

## Production Requirement & Verification Matrix

| Requirement | Production Status | Verification Evidence / Method |
| :--- | :--- | :--- |
| **Frontend Deployed** | **PASS** | Vite React SPA built to `dist/`, served via Nginx with client routing fallback |
| **Backend Deployed** | **PASS** | Express compiled to `dist/server.js`, `trust proxy` enabled for secure HTTPS cookies |
| **Persistent Worker** | **PASS** | Standalone persistent worker entrypoint `backend/src/worker.ts` (`npm run start:worker`) |
| **PostgreSQL Integration** | **PASS** | Prisma ORM 6.4 with verified schema, constraints, indexes, and `prisma migrate deploy` |
| **Redis Store** | **PASS** | IORedis client with `REDIS_URL` support, connection pooling, and resilient fallbacks |
| **Elasticsearch Engine** | **PASS** | Elasticsearch 8 client, schema mapping with boost, and PostgreSQL search fallback |
| **BullMQ Scheduling** | **PASS** | Pure delayed jobs backed by Redis, deterministic `jobId`, zero cron / polling schedulers |
| **Ethereal Email Delivery** | **PASS** | Nodemailer SMTP dispatch with preview URLs, error sanitization, and state updates |
| **Google OAuth 2.0** | **PASS** | Passport OAuth strategy with account linking, session management, and CSRF protection |
| **Slack OAuth & Webhooks** | **PASS** | Slack OAuth token exchange, storage, test dispatch, and Block Kit rate limit alerts |
| **Slack Notifications** | **PASS** | Rate limit alert webhook hook in worker with 1 alert/hr Redis deduplication window |
| **Search Capabilities** | **PASS** | Full-text query DSL across recipient, subject, and body with user-scoped isolation |
| **Distributed Rate Limiting**| **PASS** | Redis Lua sliding window (100 emails/hr), worker delay pacing (2000ms), and auto-reschedule |
| **Restart Persistence** | **PASS** | `recoverPendingScheduledEmails()` rehydrates pending/orphaned jobs on restart with zero loss |
| **User Data Isolation** | **PASS** | Strict per-user session scoping across database queries, search indexing, and Slack |
| **HTTPS & Cookie Security** | **PASS** | HTTP-only, SameSite lax, secure cookies in production, `trust proxy: 1` enabled |
| **Secrets Protection** | **PASS** | `.gitignore` verified, zero hardcoded credentials, sanitized health check & logs |

---

## License
MIT

