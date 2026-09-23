import React, { useState, useEffect } from 'react';
import { ScheduledEmail } from '../../types';
import { searchEmails } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { EmailRow } from '../../components/email/EmailRow';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Search,
  Database,
  Filter,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Eye,
  Clock,
} from 'lucide-react';
import { EmailStatusBadge } from '../../components/email/StatusBadge';

export interface EmailSearchViewProps {
  onSelectEmail: (email: ScheduledEmail) => void;
}

export const EmailSearchView: React.FC<EmailSearchViewProps> = ({
  onSelectEmail,
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [results, setResults] = useState<ScheduledEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<'elasticsearch' | 'database_fallback'>('elasticsearch');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await searchEmails({
        query: query.trim(),
        status,
        limit: 50,
      });
      setResults(res.data);
      setTotal(res.total);
      setSource(res.source);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial search load
    executeSearch();
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Elasticsearch Email Search
              </h2>
              <p className="text-xs text-slate-400">
                Full-text inverted index queries across subjects, recipients, and message bodies.
              </p>
            </div>
          </div>

          {/* Engine Source Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                source === 'elasticsearch'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                Engine: {source === 'elasticsearch' ? 'Elasticsearch 8' : 'PostgreSQL Fallback'}
              </span>
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={executeSearch} className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by keywords, recipient, subject, or message content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-500" />}
            />
          </div>

          <div className="flex items-center space-x-2.5">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PROCESSING">Processing</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-200">
              Matched Results
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {total}
            </span>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Search className="w-8 h-8 text-slate-500" />}
              title={hasSearched ? 'No matching emails found' : 'Start your search'}
              description={
                query
                  ? `No emails matched your search term "${query}". Try different keywords or status filters.`
                  : 'Type keywords above to search all sent, scheduled, and processing emails.'
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Scheduled / Sent</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {results.map((email) => (
                    <EmailRow
                      key={email.id}
                      email={email}
                      onSelect={onSelectEmail}
                      showSentTime={email.status === 'SENT'}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack */}
            <div className="md:hidden divide-y divide-slate-800/60">
              {results.map((email) => (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className="p-4 hover:bg-slate-800/30 transition-colors space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-100 truncate">
                      {email.recipient}
                    </span>
                    <EmailStatusBadge status={email.status} size="sm" />
                  </div>
                  <div className="text-xs font-medium text-slate-200">
                    {email.subject}
                  </div>
                  {email.body && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {email.body}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                    <span>{new Date(email.scheduledAt).toLocaleTimeString()}</span>
                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {email.previewUrl && (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 font-sans text-xs underline inline-flex items-center space-x-1"
                        >
                          <span>Ethereal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => onSelectEmail(email)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
