import { Router } from 'express';
import healthRoutes from './health.routes';
import emailRoutes from './email.routes';
import authRoutes from './auth.routes';
import slackRoutes from './slack.routes';

const router = Router();

// Mount health routes at /health
router.use('/health', healthRoutes);

// Mount email scheduler routes at /emails
router.use('/emails', emailRoutes);

// Mount authentication routes at /auth
router.use('/auth', authRoutes);

// Mount Slack connection management at /slack
router.use('/slack', slackRoutes);

export default router;
