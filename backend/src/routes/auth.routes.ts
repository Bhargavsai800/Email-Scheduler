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
import { logger } from '../utils/logger';

const router = Router();

// GET /api/auth/google - Starts Google OAuth flow with state protection
router.get('/google', initiateGoogleAuth);

// GET /api/auth/google/callback - Google redirects back here
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: `${config.auth.frontendUrl}/login?error=auth_failed`,
    session: true,
  }, (err: any, user: any, info: any) => {
    if (err) {
      logger.error('Google OAuth authentication error:', {
        message: err.message || 'Unknown authentication error',
        name: err.name,
      });
      // Do not expose stack traces or raw provider errors to the client
      if (req.accepts('html')) {
        return res.redirect(`${config.auth.frontendUrl}/login?error=auth_failed`);
      }
      return res.status(401).json({
        success: false,
        error: {
          message: 'Google authentication failed.',
        },
      });
    }

    if (!user) {
      logger.warn('Google OAuth completed without user profile:', info);
      return res.redirect(`${config.auth.frontendUrl}/login?error=auth_failed`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Error establishing session for Google user:', loginErr);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to establish authenticated session.',
          },
        });
      }
      return handleGoogleCallback(req, res);
    });
  })(req, res, next);
});

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
