# ========================================================
# ReachInbox Email Scheduler - Frontend Dockerfile
# Multi-stage production build with Vite & Nginx
# ========================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API base URL at build time
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build config
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./
COPY src ./src/

# Compile production bundle
RUN npm run build

# Stage 2: Production Nginx serving stage
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
