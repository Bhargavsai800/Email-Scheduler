import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { NavView } from '../components/layout/Sidebar';
import { EmailTable } from '../components/email/EmailTable';
import { EmailDetailModal } from '../components/email/EmailDetailModal';
import { ComposeModal } from '../features/compose/ComposeModal';
import { EmailSearchView } from '../features/search/EmailSearchView';
import { SlackConnectionCard } from '../features/slack/SlackConnectionCard';
import { HealthDashboard } from '../features/health/HealthDashboard';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import {
  fetchScheduledEmails,
  fetchSentEmails,
  fetchRateLimitStatus,
} from '../services/api';
import { ScheduledEmail, RateLimitTelemetry } from '../types';
import {
  Sparkles,
  Clock,
  Send,
  Gauge,
  Zap,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmail[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduled, sent, rate] = await Promise.all([
        fetchScheduledEmails().catch(() => []),
        fetchSentEmails().catch(() => []),
        fetchRateLimitStatus().catch(() => null),
      ]);
      setScheduledEmails(scheduled);
      setSentEmails(sent);
      setRateLimit(rate);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds to catch delayed jobs progressing
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleEmailScheduled = (newEmail: ScheduledEmail) => {
    setScheduledEmails((prev) => [newEmail, ...prev]);
    setToastMessage(`Email scheduled for ${new Date(newEmail.scheduledAt).toLocaleTimeString()}`);
    setTimeout(() => setToastMessage(null), 5000);
    loadData();
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast alert banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-900/50 border border-indigo-400/40 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner with Metric Highlights */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900/90 to-slate-950 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full-stack Email Job Scheduler • Stage 8 UI</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Email Scheduler & Orchestration
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time delayed job dispatching powered by BullMQ, Redis rate limiting,
              Ethereal SMTP, and Elasticsearch full-text search.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Scheduled</span>
              </span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {scheduledEmails.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                <Send className="w-3 h-3 text-emerald-400" />
                <span>Sent</span>
              </span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {sentEmails.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                <Gauge className="w-3 h-3 text-indigo-400" />
                <span>Capacity</span>
              </span>
              <div className="text-lg font-bold text-indigo-300 mt-0.5">
                {rateLimit ? `${rateLimit.currentCount}/${rateLimit.maxLimit}` : '0/100'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout with Sidebar */}
      <DashboardLayout
        currentView={currentView}
        onSelectView={setCurrentView}
        onComposeClick={() => setIsComposeOpen(true)}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        rateLimit={rateLimit}
      >
        {/* Scheduled Emails View */}
        {currentView === 'scheduled' && (
          <EmailTable
            emails={scheduledEmails}
            isLoading={isLoading}
            onSelectEmail={(email) => setSelectedEmail(email)}
            title="Scheduled Emails"
            subtitle="Pending delivery jobs scheduled with BullMQ delay and Redis rate limits."
            emptyTitle="No scheduled emails queued"
            emptyDescription="You don't have any pending email jobs. Click the Compose Email button to schedule your first delivery."
            onRefresh={loadData}
            onComposeClick={() => setIsComposeOpen(true)}
            showSentTime={false}
          />
        )}

        {/* Sent History View */}
        {currentView === 'sent' && (
          <EmailTable
            emails={sentEmails}
            isLoading={isLoading}
            onSelectEmail={(email) => setSelectedEmail(email)}
            title="Sent Email History"
            subtitle="Delivered emails processed by the BullMQ worker via Ethereal SMTP."
            emptyTitle="No emails have been sent yet"
            emptyDescription="Once scheduled emails reach their delivery time, they will appear here with delivery details and Ethereal preview links."
            onRefresh={loadData}
            onComposeClick={() => setIsComposeOpen(true)}
            showSentTime={true}
          />
        )}

        {/* Elasticsearch Search View */}
        {currentView === 'search' && (
          <EmailSearchView
            onSelectEmail={(email) => setSelectedEmail(email)}
          />
        )}

        {/* Slack Notifications View */}
        {currentView === 'slack' && (
          <div className="space-y-6">
            <SlackConnectionCard />
          </div>
        )}

        {/* System Health & Architecture View */}
        {currentView === 'health' && (
          <div className="space-y-6">
            <HealthDashboard />
            <ArchitectureDiagram />
          </div>
        )}
      </DashboardLayout>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduled={handleEmailScheduled}
      />

      {/* Inspect Email Detail Modal */}
      <EmailDetailModal
        isOpen={selectedEmail !== null}
        onClose={() => setSelectedEmail(null)}
        email={selectedEmail}
      />
    </div>
  );
};
