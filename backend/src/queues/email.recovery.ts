import { prisma } from '../config/db';
import { emailQueue, scheduleEmailJob } from './email.queue';
import { logger } from '../utils/logger';

export interface RecoveryReport {
  totalPending: number;
  recoveredJobs: number;
  preservedJobs: number;
  recoveredProcessing: number;
  errors: number;
}

/**
 * Recovers pending scheduled email jobs from PostgreSQL on server startup.
 *
 * Guarantees that:
 * 1. Emails marked as SCHEDULED in PostgreSQL have a corresponding BullMQ delayed job.
 * 2. If Redis was restarted or jobs were purged, jobs are seamlessly re-enqueued.
 * 3. Emails orphaned in PROCESSING state during an unexpected server crash are reset to SCHEDULED and re-enqueued.
 * 4. Zero duplicate jobs are created because BullMQ uses email.id as the deterministic jobId.
 */
export async function recoverPendingScheduledEmails(): Promise<RecoveryReport> {
  const report: RecoveryReport = {
    totalPending: 0,
    recoveredJobs: 0,
    preservedJobs: 0,
    recoveredProcessing: 0,
    errors: 0,
  };

  try {
    logger.info('[Scheduler Recovery] Checking PostgreSQL for pending and orphaned email jobs...');

    // 1. Recover any orphaned PROCESSING emails older than 2 minutes (interrupted by server crash)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const orphanedProcessing = await prisma.email.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: {
          lt: twoMinutesAgo,
        },
      },
      data: {
        status: 'SCHEDULED',
      },
    });

    if (orphanedProcessing.count > 0) {
      report.recoveredProcessing = orphanedProcessing.count;
      logger.warn(
        `[Scheduler Recovery] Reset ${orphanedProcessing.count} orphaned PROCESSING emails back to SCHEDULED.`
      );
    }

    // 2. Fetch all SCHEDULED emails from PostgreSQL
    const scheduledEmails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        recipient: true,
        scheduledAt: true,
        bullJobId: true,
      },
    });

    report.totalPending = scheduledEmails.length;
    logger.info(`[Scheduler Recovery] Found ${scheduledEmails.length} pending SCHEDULED emails in database.`);

    if (scheduledEmails.length === 0) {
      return report;
    }

    // 3. Verify and re-enqueue each scheduled email if not present in BullMQ
    for (const email of scheduledEmails) {
      try {
        const existingJob = await emailQueue.getJob(email.id);

        if (existingJob) {
          const jobState = await existingJob.getState();
          if (jobState === 'delayed' || jobState === 'waiting' || jobState === 'active') {
            report.preservedJobs++;
            continue;
          }
        }

        // Job does not exist or was purged: re-enqueue with remaining delay
        const now = Date.now();
        const targetTime = email.scheduledAt.getTime();
        const remainingDelayMs = Math.max(0, targetTime - now);

        const newJob = await scheduleEmailJob(email.id, remainingDelayMs);
        report.recoveredJobs++;

        if (newJob.id && newJob.id !== email.bullJobId) {
          await prisma.email.update({
            where: { id: email.id },
            data: { bullJobId: String(newJob.id) },
          });
        }

        logger.info(
          `[Scheduler Recovery] Successfully restored BullMQ job for email [${email.id}] to [${email.recipient}] (delay: ${remainingDelayMs}ms)`
        );
      } catch (err) {
        report.errors++;
        logger.warn(
          `[Scheduler Recovery] Notice processing recovery for email ${email.id}: ${
            err instanceof Error ? err.message : err
          }`
        );
      }
    }

    logger.info(
      `[Scheduler Recovery] Completed: ${report.preservedJobs} preserved in Redis, ${report.recoveredJobs} recovered, ${report.recoveredProcessing} un-orphaned.`
    );
  } catch (error) {
    logger.warn(
      `[Scheduler Recovery] Database or Redis unavailable during startup recovery notice: ${
        error instanceof Error ? error.message : error
      }`
    );
  }

  return report;
}
