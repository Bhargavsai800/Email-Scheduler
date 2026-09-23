# ========================================================
# ReachInbox Email Scheduler - Backend Dockerfile
# Multi-stage production build for API & Persistent Worker
# ========================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies for TypeScript compilation
RUN npm ci

# Copy source code and TypeScript configuration
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client and compile TypeScript to dist/
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL required by Prisma query engine
RUN apk add --no-cache openssl curl

# Copy package descriptors and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Generate Prisma Client for the production node_modules
RUN npx prisma generate

# Copy compiled JavaScript output from builder
COPY --from=builder /app/dist ./dist

# Security: run as unprivileged node user
USER node

# Expose backend API port
EXPOSE 5000

# Default command starts the Web API service.
# For persistent BullMQ worker service, override with: ["node", "dist/worker.js"]
CMD ["node", "dist/server.js"]
