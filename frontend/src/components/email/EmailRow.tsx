import React from 'react';
import { ScheduledEmail } from '../../types';
import { EmailStatusBadge } from './StatusBadge';
import { ExternalLink, Eye, Mail } from 'lucide-react';

export interface EmailRowProps {
  email: ScheduledEmail;
  onSelect: (email: ScheduledEmail) => void;
  showSentTime?: boolean;
}

export const EmailRow: React.FC<EmailRowProps> = ({
  email,
  onSelect,
  showSentTime = false,
}) => {
  const displayDate = showSentTime && email.sentAt
    ? new Date(email.sentAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : new Date(email.scheduledAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

  return (
    <tr
      onClick={() => onSelect(email)}
      className="group hover:bg-slate-800/40 transition-colors border-b border-slate-800/60 cursor-pointer"
    >
      {/* Recipient */}
      <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-200 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-slate-800 text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <span className="truncate max-w-[200px]" title={email.recipient}>
            {email.recipient}
          </span>
        </div>
      </td>

      {/* Subject */}
      <td className="py-3.5 px-4 text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-slate-100 truncate max-w-[280px]">
            {email.subject}
          </span>
          {email.body && (
            <span className="text-slate-400 truncate max-w-[200px] hidden lg:inline">
              — {email.body}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
        <EmailStatusBadge status={email.status} size="sm" />
      </td>

      {/* Timestamp */}
      <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
        {displayDate}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-xs text-right whitespace-nowrap">
        <div
          className="flex items-center justify-end space-x-2"
          onClick={(e) => e.stopPropagation()}
        >
          {email.previewUrl && (
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Preview in Ethereal Mail"
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onSelect(email)}
            title="Inspect Details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
