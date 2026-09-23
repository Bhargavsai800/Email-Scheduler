import { Router } from 'express';
import {
  initiateSlackOAuth,
  handleSlackCallback,
  getSlackStatus,
  sendTestNotification,
  disconnectSlack,
} from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Slack Connection Management
router.get('/status', requireAuth, getSlackStatus);
router.post('/test', requireAuth, sendTestNotification);
router.post('/disconnect', requireAuth, disconnectSlack);

export default router;
