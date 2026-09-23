import React from 'react';
import { ScheduledEmail } from '../../types';
import { Clock, Send, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export interface EmailStatusBadgeProps {
  status: ScheduledEmail['status'];
  size?: 'sm' | 'md';
}

export const EmailStatusBadge: React.FC<EmailStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1 font-medium',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-medium',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  switch (status) {
    case 'SCHEDULED':
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 ${sizeStyles[size]}`}
        >
          <Clock className={`${iconSizes[size]} shrink-0`} />
          <span>Scheduled</span>
        </span>
      );

    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 ${sizeStyles[size]}`}
        >
          <Send className={`${iconSizes[size]} shrink-0 animate-pulse`} />
          <span>Processing</span>
        </span>
      );

    case 'SENT':
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ${sizeStyles[size]}`}
        >
          <CheckCircle2 className={`${iconSizes[size]} shrink-0`} />
          <span>Sent</span>
        </span>
      );

    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/20 ${sizeStyles[size]}`}
        >
          <AlertTriangle className={`${iconSizes[size]} shrink-0`} />
          <span>Failed</span>
        </span>
      );

    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-slate-800 text-slate-400 border-slate-700 ${sizeStyles[size]}`}
        >
          <XCircle className={`${iconSizes[size]} shrink-0`} />
          <span>Cancelled</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center rounded-full border bg-slate-800 text-slate-400 border-slate-700 ${sizeStyles[size]}`}
        >
          <span>{status}</span>
        </span>
      );
  }
};
