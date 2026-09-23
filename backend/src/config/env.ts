import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
  };
  runWorker: boolean;
  adminSecret: string;
  emailQueueName: string;
  elasticsearchNode: string;
  ethereal: {
    host: string;
    port: number;
    user?: string;
    password?: string;
    fromEmail: string;
  };
  // Stage 4: Concurrency & Rate Limiting
  workerConcurrency: number;
  minEmailDelayMs: number;
  maxEmailsPerHour: number;
  rateLimitWindowSeconds: number;
  // Stage 5: Elasticsearch Indexing & Search
  elasticsearch: {
    url: string;
    index: string;
    username?: string;
    password?: string;
  };
  // Stage 6: Google OAuth & Sessions
  auth: {
    googleClientId: string;
    googleClientSecret: string;
    googleCallbackUrl: string;
    frontendUrl: string;
    sessionSecret: string;
  };
  // Stage 7: Slack OAuth & Rate-Limit Notifications
  slack: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

function parseNumber(envVal: string | undefined, defaultVal: number): number {
  if (envVal === undefined || envVal.trim() === '') return defaultVal;
  const parsed = Number(envVal);
  if (isNaN(parsed)) return defaultVal;
  return parsed;
}

export function validateConfig(cfg: AppConfig): void {
  if (cfg.workerConcurrency <= 0) {
    throw new Error(`Invalid WORKER_CONCURRENCY: ${cfg.workerConcurrency}. Must be greater than 0.`);
  }
  if (cfg.minEmailDelayMs < 0) {
    throw new Error(`Invalid MIN_EMAIL_DELAY_MS: ${cfg.minEmailDelayMs}. Must be greater than or equal to 0.`);
  }
  if (cfg.maxEmailsPerHour <= 0) {
    throw new Error(`Invalid MAX_EMAILS_PER_HOUR: ${cfg.maxEmailsPerHour}. Must be greater than 0.`);
  }
  if (cfg.rateLimitWindowSeconds <= 0) {
    throw new Error(`Invalid RATE_LIMIT_WINDOW_SECONDS: ${cfg.rateLimitWindowSeconds}. Must be greater than 0.`);
  }
}

const esUrl =
  process.env.ELASTICSEARCH_URL ||
  process.env.ELASTICSEARCH_NODE ||
  'http://localhost:9200';

let redisHost = process.env.REDIS_HOST || 'localhost';
let redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
let redisPassword = process.env.REDIS_PASSWORD || undefined;

if (process.env.REDIS_URL) {
  try {
    const parsed = new URL(process.env.REDIS_URL);
    if (parsed.hostname) redisHost = parsed.hostname;
    if (parsed.port) redisPort = parseInt(parsed.port, 10);
    if (parsed.password) redisPassword = decodeURIComponent(parsed.password);
  } catch {
    // If not a standard URL, fallback to REDIS_HOST/REDIS_PORT
  }
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://reachinbox:reachinbox_secret@localhost:5432/reachinbox_scheduler?schema=public',
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: redisHost,
    port: redisPort,
    password: redisPassword,
  },
  runWorker: process.env.RUN_WORKER !== 'false',
  adminSecret: process.env.ADMIN_SECRET || '',
  emailQueueName: process.env.EMAIL_QUEUE_NAME || 'email-scheduling-queue',
  elasticsearchNode: esUrl,
  ethereal: {
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
    user: process.env.ETHEREAL_USER || undefined,
    password: process.env.ETHEREAL_PASSWORD || undefined,
    fromEmail: process.env.ETHEREAL_FROM_EMAIL || 'ReachInbox Scheduler <scheduler@reachinbox.ai>',
  },
  workerConcurrency: parseNumber(process.env.WORKER_CONCURRENCY, 5),
  minEmailDelayMs: parseNumber(process.env.MIN_EMAIL_DELAY_MS, 2000),
  maxEmailsPerHour: parseNumber(process.env.MAX_EMAILS_PER_HOUR, 100),
  rateLimitWindowSeconds: parseNumber(process.env.RATE_LIMIT_WINDOW_SECONDS, 3600),
  elasticsearch: {
    url: esUrl,
    index: process.env.ELASTICSEARCH_INDEX || 'emails',
    username: process.env.ELASTICSEARCH_USERNAME || undefined,
    password: process.env.ELASTICSEARCH_PASSWORD || undefined,
  },
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl:
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    sessionSecret:
      process.env.SESSION_SECRET || 'reachinbox-dev-session-secret-change-in-production-at-least-32-chars',
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri:
      process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/auth/slack/callback',
  },
};

// Validate configuration on module evaluation
validateConfig(config);
