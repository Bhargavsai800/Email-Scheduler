import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redisClient } from './redis';
import { config } from './env';
import { logger } from '../utils/logger';

/**
 * Resilient Session Store that delegates to Redis when connected,
 * and transparently falls back to MemoryStore when Redis is offline
 * during local development, testing, or temporary outages.
 */
class ResilientSessionStore extends session.Store {
  private redisStore: RedisStore;
  private memoryStore: session.MemoryStore;

  constructor() {
    super();
    this.redisStore = new RedisStore({
      client: redisClient as any,
      prefix: 'sess:',
    });
    this.memoryStore = new session.MemoryStore();
  }

  private isRedisReady(): boolean {
    return redisClient.status === 'ready';
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    if (this.isRedisReady()) {
      this.redisStore.get(sid, (err, data) => {
        if (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Redis session get error, using memory fallback: ${msg}`);
          return this.memoryStore.get(sid, callback);
        }
        callback(null, data);
      });
    } else {
      this.memoryStore.get(sid, callback);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    if (this.isRedisReady()) {
      this.redisStore.set(sid, sess, (err) => {
        if (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Redis session set error, using memory fallback: ${msg}`);
          return this.memoryStore.set(sid, sess, callback);
        }
        if (callback) callback();
      });
    } else {
      this.memoryStore.set(sid, sess, callback);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.memoryStore.destroy(sid, () => {});
    if (this.isRedisReady()) {
      this.redisStore.destroy(sid, (err) => {
        if (callback) callback(err);
      });
    } else {
      if (callback) callback();
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: () => void): void {
    if (this.isRedisReady() && typeof this.redisStore.touch === 'function') {
      this.redisStore.touch(sid, sess, callback);
    } else if (typeof this.memoryStore.touch === 'function') {
      this.memoryStore.touch(sid, sess, callback);
    } else if (callback) {
      callback();
    }
  }
}

export function createSessionMiddleware(): any {
  return session({
    store: new ResilientSessionStore(),
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });
}
