import React, { useState, useEffect, useMemo } from 'react';
import { slackApi, SlackConnectionData } from './slack.api';
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Unlink,
  Loader2,
  ExternalLink,
  BellRing,
} from 'lucide-react';

export const SlackConnectionCard: React.FC = () => {
  const [connection, setConnection] = useState<SlackConnectionData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Check URL parameters for OAuth redirect feedback
  const queryNotice = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'connected') {
      return {
        type: 'success' as const,
        text: 'Slack workspace connected successfully! Rate-limit notifications will appear in your channel.',
      };
    }
    const err = params.get('slack_error');
    if (err === 'not_configured') {
      return {
        type: 'error' as const,
        text: 'Slack OAuth credentials are not configured on the backend. Please add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to backend/.env.',
      };
    }
    if (err) {
      return {
        type: 'error' as const,
        text: `Slack OAuth connection failed: ${err}`,
      };
    }
    return null;
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    const data = await slackApi.getStatus();
    setIsConnected(data.isConnected);
    setConnection(data.connection);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = slackApi.getOAuthUrl();
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setFeedback(null);
    const result = await slackApi.sendTestMessage();
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
    setIsSendingTest(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Slack notifications?')) return;
    setIsDisconnecting(true);
    const ok = await slackApi.disconnect();
    if (ok) {
      setIsConnected(false);
      setConnection(null);
      setFeedback({ type: 'success', message: 'Slack workspace disconnected.' });
    } else {
      setFeedback({ type: 'error', message: 'Failed to disconnect Slack workspace.' });
    }
    setIsDisconnecting(false);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-xl">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          {/* Slack Official Logo Icon */}
          <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center p-2.5 shadow-md">
            <svg viewBox="0 0 127 127" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M27.2 79.9c0 7.5-6.1 13.6-13.6 13.6S0 87.4 0 79.9s6.1-13.6 13.6-13.6h13.6v13.6z" fill="#E01E5A"/>
              <path d="M34 79.9c0-7.5 6.1-13.6 13.6-13.6s13.6 6.1 13.6 13.6v34c0 7.5-6.1 13.6-13.6 13.6s-13.6-6.1-13.6-13.6v-34z" fill="#E01E5A"/>
              <path d="M47.6 27.2c-7.5 0-13.6-6.1-13.6-13.6S40.1 0 47.6 0s13.6 6.1 13.6 13.6v13.6H47.6z" fill="#36C5F0"/>
              <path d="M47.6 34c7.5 0 13.6 6.1 13.6 13.6s-6.1 13.6-13.6 13.6h-34c-7.5 0-13.6-6.1-13.6-13.6S6.1 34 13.6 34h34z" fill="#36C5F0"/>
              <path d="M99.8 47.6c0-7.5 6.1-13.6 13.6-13.6s13.6 6.1 13.6 13.6-6.1 13.6-13.6 13.6H99.8V47.6z" fill="#2EB67D"/>
              <path d="M93 47.6c0 7.5-6.1 13.6-13.6 13.6s-13.6-6.1-13.6-13.6v-34c0-7.5 6.1-13.6 13.6-13.6s13.6 6.1 13.6 13.6v34z" fill="#2EB67D"/>
              <path d="M79.4 99.8c7.5 0 13.6 6.1 13.6 13.6s-6.1 13.6-13.6 13.6-13.6-6.1-13.6-13.6V99.8h13.6z" fill="#ECB22E"/>
              <path d="M79.4 93c-7.5 0-13.6-6.1-13.6-13.6s6.1-13.6 13.6-13.6h34c7.5 0 13.6 6.1 13.6 13.6s-6.1 13.6-13.6 13.6h-34z" fill="#ECB22E"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Slack Integration</h3>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated notifications when hourly email scheduling limits are reached
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isLoading ? (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Checking connection...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center space-x-2">
              <button
                id="slack-test-btn"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Send Test Alert</span>
              </button>

              <button
                id="slack-disconnect-btn"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                title="Disconnect Slack"
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <button
              id="slack-connect-btn"
              onClick={handleConnect}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <BellRing className="w-4 h-4" />
              <span>Connect Slack</span>
            </button>
          )}
        </div>
      </div>

      {/* Query feedback notification */}
      {queryNotice && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
            queryNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {queryNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          )}
          <span className="leading-relaxed">{queryNotice.text}</span>
        </div>
      )}

      {/* Action feedback */}
      {feedback && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          )}
          <span className="leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* Details Box */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          <div className="text-sm font-semibold text-white mt-1 truncate">
            {connection?.teamName || (isConnected ? 'Connected' : 'Not configured')}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Notification Channel
          </div>
          <div className="text-sm font-semibold text-white mt-1 truncate">
            {connection?.channelName || (isConnected ? '#notifications' : 'None')}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Alert Deduplication
          </div>
          <div className="text-sm font-semibold text-emerald-400 mt-1">
            Hourly Window Guard
          </div>
        </div>
      </div>
    </div>
  );
};
