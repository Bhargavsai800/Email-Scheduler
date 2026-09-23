import { prisma } from '../config/db';
import { redisClient } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { SlackConnection } from '@prisma/client';

export interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  team?: {
    id: string;
    name: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

export interface RateLimitAlertParams {
  userId: string;
  limit: number;
  currentCount: number;
  nextWindowDate: Date;
  emailRecipient?: string;
}

export class SlackService {
  /**
   * Generates the Slack OAuth 2.0 authorization URL.
   */
  public getAuthorizationUrl(state: string): string {
    const scopes = ['incoming-webhook', 'chat:write', 'channels:read'].join(',');
    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      scope: scopes,
      redirect_uri: config.slack.redirectUri,
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges temporary OAuth code for bot access token and incoming webhook.
   */
  public async exchangeOAuthCode(code: string): Promise<SlackOAuthResponse> {
    try {
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code,
          redirect_uri: config.slack.redirectUri,
        }).toString(),
      });

      const data: SlackOAuthResponse = await response.json();
      return data;
    } catch (error) {
      logger.error('Error during Slack OAuth code exchange:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to exchange Slack code',
      };
    }
  }

  /**
   * Stores or updates a user's SlackConnection record in PostgreSQL.
   */
  public async upsertConnection(
    userId: string,
    slackData: SlackOAuthResponse
  ): Promise<SlackConnection> {
    const teamId = slackData.team?.id || 'unknown-team';
    const teamName = slackData.team?.name || 'Slack Workspace';
    const accessToken = slackData.access_token || '';
    const botUserId = slackData.bot_user_id || null;
    const channelId = slackData.incoming_webhook?.channel_id || null;
    const channelName = slackData.incoming_webhook?.channel || null;
    const incomingWebhookUrl = slackData.incoming_webhook?.url || null;

    const connection = await prisma.slackConnection.upsert({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      update: {
        teamName,
        accessToken,
        botUserId,
        channelId,
        channelName,
        incomingWebhookUrl,
        isActive: true,
      },
      create: {
        userId,
        teamId,
        teamName,
        accessToken,
        botUserId,
        channelId,
        channelName,
        incomingWebhookUrl,
        isActive: true,
      },
    });

    logger.info(`Slack connection established for user [${userId}] to team [${teamName}] (${channelName})`);
    return connection;
  }

  /**
   * Retrieves the user's active SlackConnection.
   */
  public async getConnection(userId: string): Promise<SlackConnection | null> {
    return prisma.slackConnection.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  /**
   * Deactivates all Slack connections for the given user.
   */
  public async disconnect(userId: string): Promise<void> {
    await prisma.slackConnection.updateMany({
      where: { userId },
      data: { isActive: false },
    });
    logger.info(`Deactivated Slack connections for user [${userId}]`);
  }

  /**
   * Dispatches a rate-limit alert to the user's Slack channel.
   * Utilizes Redis-backed hourly deduplication (slack:ratelimit-alert:{userId}:{windowIndex})
   * so channels receive exactly one clean notification per window instead of being spammed.
   */
  public async sendRateLimitAlert(params: RateLimitAlertParams): Promise<boolean> {
    const { userId, limit, currentCount, nextWindowDate, emailRecipient } = params;

    // 1. Check window deduplication key in Redis
    const windowIndex = Math.floor(Date.now() / 1000 / config.rateLimitWindowSeconds);
    const dedupKey = `slack:ratelimit-alert:${userId}:${windowIndex}`;

    try {
      if (redisClient.status === 'ready') {
        const alreadyAlerted = await redisClient.get(dedupKey);
        if (alreadyAlerted) {
          logger.info(`[Slack] Rate limit alert already delivered for user [${userId}] in window ${windowIndex}. Suppressing duplicate.`);
          return false;
        }
      }
    } catch (redisErr) {
      logger.warn(`Redis dedup check notice: ${redisErr instanceof Error ? redisErr.message : redisErr}`);
    }

    // 2. Fetch active Slack connection for user
    const connection = await this.getConnection(userId);
    if (!connection || !connection.incomingWebhookUrl) {
      logger.info(`[Slack] No active webhook configured for user [${userId}]. Alert skipped.`);
      return false;
    }

    // 3. Construct rich Block Kit message payload
    const payload = {
      text: `⚠️ ReachInbox Hourly Rate Limit Reached (${currentCount}/${limit} emails)`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Hourly Rate Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Hourly email send limit of ${limit} emails has been reached.* Scheduled email${
              emailRecipient ? ` to *${emailRecipient}*` : ''
            } has been safely postponed to the next window.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Configured Limit:*\n${limit} emails / hr`,
            },
            {
              type: 'mrkdwn',
              text: `*Current Quota:*\n${currentCount} processed`,
            },
            {
              type: 'mrkdwn',
              text: `*Next Send Window:*\n<!date^${Math.floor(nextWindowDate.getTime() / 1000)}^{date_num} {time_secs}|${nextWindowDate.toISOString()}>`,
            },
            {
              type: 'mrkdwn',
              text: `*Postponed Email:*\n${emailRecipient || 'Scheduled job'}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🛡️ *Non-destructive Queueing*: All scheduled emails remain safely preserved in BullMQ and will automatically resume at the start of the next window.',
            },
          ],
        },
      ],
    };

    // 4. Send message to Slack Webhook
    try {
      const response = await fetch(connection.incomingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error(`[Slack] Webhook request failed (HTTP ${response.status}): ${text}`);
        return false;
      }

      logger.info(`[Slack] Rate limit alert successfully delivered to user [${userId}] on channel ${connection.channelName || 'default'}`);

      // 5. Set Redis deduplication key with TTL matching the hourly window
      try {
        if (redisClient.status === 'ready') {
          await redisClient.set(dedupKey, '1', 'EX', config.rateLimitWindowSeconds);
        }
      } catch (cacheErr) {
        // Ignored non-fatal cache notice
      }

      return true;
    } catch (postErr) {
      logger.error('[Slack] Failed to post rate limit message to Slack webhook:', postErr);
      return false;
    }
  }

  /**
   * Dispatches an instant test message to verify the user's Slack webhook.
   */
  public async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const connection = await this.getConnection(userId);
    if (!connection || !connection.incomingWebhookUrl) {
      return {
        success: false,
        message: 'No active Slack webhook connection found for this user',
      };
    }

    const payload = {
      text: '🎉 ReachInbox Slack Integration Connected Successfully!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎉 Slack Connection Verified',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your Slack workspace *${connection.teamName || 'Workspace'}* (${connection.channelName || 'channel'}) is now connected to *ReachInbox Email Scheduler*!\n\nYou will receive instant automated alerts here whenever your hourly email sending limit is reached.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Verified at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(connection.incomingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          message: `Slack rejected webhook message (HTTP ${response.status}): ${errText}`,
        };
      }

      return {
        success: true,
        message: `Test notification sent successfully to ${connection.channelName || 'Slack'}!`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test message to Slack',
      };
    }
  }
}

export const slackService = new SlackService();
