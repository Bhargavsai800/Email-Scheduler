import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/db';
import { redisClient } from './config/redis';
import { emailQueue } from './queues/email.queue';
import { startEmailWorker, stopEmailWorker } from './queues/email.worker';
import { recoverPendingScheduledEmails } from './queues/email.recovery';

logger.info(`=======================================================`);
logger.info(` ReachInbox BullMQ Email Worker - Persistent Service`);
logger.info(` Environment:          ${config.nodeEnv}`);
logger.info(` Concurrency:          ${config.workerConcurrency}`);
logger.info(` Min Email Delay:      ${config.minEmailDelayMs}ms`);
logger.info(` Max Rate Limit:       ${config.maxEmailsPerHour} emails/hr`);
logger.info(` Queue:                ${config.emailQueueName}`);
logger.info(` Redis Host:           ${config.redis.host}:${config.redis.port}`);
logger.info(`=======================================================`);

// Start worker service
async function bootstrapWorker() {
  try {
    // 1. Recover any pending or orphaned scheduled jobs from PostgreSQL
    logger.info('[Worker Service] Running startup recovery check...');
    await recoverPendingScheduledEmails();

    // 2. Start persistent BullMQ worker loop
    const worker = startEmailWorker();
    logger.info(`[Worker Service] Worker started successfully. Listening for jobs...`);

    return worker;
  } catch (err) {
    logger.error('[Worker Service] Error initializing worker service:', err);
    process.exit(1);
  }
}

bootstrapWorker();

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`[Worker Service] Received ${signal}. Shutting down worker process gracefully...`);

  try {
    await stopEmailWorker();
    logger.info('[Worker Service] BullMQ email worker closed.');
  } catch (err) {
    logger.warn('[Worker Service] Notice closing BullMQ worker:', err);
  }

  try {
    await emailQueue.close();
    logger.info('[Worker Service] BullMQ queue closed.');
  } catch (err) {
    logger.warn('[Worker Service] Notice closing BullMQ queue:', err);
  }

  try {
    await redisClient.quit();
    logger.info('[Worker Service] Redis connection closed.');
  } catch (err) {
    logger.warn('[Worker Service] Notice closing Redis connection:', err);
  }

  try {
    await prisma.$disconnect();
    logger.info('[Worker Service] Prisma disconnected.');
  } catch (err) {
    logger.warn('[Worker Service] Notice disconnecting Prisma:', err);
  }

  logger.info('[Worker Service] Worker service stopped cleanly.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
