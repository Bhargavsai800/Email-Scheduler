import { Queue, Job } from 'bullmq';
import { bullmqConnection } from './queue.config';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailJobData {
  emailId: string;
}

// Initialize BullMQ Queue for email scheduling
export const emailQueue = new Queue<EmailJobData>(config.emailQueueName, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

emailQueue.on('error', (err) => {
  logger.warn(`BullMQ Queue [${config.emailQueueName}] notice: ${err.message}`);
});

/**
 * Adds a delayed email job to BullMQ using the email's database ID as the logical job ID.
 * The body is retrieved from PostgreSQL at runtime by the worker, keeping Redis payload minimal.
 */
export async function scheduleEmailJob(
  emailId: string,
  delayMs: number
): Promise<Job<EmailJobData>> {
  const safeDelay = Math.max(0, delayMs);
  logger.info(`Adding BullMQ delayed job for email ${emailId} with delay of ${safeDelay}ms`);

  return emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId: emailId, // Logical job identifier matching DB record (prevents duplicates)
      delay: safeDelay,
    }
  );
}

export async function checkBullMQHealth(): Promise<{ status: 'healthy' | 'unreachable'; error?: string }> {
  try {
    const isPausedPromise = emailQueue.isPaused();
    const timeoutPromise = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error('BullMQ connection timed out (1000ms)')), 1000)
    );

    await Promise.race([isPausedPromise, timeoutPromise]);
    return {
      status: 'healthy',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'BullMQ connection error';
    return {
      status: 'unreachable',
      error: errorMsg,
    };
  }
}
