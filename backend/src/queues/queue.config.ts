import { ConnectionOptions } from 'bullmq';
import { config } from '../config/env';

export const bullmqConnection: ConnectionOptions = {
  ...(config.redis.url
    ? {
        url: config.redis.url,
        ...(config.redis.url.startsWith('rediss://') ? { tls: {} } : {}),
      }
    : {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
      }),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  retryStrategy(times) {
    if (times > 5) return null; // Avoid persistent retries if Redis is offline
    return Math.min(times * 300, 1000);
  },
};
