export interface HealthServiceCheck {
  status: 'healthy' | 'unreachable';
  latencyMs?: number;
  error?: string;
  queueName?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  system: {
    nodeVersion: string;
    platform: string;
    memoryUsageMB: number;
    freeMemoryMB: number;
    totalMemoryMB: number;
  };
  services: {
    database: HealthServiceCheck;
    redis: HealthServiceCheck;
    bullmq: HealthServiceCheck;
  };
}

export interface ServiceCardData {
  name: string;
  role: string;
  technology: string;
  status: 'healthy' | 'unreachable' | 'info' | 'pending';
  latencyMs?: number;
  details?: string;
  iconName: 'database' | 'redis' | 'queue' | 'server' | 'search';
}

export interface ScheduledEmail {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string;
  sentAt?: string | null;
  error?: string | null;
  previewUrl?: string | null;
  bullJobId?: string | null;
  createdAt: string;
}

export interface ScheduleEmailPayload {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface RateLimitTelemetry {
  currentCount: number;
  maxLimit: number;
  windowSeconds: number;
  retryAfterSeconds: number;
  minEmailDelayMs: number;
  workerConcurrency: number;
  isLimitReached: boolean;
}
