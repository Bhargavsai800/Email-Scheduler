import React from 'react';
import { Mail } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 mb-4 shadow-inner">
        {icon || <Mail className="w-8 h-8 text-slate-500" />}
      </div>
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
