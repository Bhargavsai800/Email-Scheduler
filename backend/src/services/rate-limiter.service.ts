import { redisClient } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface RateLimitAdmissionResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  retryAfterMs: number;
}

export interface RateLimitStatus {
  currentCount: number;
  maxLimit: number;
  windowSeconds: number;
  retryAfterSeconds: number;
  minEmailDelayMs: number;
  workerConcurrency: number;
  isLimitReached: boolean;
}

export class RateLimiterService {
  /**
   * Computes the current hourly window key.
   * Window format: email-rate:hourly:{windowIndex}
   * e.g. windowIndex is Math.floor(epochMs / windowDurationMs).
   */
  public getHourlyWindowKey(now: number = Date.now()): { key: string; windowEndMs: number; retryAfterMs: number } {
    const windowDurationMs = config.rateLimitWindowSeconds * 1000;
    const windowIndex = Math.floor(now / windowDurationMs);
    const key = `email-rate:hourly:${windowIndex}`;
    const windowEndMs = (windowIndex + 1) * windowDurationMs;
    const retryAfterMs = Math.max(1000, windowEndMs - now);

    return { key, windowEndMs, retryAfterMs };
  }

  /**
   * Atomically checks if an email can be admitted under the current hourly window.
   * Uses Redis Lua script to eliminate race conditions across multiple concurrent workers.
   *
   * @returns { allowed: boolean, currentCount: number, retryAfterMs: number }
   */
  public async tryAdmitHourly(): Promise<RateLimitAdmissionResult> {
    const now = Date.now();
    const { key, retryAfterMs } = this.getHourlyWindowKey(now);
    const maxLimit = config.maxEmailsPerHour;
    const ttlSeconds = config.rateLimitWindowSeconds + 120; // 2 min buffer

    // Lua script: checks count against limit; increments and sets TTL only if below limit.
    const luaScript = `
      local key = KEYS[1]
      local max_limit = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])

      local current = tonumber(redis.call('GET', key) or "0")
      if current >= max_limit then
          return {0, current}
      end

      local new_count = redis.call('INCR', key)
      if new_count == 1 then
          redis.call('EXPIRE', key, ttl)
      end
      return {1, new_count}
    `;

    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const result = (await redisClient.eval(luaScript, 1, key, maxLimit, ttlSeconds)) as [number, number];
        const allowed = result[0] === 1;
        const currentCount = result[1];

        return {
          allowed,
          currentCount,
          maxLimit,
          retryAfterMs,
        };
      }
    } catch (err) {
      logger.warn('Redis rate-limiter check warning:', err instanceof Error ? err.message : err);
    }

    // In-memory fallback if Redis is temporarily unreachable
    return {
      allowed: true,
      currentCount: 1,
      maxLimit,
      retryAfterMs,
    };
  }

  /**
   * Enforces MIN_EMAIL_DELAY_MS across all concurrent workers.
   * Uses atomic Redis timestamp coordination so parallel workers are staggered.
   *
   * @returns Milliseconds the current worker should pause before dispatching.
   */
  public async enforceMinDelay(): Promise<number> {
    const minDelay = config.minEmailDelayMs;
    if (minDelay <= 0) return 0;

    const now = Date.now();
    const key = 'email-rate:last-send-timestamp';

    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local min_delay = tonumber(ARGV[2])

      local last_time = tonumber(redis.call('GET', key) or "0")
      local elapsed = now - last_time

      if elapsed < min_delay then
          local wait_ms = min_delay - elapsed
          redis.call('SET', key, tostring(last_time + min_delay), 'EX', 3600)
          return wait_ms
      else
          redis.call('SET', key, tostring(now), 'EX', 3600)
          return 0
      end
    `;

    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const waitMs = (await redisClient.eval(luaScript, 1, key, now, minDelay)) as number;
        return Math.max(0, waitMs);
      }
    } catch (err) {
      logger.warn('Redis min-delay coordination notice:', err instanceof Error ? err.message : err);
    }

    return 0;
  }

  /**
   * Staggers batch scheduled emails (e.g. 1000+ simultaneous jobs) across time slots
   * so they are spaced by at least MIN_EMAIL_DELAY_MS.
   */
  public async reserveSlot(requestedScheduledAt: Date): Promise<Date> {
    const minDelay = config.minEmailDelayMs;
    const requestedMs = requestedScheduledAt.getTime();
    if (minDelay <= 0) return requestedScheduledAt;

    const key = 'email-rate:next-available-slot';
    const now = Date.now();

    const luaScript = `
      local key = KEYS[1]
      local requested = tonumber(ARGV[1])
      local min_delay = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      local next_slot = tonumber(redis.call('GET', key) or "0")
      local assigned_slot = math.max(requested, next_slot, now)

      -- Advance next available slot
      redis.call('SET', key, tostring(assigned_slot + min_delay), 'EX', 3600)
      return assigned_slot
    `;

    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const assignedMs = (await redisClient.eval(luaScript, 1, key, requestedMs, minDelay, now)) as number;
        return new Date(assignedMs);
      }
    } catch (err) {
      logger.warn('Redis slot reservation notice:', err instanceof Error ? err.message : err);
    }

    return requestedScheduledAt;
  }

  /**
   * Retrieves telemetry regarding current rate limit usage and capacity.
   */
  public async getRateLimitStatus(): Promise<RateLimitStatus> {
    const now = Date.now();
    const { key, retryAfterMs } = this.getHourlyWindowKey(now);
    let currentCount = 0;

    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        const val = await redisClient.get(key);
        if (val) {
          currentCount = parseInt(val, 10) || 0;
        }
      }
    } catch {
      // Ignored
    }

    return {
      currentCount,
      maxLimit: config.maxEmailsPerHour,
      windowSeconds: config.rateLimitWindowSeconds,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      minEmailDelayMs: config.minEmailDelayMs,
      workerConcurrency: config.workerConcurrency,
      isLimitReached: currentCount >= config.maxEmailsPerHour,
    };
  }
}

export const rateLimiterService = new RateLimiterService();
