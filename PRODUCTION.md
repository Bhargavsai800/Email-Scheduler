# ReachInbox Email Job Scheduler — Production Endpoints & Deployment

This document records the production service endpoints, ports, and monitoring interfaces for the ReachInbox Full-stack Email Job Scheduler deployment.

---

## Service Endpoints

### 1. Frontend Web Dashboard
- **URL**: `http://localhost:5173` (Development) / `http://localhost:80` (Docker Compose Production) / `https://app.reachinbox.ai` (Domain Deployment)
- **Description**: Responsive React SPA interface for managing email scheduling, batch CSV ingestion, real-time search, and Slack integrations.

### 2. Backend REST API
- **URL**: `http://localhost:5000` (Development) / `https://api.reachinbox.ai` (Domain Deployment)
- **Description**: Express.js REST API providing authentication, batch scheduling, rate-limit status, and health telemetry.

### 3. Health Check Endpoint
- **URL**: `http://localhost:5000/api/health`
- **Description**: Real-time health monitoring endpoint inspecting connectivity for PostgreSQL, Redis, BullMQ, and Elasticsearch without exposing credentials or internal IP topologies.

### 4. Bull Board Queue Monitoring Dashboard
- **URL**: `http://localhost:5000/admin/queues`
- **Access Policy**: **PROTECTED / AUTHENTICATED**
- **Description**: Live visual dashboard for inspecting delayed, active, completed, and failed BullMQ jobs. In production mode, access requires active user session authentication or an `ADMIN_SECRET` Bearer token.

### 5. Source Code Repository
- **Repository**: `https://github.com/YOUR_GITHUB_USERNAME/reachinbox-email-scheduler.git`
- **Default Branch**: `main` (or `master`)

---

## Production Security Notes
- **Zero Secrets Committed**: All environment configurations rely on `.env.example` templates; secrets are injected via cloud secret managers or Docker environment files.
- **Reverse Proxy Protection**: Express server operates with `app.set('trust proxy', 1)` to support secure HTTPS cookies behind Nginx, AWS ALB, Cloudflare, or Traefik.
- **Safe CORS**: Strictly locked to the configured `FRONTEND_URL` with `credentials: true`.
