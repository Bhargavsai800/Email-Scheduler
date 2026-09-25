# ReachInbox Full-stack Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.41-red.svg)](https://docs.bullmq.io/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.17-orange.svg)](https://www.elastic.co/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-teal.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

A distributed, horizontally scalable, persistent email job scheduler built for the **ReachInbox Full-stack Hiring Assignment**.

Designed with **Node.js/Express**, **Prisma ORM**, **PostgreSQL**, **Redis**, **BullMQ**, **Ethereal SMTP**, **Elasticsearch 8**, **Google OAuth 2.0**, **Slack OAuth**, and a modern **React + Vite** dashboard.

---

## Live Deployments

- 🌐 **Frontend (Vercel)**: [https://email-scheduler-frontend-rho.vercel.app](https://email-scheduler-frontend-rho.vercel.app)
- 🚀 **Backend REST API (Render)**: [https://email-scheduler-jukj.onrender.com/api](https://email-scheduler-jukj.onrender.com/api)
- 📊 **Health Check Endpoint**: [https://email-scheduler-jukj.onrender.com/api/health](https://email-scheduler-jukj.onrender.com/api/health)
- 📈 **Bull Board Queue Dashboard**: [https://email-scheduler-jukj.onrender.com/admin/queues](https://email-scheduler-jukj.onrender.com/admin/queues)

---

## Table of Contents

1. [Features Implemented (Mapped)](#features-implemented)
   - [Backend Features](#backend-features)
   - [Frontend Features](#frontend-features)
2. [Architecture Overview](#architecture-overview)
   - [System Topology](#system-topology)
   - [How Scheduling Works (Zero Cron / Polling)](#1-how-scheduling-works)
   - [How Persistence on Restart is Handled](#2-how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#3-how-rate-limiting--concurrency-are-implemented)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Setting Up Ethereal Email](#setting-up-ethereal-email)
5. [How to Run Backend](#how-to-run-backend)
6. [How to Run Frontend](#how-to-run-frontend)
7. [Running the Full Stack Together](#running-the-full-stack-together)
8. [API Reference](#api-reference)
9. [Automated Verification Tests](#automated-verification-tests)

---

## Features Implemented

### Backend Features

| Feature Category | Description | Implementation File(s) |
| :--- | :--- | :--- |
| **Scheduler** | Pure BullMQ delayed job queue (`email-scheduling-queue`). Deterministic `jobId: email.id`. Real-time single scheduling & batch CSV/text upload with lead deduplication, format normalization, and delay pacing. **Zero cron jobs or polling intervals**. | `backend/src/queues/email.queue.ts`<br>`backend/src/controllers/email.controller.ts` |
| **Persistence** | PostgreSQL is the primary System of Record (SoR) via Prisma ORM. Redis AOF persistence protects in-flight queue states. On application boot or worker restart, `recoverPendingScheduledEmails()` scans PostgreSQL for pending/orphaned jobs and re-enqueues them with accurate remaining delays. **Zero lost jobs on crashes**. | `backend/src/queues/email.recovery.ts`<br>`backend/src/config/db.ts` |
| **Rate Limiting** | Distributed sliding window enforced via Redis (100 emails/hour limit). Jobs exceeding quota are automatically rescheduled to the start of the next hour window rather than dropped. Dispatches real-time Slack Block Kit alerts upon quota exhaustion (deduplicated to 1 alert/hr via Redis lock). | `backend/src/services/rate-limiter.service.ts`<br>`backend/src/services/slack.service.ts` |
| **Concurrency** | Worker concurrency of 5 parallel jobs (`WORKER_CONCURRENCY=5`). Minimum pacing delay between consecutive dispatches (`MIN_EMAIL_DELAY_MS=2000`) prevents burst spamming. Atomic job state machine (`SCHEDULED` -> `PROCESSING` -> `SENT` / `FAILED`) prevents double execution. | `backend/src/queues/email.worker.ts`<br>`backend/src/services/rate-limiter.service.ts` |
| **Search Engine** | Elasticsearch 8 indexing with dual-sync hooks on scheduling and state transitions. Full-text Query DSL search across recipient, subject, and body with resilient automatic PostgreSQL database fallback. | `backend/src/services/search.service.ts`<br>`backend/src/config/elasticsearch.ts` |
| **Authentication & Sessions** | Google OAuth 2.0 with Passport strategy. Cross-domain HTTP-only session cookies (`sameSite: 'none'`, `secure: true` in production). Resilient Redis session storage with in-memory fallback. | `backend/src/config/passport.ts`<br>`backend/src/config/session.ts`<br>`backend/src/middleware/auth.middleware.ts` |
| **Monitoring & Health** | Live Bull Board dashboard mounted at `/admin/queues`. Zero-credential health telemetry endpoint at `/api/health` inspecting PostgreSQL, Redis, BullMQ, and Elasticsearch latencies. | `backend/src/app.ts`<br>`backend/src/routes/health.routes.ts` |

### Frontend Features

| Feature Category | Description | Implementation File(s) |
| :--- | :--- | :--- |
| **Login & Auth** | Google Sign-In with OAuth redirect flow, active session detection (`/api/auth/me`), user avatar and profile banner, and secure session logout. | `frontend/src/features/auth/AuthContext.tsx`<br>`frontend/src/features/auth/auth.api.ts` |
| **Dashboard Telemetry** | Real-time service connectivity cards (Database, Redis, BullMQ Queue, Elasticsearch) showing live latencies, uptime, and an hourly rate limit visual progress meter. | `frontend/src/features/health/HealthDashboard.tsx`<br>`frontend/src/pages/DashboardPage.tsx` |
| **Compose Modal** | Dual-mode composer: **Single Email** and **Batch Lead Ingestion** via `.csv` or `.txt` file upload or raw paste. Real-time recipient counter, email syntax validation, and configurable delay spacing (e.g. 2s, 5s, 10s). | `frontend/src/features/compose/ComposeModal.tsx`<br>`frontend/src/features/compose/BatchScheduler.tsx` |
| **Scheduled Emails Table** | Live list of pending jobs with countdown timers (`scheduledAt`), recipient, subject, and status badges (`SCHEDULED`, `PROCESSING`). | `frontend/src/components/email/EmailTable.tsx`<br>`frontend/src/components/email/EmailRow.tsx` |
| **Sent Emails Table** | Historical log of dispatched emails with exact `sentAt` timestamps and direct clickable link to Ethereal email web preview. | `frontend/src/components/email/EmailTable.tsx` |
| **Email Detail Modal** | Full email inspection drawer displaying recipient, subject, plain text / HTML body preview, BullMQ job ID, timestamps, and Ethereal preview URL. | `frontend/src/components/email/EmailDetailModal.tsx` |
| **Elasticsearch Search View** | Real-time full-text search bar with recipient filtering, status filtering (`ALL`, `SCHEDULED`, `SENT`, `FAILED`), search latency display, and database fallback badge. | `frontend/src/features/search/EmailSearchView.tsx` |
| **Slack Integration Card** | Dedicated integration card to connect Slack workspace via OAuth, view connected team and channel, and trigger an instant test notification. | `frontend/src/features/slack/SlackConnectionCard.tsx`<br>`frontend/src/features/slack/slack.api.ts` |
| **Bull Board Quick Link** | Direct link in sidebar to access Bull Board queue monitoring at `/admin/queues`. | `frontend/src/components/layout/Sidebar.tsx` |

---

## Architecture Overview

### System Topology

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

### 1. How Scheduling Works

1. **Client Dispatches Request**: The frontend calls `POST /api/emails/schedule` or `POST /api/emails/batch-schedule`.
2. **Database Record Created First**: An immutable record is created in PostgreSQL with status `SCHEDULED`.
3. **Delayed Job Added to BullMQ**:
   ```typescript
   const delay = Math.max(0, scheduledAt.getTime() - Date.now());
   await emailQueue.add(
     'send-email',
     { emailId: email.id, recipient, subject, body, userId },
     { delay, jobId: email.id, removeOnComplete: false, removeOnFail: false }
   );
   ```
4. **Zero Polling Schedulers**: BullMQ uses Redis sorted sets (`zadd` with Unix millisecond scores). There are **no polling loops or cron intervals** checking the database. When the target timestamp arrives, Redis immediately pushes the job to the active stream.
5. **Worker Execution**: The BullMQ worker receives the job, updates the database status to `PROCESSING`, enforces delay pacing and rate limits, and dispatches the email via SMTP.

---

### 2. How Persistence on Restart is Handled

One of the core requirements of this system is **zero lost jobs across server crashes or service restarts**:

1. **System of Record (SoR)**: PostgreSQL holds the persistent record of all scheduled emails.
2. **Redis AOF (Append-Only File)**: Redis is configured with AOF enabled so queued jobs survive Redis service restarts.
3. **Startup Recovery Routine (`recoverPendingScheduledEmails`)**:
   Whenever the backend or worker boots up:
   - Scans PostgreSQL for any emails in `SCHEDULED` status.
   - Inspects the BullMQ queue in Redis by deterministic `jobId: email.id`.
   - If the job is already present in Redis in delayed/waiting state, it is left untouched.
   - If missing from Redis (e.g. after Redis data loss or manual flush), it calculates the remaining delay:
     ```typescript
     const remainingDelay = Math.max(0, email.scheduledAt.getTime() - Date.now());
     await emailQueue.add('send-email', jobData, { delay: remainingDelay, jobId: email.id });
     ```
   - **Orphan Job Cleanup**: If an email was interrupted mid-flight (`PROCESSING`) when a worker crashed, the recovery routine resets its status back to `SCHEDULED` and re-queues it for immediate processing.

---

### 3. How Rate Limiting & Concurrency are Implemented

#### Concurrency (Parallel Processing)
- BullMQ worker is initialized with `concurrency: 5`:
  ```typescript
  export const emailWorker = new Worker('email-scheduling-queue', processEmailJob, {
    connection: redisOptions,
    concurrency: config.workerConcurrency, // 5
  });
  ```
- 5 jobs can be actively processed simultaneously across the worker threads without blocking the event loop.

#### Minimum Delay Pacing (>= 2000ms)
- To prevent spam-flagging and SMTP connection throttling, consecutive emails enforce a minimum delay of 2,000ms.
- The worker queries a Redis timestamp key (`ratelimit:last_email_timestamp`) using an atomic sliding lock. If the elapsed time since the previous send is less than 2,000ms, the worker introduces an artificial sleep for the remaining delta before firing the SMTP command.

#### Distributed Hourly Sliding Window (100 emails/hour)
- Uses Redis Sorted Sets (`zset`) with Unix epoch millisecond timestamps:
  1. Removes entries older than 3600 seconds (`ZREMRANGEBYSCORE`).
  2. Counts entries in the current 1-hour window (`ZCARD`).
  3. If count `< 100`: Adds current timestamp (`ZADD`), records expiration, and proceeds with dispatch.
  4. If count `>= 100`: Quota is exhausted.
- **Auto-Rescheduling**: Instead of failing or dropping the job, BullMQ calculates the time remaining until the oldest job expires from the 1-hour window and reschedules the email to that future timestamp:
  ```typescript
  const delayUntilNextWindow = windowStartMs + 3600000 - Date.now() + 1000;
  await emailQueue.add('send-email', job.data, { delay: delayUntilNextWindow });
  ```
- **Slack Alerting**: Dispatches a Block Kit alert to the user's Slack webhook. Dispatches are deduplicated using a Redis key with an 1-hour TTL (`SET slack:rate-limit-alert:{userId} 1 EX 3600 NX`), ensuring **at most 1 notification per hour**.

---

## Environment Variables Setup

### 1. Backend Environment Variables (`backend/.env`)

Create a `.env` file in `backend/` (or copy from `backend/.env.example`):

```env
# ==============================================================================
# Server Runtime
# ==============================================================================
PORT=5000
NODE_ENV=development

# ==============================================================================
# Database (PostgreSQL)
# ==============================================================================
# Local Docker or hosted Supabase PostgreSQL (IPv4 Pooler recommended for cloud)
DATABASE_URL=postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox_scheduler?schema=public

# ==============================================================================
# Redis & BullMQ
# ==============================================================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EMAIL_QUEUE_NAME=email-scheduling-queue

# ==============================================================================
# Ethereal SMTP Provider (Email Delivery)
# ==============================================================================
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your_ethereal_user@ethereal.email
ETHEREAL_PASSWORD=your_ethereal_password
ETHEREAL_FROM_EMAIL="ReachInbox Scheduler <scheduler@reachinbox.ai>"

# ==============================================================================
# Worker & Distributed Rate Limiting
# ==============================================================================
RUN_WORKER=true
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=100
RATE_LIMIT_WINDOW_SECONDS=3600

# ==============================================================================
# Session Security & Admin
# ==============================================================================
SESSION_SECRET=reachinbox-production-session-secret-change-me-to-at-least-32-chars
ADMIN_SECRET=reachinbox-bull-board-admin-secret-token

# ==============================================================================
# Google OAuth 2.0 Credentials
# ==============================================================================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ==============================================================================
# Slack OAuth 2.0 & Webhooks
# ==============================================================================
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:5000/api/auth/slack/callback

# ==============================================================================
# Frontend Origin for CORS
# ==============================================================================
FRONTEND_URL=http://localhost:5173

# ==============================================================================
# Elasticsearch 8 Engine
# ==============================================================================
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=emails
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### 2. Frontend Environment Variables (`frontend/.env`)

Create a `.env` file in `frontend/`:

```env
# Point to local backend (for local dev) or deployed Render backend (for cloud)
VITE_API_URL=http://localhost:5000/api
```

---

## Setting Up Ethereal Email

Ethereal is a free, safe fake SMTP service for testing email dispatches without sending real emails to recipients.

### Method 1: Automatic Setup via CLI (1-Command)

Run the included automated helper script from the backend workspace:

```bash
cd backend
npm run ethereal:setup
```

This will automatically:
1. Contact the Ethereal API to generate a new test mailbox.
2. Print your `ETHEREAL_USER` and `ETHEREAL_PASSWORD`.
3. Automatically update your `backend/.env` file with the generated credentials.

### Method 2: Manual Setup via Web

1. Open [https://ethereal.email/create](https://ethereal.email/create) in your browser.
2. Click **Create Ethereal Account**.
3. Copy the **Username** and **Password** provided on screen.
4. Paste them into `backend/.env`:
   ```env
   ETHEREAL_HOST=smtp.ethereal.email
   ETHEREAL_PORT=587
   ETHEREAL_USER=your_copied_username@ethereal.email
   ETHEREAL_PASSWORD=your_copied_password
   ```

### Viewing Dispatched Emails:
When an email is sent, the backend logs the preview link, and the frontend **Sent Table** displays a direct link:
`https://ethereal.email/message/<message-id>`

---

## How to Run Backend

### Step 1: Start PostgreSQL and Redis

Using Docker Compose:
```bash
# From root directory:
docker compose up -d postgres redis
```

*(Alternatively, use hosted instances like Supabase for PostgreSQL and Upstash for Redis).*

### Step 2: Install Dependencies

```bash
cd backend
npm install
```

### Step 3: Run Database Migrations & Generate Prisma Client

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations to database
npx prisma migrate deploy
```

### Step 4: Start the Backend Server

```bash
# Development mode (with live reload via tsx):
npm run dev

# Or Production mode (compiled JavaScript):
npm run build
npm start
```

The backend starts:
- **Express API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`
- **Bull Board Dashboard**: `http://localhost:5000/admin/queues`
- **BullMQ Worker**: Automatically starts inside the server process when `RUN_WORKER=true`.

*(Optional: To run the BullMQ worker as a separate standalone process, set `RUN_WORKER=false` and run `npm run start:worker`).*

---

## How to Run Frontend

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Verify `frontend/.env`

Ensure `frontend/.env` contains:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Start Vite Dev Server

```bash
npm run dev
```

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

The local Vite server includes a built-in reverse proxy in `vite.config.ts` to seamlessly forward `/api` requests to your backend without CORS friction.

---

## Running the Full Stack Together

From the root of the repository, a single npm script runs both the Express backend and the Vite frontend concurrently:

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Start PostgreSQL, Redis, Elasticsearch
docker compose up -d

# 3. Generate Prisma client & apply migrations
npm run prisma:deploy

# 4. Start both Backend & Frontend in parallel
npm run dev
```

---

## API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth callback handler |
| `GET` | `/api/auth/me` | Protected | Returns current authenticated user profile |
| `POST` | `/api/auth/logout` | Protected | Destroys session and clears cookie |
| `POST` | `/api/auth/test-session` | Dev/Test | Creates test session for automated test suites |

### Email Scheduler (`/api/emails`)
| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Protected | Schedule single delayed email |
| `POST` | `/api/emails/batch-schedule` | Protected | Batch schedule leads via CSV/text upload with deduplication |
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

### Monitoring
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Live system health check (PostgreSQL, Redis, BullMQ, Elasticsearch) |
| `GET` | `/admin/queues` | Visual Bull Board queue dashboard |

---

## Automated Verification Tests

Execute the comprehensive test suites from the root directory:

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

## License

MIT © 2026 ReachInbox Scheduler Team
