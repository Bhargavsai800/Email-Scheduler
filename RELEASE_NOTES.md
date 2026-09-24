# Release Notes — ReachInbox Email Job Scheduler

## Release: ReachInbox Hiring Assignment — Final Release Candidate (v1.0.0)
**Release Date**: September 2026  
**Auditor Approval**: Verified (Stage 13 Audit: **GO**)

---

## 1. Overview
The ReachInbox Full-stack Email Job Scheduler is a distributed, horizontally scalable, persistent email scheduling and delivery system designed to handle single and bulk lead outreach without using cron jobs or interval polling schedulers.

---

## 2. Implemented Capabilities

### A. Core Engine & Scheduling
- **Pure BullMQ Delayed Scheduling**: Pure event-driven delayed scheduling backed by Redis sorted sets (`bull:email-scheduling-queue:delayed`). Jobs execute at the precise millisecond target.
- **Zero Cron / Polling Architecture**: Completely eliminates cron jobs, `node-cron`, `agenda`, and database polling loops.
- **Decoupled Persistent Worker Service**: Independent worker process entrypoint (`backend/src/worker.ts` / `npm run start:worker`) with graceful `SIGTERM`/`SIGINT` lifecycle handling.
- **Restart & Crash Persistence**: Startup recovery routine (`recoverPendingScheduledEmails`) synchronizes pending PostgreSQL records with Redis and safely un-orphans interrupted dispatches without data loss or duplication.
- **Atomic Idempotency**: Atomic state machine transitions (`SCHEDULED` -> `PROCESSING` -> `SENT`) prevent duplicate dispatches under concurrent workers, retries, or server restarts.

### B. Distributed Rate Limiting & Pacing
- **Sliding-Window Rate Limiting**: Distributed 100 emails/hour limit across all concurrent workers enforced via an atomic Redis Lua script.
- **Automatic Quota Rescheduling**: Exceeded emails are postponed forward to the start of the next hourly window without dropping or failing jobs.
- **Minimum Delay Pacing**: Atomic Redis timestamp coordination ensures a configurable minimum delay (`>= 2000ms`) between consecutive dispatches across all parallel workers.
- **Worker Concurrency**: Configurable execution concurrency (`WORKER_CONCURRENCY=5`).

### C. Search & Integrations
- **Elasticsearch 8 Search**: Full-text Query DSL search across email recipients, subjects, and message bodies with a 2x relevance boost on subjects.
- **Resilient Fallback**: Automatic, zero-downtime fallback to PostgreSQL search if Elasticsearch is temporarily offline or degraded.
- **Ethereal SMTP Delivery**: Real Nodemailer SMTP transport delivering actual emails with live Ethereal preview URLs.
- **Google OAuth 2.0**: Secure authentication with Redis-backed sessions, HTTP-only SameSite cookies, profile updating, and account linking.
- **Slack OAuth & Real-time Alerts**: Connects to user's Slack workspace and channel; dispatches rich Block Kit notifications on quota exhaustion with a 1-hour Redis deduplication window.

### D. Frontend & Bulk Lead Ingestion
- **Batch CSV & Text Ingestion**: Lead upload supporting `.csv`, `.txt`, and raw text pasting with real-time format validation, normalization, and deduplication.
- **Modern Responsive Dashboard**: Built with React 18, Vite 6, and Tailwind CSS. Features live queue meters, scheduled/sent email tables, and search views.
- **Bull Board Monitor**: Mounted at `/admin/queues` for inspecting delayed, active, and completed jobs.

---

## 3. Automated Verification Suites
All 7 verification suites passed with 100% success (98/98 tests):
- `npm run verify:stage1`: Infrastructure & Health Connectivity
- `npm run verify:stage3`: Core Email Scheduler & Live Ethereal SMTP Delivery (9/9)
- `npm run verify:stage4`: Concurrency, Delay Pacing & Distributed Rate Limiting (14/14)
- `npm run verify:stage5`: Elasticsearch 8 Search & PostgreSQL Fallback (10/10)
- `npm run verify:stage6`: Google OAuth, Sessions & Strict User Isolation (23/23)
- `npm run verify:stage7`: Slack OAuth & Block Kit Rate-Limit Alerts (14/14)
- `npm run verify:stage9`: Comprehensive Integration, Deduplication, QA & Restart Recovery (28/28)

---

## 4. Known Architectural Considerations
- **Ethereal SMTP**: Ethereal is an ephemeral test mailbox service designed for testing. In production with real mailboxes (e.g. AWS SES or SendGrid), replace SMTP credentials in `.env`.
- **Database Search Fallback**: When Elasticsearch is offline, search queries fall back to PostgreSQL `ILIKE`, which guarantees continuous availability but does not provide Elasticsearch's relevance scoring or typo tolerance.
- **Bull Board Security**: In production mode (`NODE_ENV=production`), Bull Board requires active user authentication or an `ADMIN_SECRET` Bearer token.
