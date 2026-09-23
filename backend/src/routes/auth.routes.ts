import { Router } from 'express';
import passport from 'passport';
import { config } from '../config/env';
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  logout,
  createTestSession,
} from '../controllers/auth.controller';
import {
  initiateSlackOAuth,
  handleSlackCallback,
} from '../controllers/slack.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/auth/google - Starts Google OAuth flow with state protection
router.get('/google', initiateGoogleAuth);

// GET /api/auth/google/callback - Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.auth.frontendUrl}/login?error=auth_failed`,
    session: true,
  }),
  handleGoogleCallback
);

// GET /api/auth/slack - Starts Slack OAuth flow (Protected: user must be logged in)
router.get('/slack', requireAuth, initiateSlackOAuth);

// GET /api/auth/slack/callback - Slack redirects back here with code & state
router.get('/slack/callback', handleSlackCallback);

// GET /api/auth/me - Retrieves current authenticated user profile
router.get('/me', getCurrentUser);

// POST /api/auth/logout - Invalidate session & clear cookies
router.post('/logout', logout);

// POST /api/auth/test-session - Testing utility for automated suites
router.post('/test-session', createTestSession);

export default router;
