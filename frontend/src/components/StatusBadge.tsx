import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'unreachable' | 'info' | 'pending';
  text?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  switch (status) {
    case 'healthy':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400"></span>
          {text || 'Healthy'}
        </span>
      );
    case 'unreachable':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-400"></span>
          {text || 'Unreachable'}
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-400 animate-ping"></span>
          {text || 'Pending'}
        </span>
      );
    case 'info':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-indigo-400"></span>
          {text || 'Configured'}
        </span>
      );
  }
};
