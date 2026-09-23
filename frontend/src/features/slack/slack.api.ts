export interface SlackConnectionData {
  id?: string;
  teamName: string | null;
  channelName: string | null;
  hasWebhook: boolean;
  connectedAt?: string;
}

export interface SlackStatusResponse {
  success: boolean;
  data: {
    isConnected: boolean;
    connection: SlackConnectionData | null;
  };
}

export const slackApi = {
  /**
   * Fetches the current user's Slack connection status.
   */
  async getStatus(): Promise<{ isConnected: boolean; connection: SlackConnectionData | null }> {
    try {
      const response = await fetch('/api/slack/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        return { isConnected: false, connection: null };
      }

      const result: SlackStatusResponse = await response.json();
      return result.data;
    } catch (err) {
      console.warn('Failed to fetch Slack status:', err);
      return { isConnected: false, connection: null };
    }
  },

  /**
   * Sends a test message to the user's connected Slack webhook.
   */
  async sendTestMessage(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        return {
          success: false,
          message: result.error?.message || 'Failed to dispatch test notification',
        };
      }

      return {
        success: true,
        message: result.message || 'Test message dispatched to Slack!',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Network error sending test alert',
      };
    }
  },

  /**
   * Disconnects the user's Slack connection.
   */
  async disconnect(): Promise<boolean> {
    try {
      const response = await fetch('/api/slack/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch (err) {
      console.warn('Failed to disconnect Slack:', err);
      return false;
    }
  },

  /**
   * Returns the OAuth initiation URL.
   */
  getOAuthUrl(): string {
    return '/api/auth/slack';
  },
};
