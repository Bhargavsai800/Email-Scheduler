import { Router } from 'express';
import {
  scheduleEmail,
  batchScheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  getRateLimitStatus,
  searchEmails,
} from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/emails/schedule - Schedules a delayed email via BullMQ (Protected)
router.post('/schedule', requireAuth, scheduleEmail);

// POST /api/emails/batch-schedule - Schedules a batch of leads with deduplication & delay spacing (Protected)
router.post('/batch-schedule', requireAuth, batchScheduleEmails);

// GET /api/emails/scheduled - View all currently scheduled/pending emails for user (Protected)
router.get('/scheduled', requireAuth, getScheduledEmails);

// GET /api/emails/sent - View all sent emails with delivery info for user (Protected)
router.get('/sent', requireAuth, getSentEmails);

// GET /api/emails/rate-limit - Telemetry on rate limiting capacity and usage
router.get('/rate-limit', getRateLimitStatus);

// GET /api/emails/search - Full-text search and filtering via Elasticsearch scoped to user (Protected)
router.get('/search', requireAuth, searchEmails);

// GET /api/emails/:id - View single email details with strict ownership verification (Protected)
router.get('/:id', requireAuth, getEmailById);

export default router;
