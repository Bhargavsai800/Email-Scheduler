import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  enableOfflineQueue: false, // Prevents queuing commands when disconnected
  lazyConnect: true,
  connectTimeout: 1000,
  retryStrategy(times) {
    if (times > 2) {
      return null; // Stop retrying when Redis is offline to prevent error loops
    }
    return Math.min(times * 300, 1000);
  },
};

// Shared Redis client instance for general caching / connection checking
export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  logger.info(`Connected to Redis at ${config.redis.host}:${config.redis.port}`);
});

redisClient.on('error', (err) => {
  logger.warn(`Redis connection notice: ${err.message}`);
});

export interface RedisHealthCheck {
  status: 'healthy' | 'unreachable';
  latencyMs?: number;
  error?: string;
}

export async function checkRedisHealth(): Promise<RedisHealthCheck> {
  const start = Date.now();
  try {
    if (redisClient.status !== 'ready') {
      const connectPromise =
        redisClient.status === 'close' || redisClient.status === 'end'
          ? redisClient.connect().catch(() => {})
          : Promise.resolve();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timed out (1000ms)')), 1000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
    }

    const pingPromise = redisClient.ping();
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timed out (1000ms)')), 1000)
    );

    const pong = await Promise.race([pingPromise, timeoutPromise]);
    if (pong === 'PONG') {
      const latencyMs = Date.now() - start;
      return {
        status: 'healthy',
        latencyMs,
      };
    }
    return {
      status: 'unreachable',
      error: `Unexpected ping response: ${pong}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown Redis error';
    return {
      status: 'unreachable',
      error: errorMsg,
    };
  }
}
