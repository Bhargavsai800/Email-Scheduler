import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/db';
import { redisClient } from './config/redis';
import { emailQueue } from './queues/email.queue';
import { startEmailWorker, stopEmailWorker } from './queues/email.worker';
import { recoverPendingScheduledEmails } from './queues/email.recovery';

const app = createApp();
const PORT = config.port;

const server = app.listen(PORT, async () => {
  logger.info(`=======================================================`);
  logger.info(` ReachInbox Email Job Scheduler - Backend Service`);
  logger.info(` Environment: ${config.nodeEnv}`);
  logger.info(` Server listening at: http://localhost:${PORT}`);
  logger.info(` Health endpoint:    http://localhost:${PORT}/api/health`);
  logger.info(` Emails endpoint:    http://localhost:${PORT}/api/emails/schedule`);
  logger.info(` Bull Board UI:      http://localhost:${PORT}/admin/queues`);
  logger.info(`=======================================================`);

  if (config.runWorker) {
    // Start BullMQ background worker for processing scheduled email jobs
    startEmailWorker();

    // Run startup recovery to re-enqueue any pending scheduled jobs from PostgreSQL
    await recoverPendingScheduledEmails();
  } else {
    logger.info('[API Mode] RUN_WORKER=false. Persistent worker runs as an independent service.');
  }
});

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    if (config.runWorker) {
      try {
        await stopEmailWorker();
      } catch (err) {
        logger.warn('Error closing BullMQ worker:', err);
      }
    }

    try {
      await emailQueue.close();
      logger.info('BullMQ queue closed.');
    } catch (err) {
      logger.warn('Error closing BullMQ queue:', err);
    }

    try {
      await redisClient.quit();
      logger.info('Redis connection closed.');
    } catch (err) {
      logger.warn('Error closing Redis connection:', err);
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
    } catch (err) {
      logger.warn('Error disconnecting Prisma:', err);
    }

    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
