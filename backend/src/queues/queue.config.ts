import { ConnectionOptions } from 'bullmq';
import { config } from '../config/env';

export const bullmqConnection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectTimeout: 1000,
  retryStrategy(times) {
    if (times > 2) return null; // Avoid persistent retries if Redis is offline
    return Math.min(times * 300, 1000);
  },
};
