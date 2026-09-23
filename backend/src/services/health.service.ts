import os from 'os';
import { checkDatabaseHealth, DBHealthCheck } from '../config/db';
import { checkRedisHealth, RedisHealthCheck } from '../config/redis';
import { checkBullMQHealth } from '../queues/email.queue';
import { checkElasticsearchHealth, ElasticsearchHealthCheck } from '../config/elasticsearch';
import { config } from '../config/env';

export interface HealthCheckResponse {
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
    database: DBHealthCheck;
    redis: RedisHealthCheck;
    bullmq: {
      status: 'healthy' | 'unreachable';
      queueName: string;
      error?: string;
    };
    elasticsearch: ElasticsearchHealthCheck;
  };
}

export async function getSystemHealth(): Promise<HealthCheckResponse> {
  const [dbHealth, redisHealth, bullmqHealth, esHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkBullMQHealth(),
    checkElasticsearchHealth(),
  ]);

  const memUsage = process.memoryUsage();
  const isHealthy =
    dbHealth.status === 'healthy' &&
    redisHealth.status === 'healthy' &&
    bullmqHealth.status === 'healthy';

  return {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    },
    services: {
      database: dbHealth,
      redis: redisHealth,
      bullmq: {
        status: bullmqHealth.status,
        queueName: config.emailQueueName,
        error: bullmqHealth.error,
      },
      elasticsearch: esHealth,
    },
  };
}
