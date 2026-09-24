# ReachInbox Email Job Scheduler — Final Release Checklist

This document serves as the formal release candidate checklist for the ReachInbox Full-stack Email Job Scheduler hiring assignment submission.

---

## 1. Application Infrastructure

- [x] **Frontend working**: React 18 + Vite SPA built to `dist/`, served via Nginx or Vite dev server with zero runtime console errors.
- [x] **Backend working**: Express.js 4.21 with TypeScript 5.7, Helmet security headers, structured JSON logging, and centralized error handling.
- [x] **Worker working**: Standalone persistent BullMQ worker entrypoint (`backend/src/worker.ts`), independent from HTTP lifecycle.
- [x] **Database working**: PostgreSQL 16 schema managed via Prisma ORM 6.4 with verified migrations, foreign keys, and indexes.
- [x] **Redis working**: Redis 7 with AOF persistence, backing BullMQ delayed queues, sliding-window rate limiting, and session store.
- [x] **Elasticsearch working**: Elasticsearch 8 client initialized with typed mapping schema and resilient PostgreSQL query fallback.
- [x] **BullMQ working**: Pure event-driven delayed queue (`jobId: email.id`), deterministic delay calculations, and zero cron/polling.
- [x] **Ethereal working**: Nodemailer transport sending real emails to Ethereal SMTP with instant message preview URLs.

---

## 2. Authentication & Multi-Tenancy

- [x] **Google OAuth**: Passport.js Google Strategy configured with OAuth callback flow, profile parsing, and automated account linking.
- [x] **Session**: HTTP-only, SameSite lax session cookies (`connect.sid`) stored in Redis with resilient memory store fallback.
- [x] **Logout**: Dedicated `POST /api/auth/logout` endpoint that destroys server session and clears client cookie.
- [x] **User isolation**: Strict multi-tenant data scoping across database queries, search indexing, and Slack connection storage.

---

## 3. Email Scheduling & Orchestration

- [x] **Scheduling**: `POST /api/emails/schedule` and `POST /api/emails/batch-schedule` with strict Zod validation.
- [x] **Delayed jobs**: BullMQ delayed queue computes accurate millisecond delays targeting scheduled timestamps without polling.
- [x] **Worker**: Concurrent execution pool (`WORKER_CONCURRENCY=5`) pulling jobs from Redis sorted sets.
- [x] **Minimum delay**: Atomic Redis timestamp coordination enforces `>= 2000ms` spacing between consecutive email dispatches.
- [x] **Hourly limit**: Distributed 100 emails/hour sliding window managed via an atomic Redis Lua script.
- [x] **Rescheduling**: Emails exceeding the hourly quota are safely rescheduled forward to the next hourly window (never dropped or marked failed).
- [x] **Idempotency**: Atomic state transition (`SCHEDULED` -> `PROCESSING` -> `SENT`) prevents duplicate dispatches on retries or restarts.

---

## 4. Search Engine

- [x] **Elasticsearch indexing**: Dual-sync lifecycle updates documents upon scheduling, status changes (`PROCESSING`, `SENT`, `FAILED`), and rescheduling.
- [x] **Search**: Full-text Query DSL querying `recipient`, `subject` (2x boost), and `body`.
- [x] **Filters**: Structured exact keyword filters for `status` and `recipient`, plus date range filtering.
- [x] **Pagination**: Page and limit parameters supported with total hit count tracking.

---

## 5. Slack Integration

- [x] **OAuth**: Slack OAuth 2.0 flow requesting `incoming-webhook`, `chat:write`, and `channels:read` scopes.
- [x] **Connection**: SlackConnection stored per user in PostgreSQL, linking team ID and webhook URL.
- [x] **Notification**: Block Kit rich formatted message triggered when hourly rate limit is reached.
- [x] **Deduplication**: Redis lock key (`slack:ratelimit-alert:{userId}:{windowIndex}`) limits notifications to at most 1 alert per hour.

---

## 6. Frontend Dashboard & UX

- [x] **Dashboard**: Live telemetry meters, worker status indicators, and summary metrics.
- [x] **Compose**: Single email modal with date/time pickers and real-time validation.
- [x] **CSV upload**: Lead list ingestion supporting `.csv`, `.txt`, and raw pasted text with instant normalization and deduplication.
- [x] **Scheduled**: Scheduled emails table with time remaining badges and cancellation/inspection details.
- [x] **Sent**: Sent history table showing delivery timestamps, recipient addresses, and Ethereal preview links.
- [x] **Search**: Dedicated search tab with live debounce, status chips, and Elasticsearch result badges.
- [x] **Responsive UI**: Tailwind CSS layouts verified on desktop (1440px), tablet (768px), and mobile (390px).

---

## 7. Security & Secrets Protection

- [x] **No secrets committed**: Git history audited; zero API keys, secrets, or `.env` files tracked.
- [x] **HTTPS**: `trust proxy: 1` enabled for reverse proxy SSL termination (Nginx, ALB, Cloudflare).
- [x] **Secure cookies**: Cookies use `httpOnly`, `sameSite: lax`, and `secure` in production.
- [x] **CORS**: Explicit origin whitelisting with `credentials: true`.
- [x] **OAuth configuration**: OAuth redirect URIs and client secrets managed exclusively via environment variables.
- [x] **User isolation**: Cross-user email access rejected with `404 Not Found` without leaking existence.

---

## 8. Submission Artifacts

- [x] **README**: Comprehensive documentation with architecture diagrams, setup guides, and API specifications.
- [x] **Demo guide**: Detailed 5-minute timed demonstration script in `DEMO.md`.
- [x] **GitHub repository**: Clean Git history on `master` branch with conventional commit messages.
- [x] **Reviewer access**: Prepared for collaborators `Mitrajit` and `Yadav036`.
- [x] **Production URL**: Documented in `PRODUCTION.md`.
- [x] **Final testing**: 98/98 automated checks verified passing across all verification suites.
