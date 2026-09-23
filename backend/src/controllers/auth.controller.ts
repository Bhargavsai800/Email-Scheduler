import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { config } from '../config/env';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Initiates the Google OAuth 2.0 flow.
 * Ensures CSRF state is generated and validated automatically by Passport.
 */
export function initiateGoogleAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.auth.googleClientId || !config.auth.googleClientSecret) {
    logger.warn('Google OAuth initiation attempted without client credentials configured.');
    res.redirect(`${config.auth.frontendUrl}/login?error=oauth_not_configured`);
    return;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // State is automatically generated and validated for CSRF protection
    state: true,
  } as any)(req, res, next);
}

/**
 * Handles the Google OAuth callback.
 * Invoked by Passport after successful token exchange and profile retrieval.
 */
export function handleGoogleCallback(req: Request, res: Response): void {
  logger.info(`Google OAuth login successful for user: ${req.user?.email} (${req.user?.id})`);
  // Redirect to frontend dashboard upon successful authentication
  res.redirect(`${config.auth.frontendUrl}/dashboard`);
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Rejects unauthenticated requests with 401.
 */
export function getCurrentUser(req: Request, res: Response): void {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
    },
  });
}

/**
 * POST /api/auth/logout
 * Destroys session, clears session cookie, and logs the user out.
 */
export function logout(req: Request, res: Response, next: NextFunction): void {
  req.logout((err) => {
    if (err) {
      logger.error('Error during req.logout:', err);
      return next(err);
    }

    if (req.session) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          logger.error('Error destroying session during logout:', destroyErr);
          return next(destroyErr);
        }

        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: config.nodeEnv === 'production',
          sameSite: 'lax',
        });

        res.status(200).json({
          success: true,
          message: 'Logged out successfully',
        });
      });
    } else {
      res.clearCookie('connect.sid');
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  });
}

/**
 * POST /api/auth/test-session
 * Dev/test helper endpoint to create an authenticated session directly in testing suites
 * without requiring interactive Google browser popups.
 * Disabled in production.
 */
export async function createTestSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (config.nodeEnv === 'production') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Test session creation is disabled in production',
      },
    });
    return;
  }

  try {
    const { email, name, googleId, avatarUrl } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        error: { message: 'email is required' },
      });
      return;
    }

    const testGoogleId = googleId || `google-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const user = await authService.handleGoogleProfile({
      googleId: testGoogleId,
      email,
      name: name || 'Test User',
      avatarUrl: avatarUrl || null,
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      });
    });
  } catch (error) {
    next(error);
  }
}
