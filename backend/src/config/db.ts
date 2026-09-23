import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// PrismaClient singleton instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export interface DBHealthCheck {
  status: 'healthy' | 'unreachable';
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DBHealthCheck> {
  const start = Date.now();
  try {
    const queryPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out (1500ms)')), 1500)
    );

    await Promise.race([queryPromise, timeoutPromise]);
    const latencyMs = Date.now() - start;
    return {
      status: 'healthy',
      latencyMs,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown database error';
    logger.warn('Database health check notice:', errorMsg);
    return {
      status: 'unreachable',
      error: errorMsg,
    };
  }
}
