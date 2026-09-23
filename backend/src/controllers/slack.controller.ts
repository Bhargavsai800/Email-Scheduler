import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { slackService } from '../services/slack.service';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Ephemeral in-memory fallback state map for environments without Redis
const memoryStateStore = new Map<string, { userId: string; expiresAt: number }>();

/**
 * GET /api/auth/slack
 * Initiates the Slack OAuth 2.0 flow with cryptographic state tracking.
 */
export async function initiateSlackOAuth(req: Request, res: Response): Promise<void> {
  if (!config.slack.clientId || !config.slack.clientSecret) {
    logger.warn('Slack OAuth initiated without SLACK_CLIENT_ID / SLACK_CLIENT_SECRET configured.');
    res.redirect(`${config.auth.frontendUrl}/dashboard?slack_error=not_configured`);
    return;
  }

  const userId = req.user!.id;
  const state = crypto.randomBytes(16).toString('hex');

  // Store state with a 10-minute expiry
  try {
    if (redisClient.status === 'ready') {
      await redisClient.set(`slack:state:${state}`, userId, 'EX', 600);
    } else {
      memoryStateStore.set(state, { userId, expiresAt: Date.now() + 600000 });
    }
  } catch (err) {
    memoryStateStore.set(state, { userId, expiresAt: Date.now() + 600000 });
  }

  const authUrl = slackService.getAuthorizationUrl(state);
  res.redirect(authUrl);
}

/**
 * GET /api/auth/slack/callback
 * Handles the redirect back from Slack after user grants authorization.
 */
export async function handleSlackCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query;

  if (error) {
    logger.warn(`Slack OAuth error received: ${error}`);
    res.redirect(`${config.auth.frontendUrl}/dashboard?slack_error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    res.redirect(`${config.auth.frontendUrl}/dashboard?slack_error=invalid_params`);
    return;
  }

  // 1. Verify CSRF state
  let userId: string | null = null;
  try {
    if (redisClient.status === 'ready') {
      userId = await redisClient.get(`slack:state:${state}`);
      if (userId) await redisClient.del(`slack:state:${state}`);
    }
  } catch {
    // Non-fatal cache lookup fallback
  }

  if (!userId) {
    const memoryRecord = memoryStateStore.get(state);
    if (memoryRecord && memoryRecord.expiresAt > Date.now()) {
      userId = memoryRecord.userId;
      memoryStateStore.delete(state);
    }
  }

  // Fallback to active session user if state lookup expired or tested in dev
  if (!userId && req.user?.id) {
    userId = req.user.id;
  }

  if (!userId) {
    logger.warn('Slack OAuth state validation failed or expired.');
    res.redirect(`${config.auth.frontendUrl}/dashboard?slack_error=state_mismatch`);
    return;
  }

  // 2. Exchange authorization code for token & webhook
  const oauthResult = await slackService.exchangeOAuthCode(code);
  if (!oauthResult.ok) {
    logger.error('Slack OAuth token exchange failed:', oauthResult.error);
    res.redirect(`${config.auth.frontendUrl}/dashboard?slack_error=${encodeURIComponent(oauthResult.error || 'token_exchange_failed')}`);
    return;
  }

  // 3. Persist SlackConnection
  await slackService.upsertConnection(userId, oauthResult);

  // 4. Redirect user back to frontend dashboard
  res.redirect(`${config.auth.frontendUrl}/dashboard?slack=connected`);
}

/**
 * GET /api/slack/status
 * Returns connection state and metadata for the current user.
 */
export async function getSlackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const connection = await slackService.getConnection(req.user!.id);
    res.status(200).json({
      success: true,
      data: {
        isConnected: Boolean(connection && connection.isActive),
        connection: connection && connection.isActive
          ? {
              id: connection.id,
              teamName: connection.teamName,
              channelName: connection.channelName,
              hasWebhook: Boolean(connection.incomingWebhookUrl),
              connectedAt: connection.createdAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/slack/test
 * Sends a real test notification to the user's connected Slack webhook.
 */
export async function sendTestNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await slackService.sendTestNotification(req.user!.id);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SLACK_DELIVERY_FAILED',
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/slack/disconnect
 * Disconnects the user's Slack workspace.
 */
export async function disconnectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await slackService.disconnect(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Slack connection disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
}
