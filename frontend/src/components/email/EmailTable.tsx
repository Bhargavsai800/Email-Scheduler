import React, { useState, useMemo } from 'react';
import { ScheduledEmail } from '../../types';
import { EmailRow } from './EmailRow';
import { EmailStatusBadge } from './StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  Mail,
  Calendar,
  Clock,
  Inbox,
} from 'lucide-react';

export interface EmailTableProps {
  emails: ScheduledEmail[];
  isLoading: boolean;
  onSelectEmail: (email: ScheduledEmail) => void;
  title: string;
  subtitle?: string;
  emptyTitle: string;
  emptyDescription: string;
  onRefresh: () => void;
  showSentTime?: boolean;
  onComposeClick?: () => void;
  extraHeaderContent?: React.ReactNode;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  isLoading,
  onSelectEmail,
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  onRefresh,
  showSentTime = false,
  onComposeClick,
  extraHeaderContent,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      const matchesSearch =
        filterQuery.trim() === '' ||
        email.recipient.toLowerCase().includes(filterQuery.toLowerCase()) ||
        email.subject.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (email.body && email.body.toLowerCase().includes(filterQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' || email.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [emails, filterQuery, statusFilter]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {title}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {filteredEmails.length}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Controls: Search, Status Filter, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {extraHeaderContent}

          <div className="w-full sm:w-48">
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter list..."
              icon={<Search className="w-3.5 h-3.5 text-slate-500" />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PROCESSING">Processing</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>

          <button
            onClick={onRefresh}
            title="Refresh list"
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Main Table or Empty State */}
      {filteredEmails.length === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={<Inbox className="w-8 h-8 text-slate-400" />}
            title={emptyTitle}
            description={
              filterQuery
                ? `No emails match your filter "${filterQuery}".`
                : emptyDescription
            }
            action={
              onComposeClick ? (
                <Button variant="primary" size="sm" onClick={onComposeClick}>
                  Schedule an Email
                </Button>
              ) : undefined
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
                  <th className="py-3 px-4">
                    {showSentTime ? 'Sent At' : 'Scheduled Delivery'}
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredEmails.map((email) => (
                  <EmailRow
                    key={email.id}
                    email={email}
                    onSelect={onSelectEmail}
                    showSentTime={showSentTime}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {filteredEmails.map((email) => (
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
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {new Date(
                        showSentTime && email.sentAt
                          ? email.sentAt
                          : email.scheduledAt
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>

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
  );
};
