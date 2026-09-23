import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the incoming HTTP request is made by an authenticated session.
 * If valid, req.user will be populated.
 * If unauthenticated or session expired, responds with 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}
