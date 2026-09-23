import { Worker, Job } from 'bullmq';
import { bullmqConnection } from './queue.config';
import { EmailJobData, scheduleEmailJob } from './email.queue';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { emailService } from '../services/email.service';
import { rateLimiterService } from '../services/rate-limiter.service';
import { searchService } from '../services/search.service';
import { slackService } from '../services/slack.service';
import { logger } from '../utils/logger';

/**
 * BullMQ Worker for processing scheduled email jobs.
 *
 * Stage 5 Enhancements:
 * - Syncs status changes to Elasticsearch (PROCESSING, SENT, FAILED, and rescheduled time).
 */
export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId } = job.data;
  logger.info(`[BullMQ Worker] Processing job ${job.id} for email ${emailId}`);

  // 1. Fetch Email record from PostgreSQL
  const email = await prisma.email.findUnique({
    where: { id: emailId },
  });

  if (!email) {
    logger.error(`[BullMQ Worker] Email ${emailId} not found in database. Acknowledging job.`);
    return;
  }

  // 2. Idempotency Check: if already sent, do not resend
  if (email.status === 'SENT') {
    logger.info(`[Idempotency] Email ${emailId} is already SENT. Skipping duplicate dispatch.`);
    return;
  }

  // 3. Distributed Hourly Rate Limit Check
  const admission = await rateLimiterService.tryAdmitHourly();
  if (!admission.allowed) {
    const nextWindowDate = new Date(Date.now() + admission.retryAfterMs);
    logger.warn(
      `[RateLimit] Hourly limit of ${admission.maxLimit} reached (current: ${admission.currentCount}). Rescheduling email ${emailId} to next window in ${Math.round(
        admission.retryAfterMs / 1000
      )}s (target: ${nextWindowDate.toISOString()})`
    );

    // Update email scheduledAt in PostgreSQL to reflect new window
    await prisma.email.update({
      where: { id: emailId },
      data: {
        scheduledAt: nextWindowDate,
        status: 'SCHEDULED', // Ensure it stays in SCHEDULED status
      },
    });

    // Sync rescheduled timestamp to Elasticsearch
    searchService.updateEmailIndex(emailId, { scheduledAt: nextWindowDate, status: 'SCHEDULED' }).catch(() => {});

    // Stage 7: Trigger Slack Rate-Limit Alert for the user
    if (email.userId) {
      slackService
        .sendRateLimitAlert({
          userId: email.userId,
          limit: admission.maxLimit,
          currentCount: admission.currentCount,
          nextWindowDate,
          emailRecipient: email.recipient,
        })
        .catch((slackErr) => {
          logger.warn(`Failed to dispatch Slack rate limit alert: ${slackErr.message}`);
        });
    }

    // Reschedule in BullMQ targeting next window
    await scheduleEmailJob(emailId, admission.retryAfterMs);
    return; // Exit cleanly without failing or deleting the job
  }

  // 4. Enforce Minimum Delay Between Sends across workers
  const waitMs = await rateLimiterService.enforceMinDelay();
  if (waitMs > 0) {
    logger.info(`[Pacing] Enforcing minimum delay: pausing worker for ${waitMs}ms before dispatching email ${emailId}`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  // 5. Atomic state transition: SCHEDULED -> PROCESSING
  const stateUpdate = await prisma.email.updateMany({
    where: {
      id: emailId,
      status: 'SCHEDULED',
    },
    data: {
      status: 'PROCESSING',
    },
  });

  if (stateUpdate.count === 0) {
    logger.warn(
      `[Idempotency] Email ${emailId} could not transition to PROCESSING (current status: ${email.status}). Skipping.`
    );
    return;
  }

  // Sync PROCESSING status to Elasticsearch
  searchService.updateEmailIndex(emailId, { status: 'PROCESSING' }).catch(() => {});

  // 6. Dispatch email via Ethereal SMTP
  try {
    const result = await emailService.sendEmail({
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    const sentAt = new Date();

    // 7. Update status to SENT in PostgreSQL
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt,
        error: null,
        previewUrl: result.previewUrl || null,
      },
    });

    // Sync SENT status and previewUrl to Elasticsearch
    searchService
      .updateEmailIndex(emailId, {
        status: 'SENT',
        sentAt,
        error: null,
        previewUrl: result.previewUrl || null,
      })
      .catch(() => {});

    logger.info(`[BullMQ Worker] Email ${emailId} successfully sent! Status updated to SENT.`);
    if (result.previewUrl) {
      logger.info(`[BullMQ Worker] Preview URL: ${result.previewUrl}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown SMTP delivery error';

    // 8. Update status to FAILED on delivery error (sanitized, no secrets)
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'FAILED',
        error: errorMsg,
      },
    });

    // Sync FAILED status to Elasticsearch
    searchService
      .updateEmailIndex(emailId, {
        status: 'FAILED',
        error: errorMsg,
      })
      .catch(() => {});

    logger.error(`[BullMQ Worker] Email delivery failed for ${emailId}: ${errorMsg}`);
    throw error;
  }
}

let emailWorker: Worker<EmailJobData> | null = null;

export function startEmailWorker(): Worker<EmailJobData> {
  if (emailWorker) {
    return emailWorker;
  }

  logger.info(
    `Starting BullMQ Email Worker on queue [${config.emailQueueName}] with concurrency [${config.workerConcurrency}]`
  );

  emailWorker = new Worker<EmailJobData>(config.emailQueueName, processEmailJob, {
    connection: bullmqConnection,
    concurrency: config.workerConcurrency, // Configurable concurrency
  });

  emailWorker.on('completed', (job) => {
    logger.info(`[BullMQ Worker] Job ${job.id} (email ${job.data.emailId}) completed successfully.`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`[BullMQ Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  emailWorker.on('error', (err) => {
    logger.warn(`[BullMQ Worker] Worker connection notice: ${err.message}`);
  });

  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    logger.info('Closing BullMQ Email Worker...');
    await emailWorker.close();
    emailWorker = null;
    logger.info('BullMQ Email Worker closed.');
  }
}
