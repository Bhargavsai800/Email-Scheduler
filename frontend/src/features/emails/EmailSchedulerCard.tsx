import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Mail,
  Gauge,
  Zap,
  Users,
  Search as SearchIcon,
  Database,
} from 'lucide-react';
import {
  scheduleEmail,
  fetchScheduledEmails,
  fetchSentEmails,
  fetchRateLimitStatus,
  searchEmails,
} from '../../services/api';
import { ScheduledEmail, RateLimitTelemetry } from '../../types';

export const EmailSchedulerCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'scheduled' | 'sent' | 'search'>('schedule');

  // Form fields
  const [recipient, setRecipient] = useState('candidate@reachinbox.ai');
  const [subject, setSubject] = useState('Welcome to ReachInbox Email Scheduler');
  const [body, setBody] = useState('Hello! Your email was processed by the BullMQ worker and delivered via Ethereal SMTP.');
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // List data & Rate limit telemetry
  const [scheduledList, setScheduledList] = useState<ScheduledEmail[]>([]);
  const [sentList, setSentList] = useState<ScheduledEmail[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitTelemetry | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('ALL');
  const [searchResults, setSearchResults] = useState<ScheduledEmail[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchSource, setSearchSource] = useState<'elasticsearch' | 'database_fallback'>('elasticsearch');
  const [isSearching, setIsSearching] = useState(false);

  const loadData = async () => {
    setLoadingList(true);
    try {
      const [scheduled, sent, rateStatus] = await Promise.all([
        fetchScheduledEmails().catch(() => []),
        fetchSentEmails().catch(() => []),
        fetchRateLimitStatus().catch(() => null),
      ]);
      setScheduledList(scheduled);
      setSentList(sent);
      setRateLimit(rateStatus);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
      const res = await scheduleEmail({
        recipient,
        subject,
        body,
        scheduledAt,
      });

      setSubmitSuccess(`Email scheduled successfully! Job ID: ${res.bullJobId || res.id} (Delay: ${delaySeconds}s)`);
      loadData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      const res = await searchEmails({
        query: searchQuery,
        status: searchStatus,
        limit: 50,
      });
      setSearchResults(res.data);
      setSearchTotal(res.total);
      setSearchSource(res.source);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Email Scheduler & Elasticsearch Engine
            </h2>
            <p className="text-xs text-slate-400">
              Distributed BullMQ job orchestration with Redis rate limiting and Elasticsearch full-text search.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Schedule Email
          </button>
          <button
            onClick={() => {
              setActiveTab('scheduled');
              loadData();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'scheduled'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Scheduled ({scheduledList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('sent');
              loadData();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Sent History ({sentList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('search');
              handleSearchSubmit();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'search'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Search (ES)</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Rate Limiting & Concurrency Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Worker Concurrency</span>
            <span className="text-xs font-bold text-slate-200">
              {rateLimit?.workerConcurrency || 5} Concurrent Workers
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Min Delay Spacing</span>
            <span className="text-xs font-bold text-slate-200">
              {rateLimit?.minEmailDelayMs || 2000} ms between sends
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Hourly Limit Capacity</span>
            <span className="text-xs font-bold text-slate-200">
              {rateLimit ? `${rateLimit.currentCount} / ${rateLimit.maxLimit} emails` : '100 / hour'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Window Reset</span>
            <span className="text-xs font-bold text-slate-200">
              {rateLimit ? `${Math.round(rateLimit.retryAfterSeconds / 60)} min remaining` : '60 min'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Schedule Form */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleScheduleSubmit} className="space-y-4 max-w-2xl">
          {submitSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Email</label>
              <input
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Delay (Seconds)</label>
              <select
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Body</label>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email message content..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Reserving slot & queuing...' : `Schedule Email (${delaySeconds}s Delay)`}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Scheduled List */}
      {activeTab === 'scheduled' && (
        <div className="space-y-3">
          {scheduledList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No pending scheduled emails found.</p>
          ) : (
            <div className="space-y-2">
              {scheduledList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-200">{item.subject}</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      To: {item.recipient} • Scheduled: {new Date(item.scheduledAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    SCHEDULED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sent History */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sentList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No sent email history yet.</p>
          ) : (
            <div className="space-y-2">
              {sentList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-200">{item.subject}</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      To: {item.recipient} • Sent: {item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SENT
                    </span>
                    {item.previewUrl && (
                      <a
                        href={item.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Elasticsearch Search & Filtering */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Full-text search in subject, body, or recipient..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
            </select>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </form>

          {/* Search Header Status */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>
              Found <strong className="text-white">{searchTotal}</strong> results
            </span>
            <span className="flex items-center space-x-1.5 font-mono text-[11px]">
              <Database className="w-3 h-3 text-indigo-400" />
              <span>Source: {searchSource === 'elasticsearch' ? 'Elasticsearch 8 Cluster' : 'Database Fallback'}</span>
            </span>
          </div>

          {/* Search Results List */}
          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No matching emails found.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="max-w-lg">
                    <div className="font-medium text-slate-200">{item.subject}</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      To: {item.recipient} • Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                    </div>
                    {item.body && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-sans">{item.body}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : item.status === 'PROCESSING'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.previewUrl && (
                      <a
                        href={item.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
