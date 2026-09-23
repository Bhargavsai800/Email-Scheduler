import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { scheduleEmailJob } from '../queues/email.queue';
import { rateLimiterService } from '../services/rate-limiter.service';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';

// Zod validation schema for scheduling an email
export const scheduleEmailSchema = z.object({
  recipient: z
    .string({ required_error: 'recipient is required' })
    .email('Invalid email address format')
    .trim(),
  subject: z
    .string({ required_error: 'subject is required' })
    .trim()
    .min(1, 'subject cannot be empty')
    .max(500, 'subject must be less than 500 characters'),
  body: z
    .string({ required_error: 'body is required' })
    .trim()
    .min(1, 'body cannot be empty'),
  scheduledAt: z
    .string({ required_error: 'scheduledAt is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduledAt must be a valid ISO 8601 date string (e.g. 2026-09-24T10:00:00.000Z)',
    })
    .refine(
      (val) => {
        // Allow a 5-second grace window for slight network or clock skew
        return new Date(val).getTime() >= Date.now() - 5000;
      },
      {
        message: 'scheduledAt cannot be in the past',
      }
    ),
});

/**
 * POST /api/emails/schedule
 * Validates the payload, reserves a slot respecting MIN_EMAIL_DELAY_MS,
 * stores the email in PostgreSQL, indexes into Elasticsearch, and submits a BullMQ delayed job.
 */
export async function scheduleEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = scheduleEmailSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const { recipient, subject, body, scheduledAt } = parseResult.data;
    const requestedDate = new Date(scheduledAt);

    // Stagger slot to respect MIN_EMAIL_DELAY_MS even under concurrent or batch submissions
    const assignedDate = await rateLimiterService.reserveSlot(requestedDate);
    const delayMs = Math.max(0, assignedDate.getTime() - Date.now());

    // 1. Create the Email record in PostgreSQL with status SCHEDULED and authenticated userId
    const userId = req.user?.id;
    const email = await prisma.email.create({
      data: {
        recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: assignedDate,
        userId: userId || undefined,
      },
    });

    logger.info(`Email record created in database with ID: ${email.id} (Scheduled for: ${assignedDate.toISOString()}, User: ${userId || 'anonymous'})`);

    // 2. Asynchronously index document into Elasticsearch (Stage 5 & Stage 6)
    searchService
      .indexEmail({
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        createdAt: email.createdAt,
        userId: email.userId || undefined,
      })
      .catch((err) => {
        logger.warn(`Initial Elasticsearch indexing notice: ${err.message}`);
      });

    // 3. Add delayed BullMQ job using email.id as logical job identifier
    let bullJobId: string | undefined = undefined;
    try {
      const job = await scheduleEmailJob(email.id, delayMs);
      bullJobId = job.id ? String(job.id) : undefined;

      // 4. Save the BullMQ job ID on the Email record
      if (bullJobId) {
        await prisma.email.update({
          where: { id: email.id },
          data: { bullJobId },
        });

        // Update ES index with bullJobId
        searchService.updateEmailIndex(email.id, { bullJobId }).catch(() => {});
      }
    } catch (queueErr) {
      logger.warn(
        `Failed to add BullMQ job for email ${email.id} (Redis may be offline): ${
          queueErr instanceof Error ? queueErr.message : queueErr
        }`
      );
    }

    // 5. Return created email information
    res.status(201).json({
      success: true,
      data: {
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        delayMs,
        bullJobId,
        createdAt: email.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/scheduled
 * Returns all emails currently in SCHEDULED status for the authenticated user, ordered by scheduledAt ASC.
 */
export async function getScheduledEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const emails = await prisma.email.findMany({
      where: {
        status: 'SCHEDULED',
        ...(userId ? { userId } : {}),
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        scheduledAt: true,
        bullJobId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/sent
 * Returns all emails that have been successfully SENT for the authenticated user, ordered by sentAt DESC.
 */
export async function getSentEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const emails = await prisma.email.findMany({
      where: {
        status: 'SENT',
        ...(userId ? { userId } : {}),
      },
      orderBy: {
        sentAt: 'desc',
      },
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        previewUrl: true,
        bullJobId: true,
        userId: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/:id
 * Returns a single email by ID, strictly enforcing that it belongs to the authenticated user.
 * If the email does not exist or belongs to another user, returns 404 without leaking existence.
 */
export async function getEmailById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const email = await prisma.email.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
      select: {
        id: true,
        recipient: true,
        subject: true,
        body: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        previewUrl: true,
        error: true,
        bullJobId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!email) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Email not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: email,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/rate-limit
 * Returns current hourly rate limit usage and configuration.
 */
export async function getRateLimitStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await rateLimiterService.getRateLimitStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/emails/search
 * Full-text search and filtering across emails using Elasticsearch (with PostgreSQL fallback).
 * Automatically scoped to the authenticated user's ID.
 */
export async function searchEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const recipient = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    const userId = req.user?.id;

    const results = await searchService.searchEmails({
      query,
      status,
      recipient,
      fromDate,
      toDate,
      userId,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    next(error);
  }
}

// Zod validation schema for batch scheduling emails
export const batchScheduleEmailSchema = z.object({
  recipients: z
    .array(z.string().trim())
    .min(1, 'At least one recipient email is required')
    .max(1000, 'Maximum 1000 recipients allowed per batch'),
  subject: z
    .string({ required_error: 'subject is required' })
    .trim()
    .min(1, 'subject cannot be empty')
    .max(500, 'subject must be less than 500 characters'),
  body: z
    .string({ required_error: 'body is required' })
    .trim()
    .min(1, 'body cannot be empty'),
  startTime: z
    .string({ required_error: 'startTime is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'startTime must be a valid ISO 8601 date string',
    }),
  delayBetweenEmailsMs: z
    .number()
    .min(0, 'delayBetweenEmailsMs cannot be negative')
    .max(3600000, 'delayBetweenEmailsMs cannot exceed 1 hour')
    .default(2000),
  hourlyLimit: z
    .number()
    .min(1, 'hourlyLimit must be at least 1')
    .max(10000, 'hourlyLimit cannot exceed 10000')
    .optional(),
});

/**
 * POST /api/emails/batch-schedule
 * Validates, normalizes, and deduplicates an array of leads, then schedules
 * delayed jobs staggered by delayBetweenEmailsMs, persisted in PostgreSQL and BullMQ.
 */
export async function batchScheduleEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = batchScheduleEmailSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
      return;
    }

    const { recipients, subject, body, startTime, delayBetweenEmailsMs } = parseResult.data;
    const userId = req.user?.id;

    // Email regex for fast format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Normalize and filter valid email formats
    const validRecipients: string[] = [];
    const invalidRecipients: string[] = [];

    for (const r of recipients) {
      const cleaned = r.toLowerCase().trim();
      if (emailRegex.test(cleaned)) {
        validRecipients.push(cleaned);
      } else if (cleaned.length > 0) {
        invalidRecipients.push(r);
      }
    }

    // 2. Deduplicate while preserving order
    const seen = new Set<string>();
    const uniqueRecipients: string[] = [];
    for (const email of validRecipients) {
      if (!seen.has(email)) {
        seen.add(email);
        uniqueRecipients.push(email);
      }
    }

    if (uniqueRecipients.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'No valid recipient email addresses found in the provided list.',
          invalidRecipients,
        },
      });
      return;
    }

    const startEpoch = Math.max(Date.now(), new Date(startTime).getTime());
    const scheduledRecords: Array<{
      id: string;
      recipient: string;
      subject: string;
      status: string;
      scheduledAt: string;
      bullJobId?: string;
    }> = [];

    logger.info(
      `[Batch Scheduler] Processing batch of ${uniqueRecipients.length} unique leads (from ${recipients.length} raw) with ${delayBetweenEmailsMs}ms delay spacing.`
    );

    // 3. Stagger and schedule each recipient
    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const targetTime = new Date(startEpoch + i * delayBetweenEmailsMs);

      // Reserve slot respecting distributed rate limits and minimum delays
      const assignedDate = await rateLimiterService.reserveSlot(targetTime);
      const delayMs = Math.max(0, assignedDate.getTime() - Date.now());

      // Create Email in PostgreSQL
      const email = await prisma.email.create({
        data: {
          recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: assignedDate,
          userId: userId || undefined,
        },
      });

      // Index into Elasticsearch
      searchService
        .indexEmail({
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          createdAt: email.createdAt,
          userId: email.userId || undefined,
        })
        .catch(() => {});

      // Add delayed BullMQ job
      let bullJobId: string | undefined = undefined;
      try {
        const job = await scheduleEmailJob(email.id, delayMs);
        bullJobId = job.id ? String(job.id) : undefined;
        if (bullJobId) {
          await prisma.email.update({
            where: { id: email.id },
            data: { bullJobId },
          });
        }
      } catch (queueErr) {
        logger.warn(`Notice scheduling BullMQ job for batch email ${email.id}: ${queueErr}`);
      }

      scheduledRecords.push({
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        status: email.status,
        scheduledAt: assignedDate.toISOString(),
        bullJobId,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        totalSubmitted: recipients.length,
        validRecipients: validRecipients.length,
        uniqueRecipients: uniqueRecipients.length,
        scheduledCount: scheduledRecords.length,
        firstScheduledAt: scheduledRecords[0]?.scheduledAt,
        lastScheduledAt: scheduledRecords[scheduledRecords.length - 1]?.scheduledAt,
        invalidRecipients: invalidRecipients.length > 0 ? invalidRecipients : undefined,
        emails: scheduledRecords,
      },
    });
  } catch (error) {
    next(error);
  }
}

