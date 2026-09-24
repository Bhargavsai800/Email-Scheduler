# ReachInbox Email Job Scheduler — 5-Minute Live Demo Script & Guide

This document provides a minute-by-minute demonstration script for presenting the **ReachInbox Full-stack Email Job Scheduler** hiring assignment to evaluators and stakeholders.

---

## Demo Overview & Timeline

| Timestamp | Phase | Topic / Feature Demonstrated | Key Technical Highlights |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | **1. Architecture & Foundation** | System Topology & Design Principles | Pure BullMQ delayed queue, zero cron/polling schedulers, decoupled persistent worker |
| **0:45 - 1:45** | **2. Authentication & Isolation** | Google OAuth & User Session Isolation | Secure session cookies, account linking, strict per-user data scoping |
| **1:45 - 2:45** | **3. Batch Scheduling & Bull Board** | CSV/Text Lead Upload & Delay Pacing | Real-time lead deduplication, >=2000ms delay spacing, live Bull Board queue inspection |
| **2:45 - 3:45** | **4. Rate Limiting & Slack Alerting** | 100/hr Sliding Window & Webhooks | Redis Lua sliding window, auto-rescheduling (never dropped), Slack Block Kit alert (1/hr dedup) |
| **3:45 - 4:30** | **5. Elasticsearch 8 Full-Text Search** | Dual-Sync Query DSL & DB Fallback | 2x subject boost, real-time lifecycle indexing, zero-crash database fallback |
| **4:30 - 5:00** | **6. Crash Recovery & Wrap-up** | Zero Lost Jobs & Graceful Shutdown | Startup recovery re-enqueues pending PostgreSQL jobs, un-orphans interrupted jobs |

---

## Detailed Minute-by-Minute Script

### Minute 0:00 – 0:45: System Architecture & Design Principles

#### Visual Setup
- Open browser tab 1: Dashboard (`http://localhost:5173` or deployed URL).
- Open terminal / slides: System Architecture Diagram (found in [`README.md`](README.md#architecture-overview)).

#### Presenter Speaking Script
> *"Welcome! Today I am presenting the ReachInbox Full-stack Email Job Scheduler.*
>
> *The core technical requirement of this assignment is to schedule and deliver emails reliably with distributed rate limiting without using cron jobs or periodic database polling.*
>
> *Our architecture solves this through an event-driven delayed job queue built on BullMQ and Redis 7 with AOF persistence. The system is physically split into a stateless Express REST API and a standalone persistent BullMQ Worker process with concurrency pacing.*
>
> *PostgreSQL serves as our immutable system of record, Elasticsearch 8 powers full-text search with automatic PostgreSQL fallback, and Ethereal SMTP provides real-time email delivery with instant preview URLs."*

---

### Minute 0:45 – 1:45: Google OAuth & Strict User Data Isolation

#### Visual Setup
- Navigate to the Login screen on the dashboard (`http://localhost:5173`).
- Show Google Sign-In button and authenticated session.

#### Actions to Perform
1. Click **Sign in with Google** (or enter test session in dev mode).
2. Point out the active user profile header (Name, Avatar, Email).
3. Open Developer Tools -> Application -> Cookies to show `connect.sid` (HTTP-only, SameSite lax cookie).
4. Demonstrate strict data isolation: Show that scheduled/sent emails and search results belong exclusively to the authenticated user ID (`req.user.id`).

#### Presenter Speaking Script
> *"Security and multi-tenancy are enforced from the authentication layer down.*
>
> *We implement Google OAuth 2.0 via Passport.js backed by Redis session storage. Notice that sessions use HTTP-only, secure cookies with strict reverse-proxy trust.*
>
> *All database queries, Elasticsearch indices, and Slack connections are strictly scoped to the authenticated user ID. A user can never access or search another user's email records."*

---

### Minute 1:45 – 2:45: Single & Batch Lead Scheduling + Live Bull Board

#### Visual Setup
- Click the **Compose / Schedule Email** button on the dashboard.
- Open browser tab 2: Bull Board Queue Monitor at `http://localhost:5000/admin/queues`.

#### Actions to Perform
1. In the Compose Modal, select the **CSV / Batch Leads** tab.
2. Paste or upload a raw list with duplicate and malformed emails:
   ```text
   alex@company.com
   sarah.lee@startup.io
   alex@company.com
   invalid-email-address
   david@enterprise.org
   ```
3. Highlight the real-time UI counters:
   - **Total Raw Leads**: 5
   - **Unique Valid Leads**: 3 (duplicates removed, malformed filtered).
4. Set **Start Delay**: 1 minute, and **Minimum Delay Pacing**: 2,000ms.
5. Click **Schedule Batch Emails**.
6. Switch to Bull Board (`/admin/queues`):
   - Show the jobs appearing in the **Delayed** tab with deterministic `jobId: email.id`.
   - Show the delay timestamps staggered by exactly 2,000ms.

#### Presenter Speaking Script
> *"Now let's schedule a batch campaign. Cold outreach often deals with uncleaned lead lists.*
>
> *Our scheduler features real-time parsing, normalization, and deduplication. Notice how our input of 5 raw entries automatically normalized to 3 unique valid leads.*
>
> *When submitted, the API atomically creates the PostgreSQL records and enqueues BullMQ delayed jobs with staggered delay pacing—each spaced by at least 2,000ms.*
>
> *Over in Bull Board at `/admin/queues`, we can see these jobs live in Redis under the delayed state. No cron job or polling loop was executed—BullMQ's internal timer triggers execution precisely when the delay expires."*

---

### Minute 2:45 – 3:45: Distributed Hourly Rate Limiting & Slack Alerting

#### Visual Setup
- Dashboard: **Rate Limit Indicator** widget in Header / Sidebar.
- Browser tab 3: Slack Channel `#email-alerts` (or mock webhook receiver).

#### Actions to Perform
1. Show the hourly rate limit meter on the dashboard: `Max 100 emails/hour`.
2. Explain the worker's rate limit check:
   - Worker evaluates Redis sliding-window quota before dispatch.
   - If quota is exhausted, the job is **never dropped** or marked failed; it is cleanly rescheduled with delay: `retryAfterMs` to the next hourly window.
3. Show the Slack integration:
   - Open Slack Settings card.
   - Click **Send Test Slack Alert** to show live delivery.
   - Display the incoming Block Kit message in Slack:
     - Header: `⚠️ ReachInbox Hourly Rate Limit Reached`
     - Fields: User, Limit (100/hr), Window Reset Time.
   - Point out that Slack alerts are deduplicated to at most **1 alert per hour** in Redis to prevent webhook flooding.

#### Presenter Speaking Script
> *"A critical requirement of cold email delivery is avoiding ISP reputation penalties caused by burst volume.*
>
> *Our system enforces a distributed 100 emails/hour sliding window across all concurrent workers using an atomic Redis Lua script.*
>
> *If the hourly cap is reached, jobs are NEVER dropped or marked as failed. Instead, the worker pushes the BullMQ job delay forward to the start of the next hourly window.*
>
> *Simultaneously, the worker fires a webhook notification to the user's connected Slack channel formatted with rich Block Kit components. To protect the user's channel from notification spam, alerts are automatically deduplicated in Redis to at most one alert per hour."*

---

### Minute 3:45 – 4:30: Elasticsearch 8 Full-Text Search & Resilient Fallback

#### Visual Setup
- Navigate to the **Search Emails** tab on the React dashboard.

#### Actions to Perform
1. Enter search queries in the search bar:
   - Full-text subject query (e.g., `"Q4 Partnership"`).
   - Recipient keyword query (e.g., `"startup.io"`).
2. Point out:
   - Sub-15ms response latency.
   - Search results source badge: `Elasticsearch 8`.
   - 2x relevance boost on subject matches over email body.
3. Explain the Resilient Fallback:
   - If the Elasticsearch cluster is offline or undergoing maintenance, the backend automatically falls back to an indexed PostgreSQL `ILIKE` query without throwing a 500 error or degrading user experience.

#### Presenter Speaking Script
> *"For high-performance search across thousands of dispatched emails, we integrated Elasticsearch 8.*
>
> *Every email is synchronized dual-write on scheduling and status updates. Queries execute via Elasticsearch Query DSL with a 2x relevance boost on email subjects.*
>
> *Crucially, we designed the search service with enterprise graceful degradation: if Elasticsearch becomes temporarily unreachable, our backend automatically falls back to an optimized PostgreSQL query, ensuring zero downtime for the user."*

---

### Minute 4:30 – 5:00: Crash & Restart Recovery Guarantee + Wrap-up

#### Visual Setup
- Terminal showing worker logs and restart command.
- Sent Emails table showing live Ethereal SMTP preview links.

#### Actions to Perform
1. Click on a completed email row in the **Sent Emails** table.
2. Click the **Ethereal Preview URL** link:
   - Browser opens real Ethereal SMTP web preview (`https://ethereal.email/message/...`).
   - Shows rendered email headers, subject, and HTML body.
3. Explain the Zero Lost Jobs Guarantee:
   - On server or worker reboot, `recoverPendingScheduledEmails()` runs immediately.
   - It queries PostgreSQL for pending `SCHEDULED` emails and reconciles them with Redis BullMQ delayed jobs.
   - Any orphaned `PROCESSING` jobs from an ungraceful crash are safely reset to `SCHEDULED` and re-enqueued.
4. Conclude presentation.

#### Presenter Speaking Script
> *"Finally, let's look at email delivery and fault tolerance.*
>
> *Here is an email dispatched by our worker to Ethereal SMTP. Clicking the preview link opens the real Ethereal web interface verifying actual transmission.*
>
> *What happens if the server crashes while jobs are scheduled? Zero jobs are lost. On startup, our recovery routine audits all pending database records against Redis, recalculates the remaining delay, and re-enqueues any missing jobs while un-orphaning interrupted dispatches.*
>
> *To summarize: ReachInbox Full-stack Email Scheduler delivers an enterprise-grade, cron-free delayed scheduling engine with distributed rate limiting, real-time Slack alerting, Elasticsearch search, and resilient PostgreSQL persistence. Thank you!"*

---

## Evaluator Quick Reproduction Commands

Evaluators can verify the entire application locally using these terminal commands:

```bash
# 1. Start all infrastructure containers (PostgreSQL, Redis, Elasticsearch)
docker compose up -d

# 2. Run all comprehensive verification suites (98 automated checks)
npm test

# 3. Launch both backend API and frontend dashboard concurrently
npm run dev

# 4. Access URLs:
# - Frontend Dashboard:   http://localhost:5173
# - Backend API:          http://localhost:5000/api/health
# - Bull Board Monitor:   http://localhost:5000/admin/queues
```
