import React from 'react';
import {
  Clock,
  Send,
  Search,
  MessageSquare,
  Activity,
  PlusCircle,
  Mail,
  Zap,
  Gauge,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { RateLimitTelemetry } from '../../types';

export type NavView = 'scheduled' | 'sent' | 'search' | 'slack' | 'health';

export interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
  rateLimit: RateLimitTelemetry | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onComposeClick,
  scheduledCount,
  sentCount,
  rateLimit,
}) => {
  const navItems: {
    id: NavView;
    label: string;
    icon: React.ReactNode;
    count?: number;
    badgeVariant?: 'amber' | 'emerald' | 'indigo';
  }[] = [
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: <Clock className="w-4 h-4" />,
      count: scheduledCount,
      badgeVariant: 'amber',
    },
    {
      id: 'sent',
      label: 'Sent History',
      icon: <Send className="w-4 h-4" />,
      count: sentCount,
      badgeVariant: 'emerald',
    },
    {
      id: 'search',
      label: 'Search (ES)',
      icon: <Search className="w-4 h-4" />,
    },
    {
      id: 'slack',
      label: 'Slack Alerts',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'health',
      label: 'System Health',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
      {/* Compose Email Action CTA */}
      <button
        type="button"
        onClick={onComposeClick}
        className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 border border-indigo-500/40 transition-all cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Compose Email</span>
      </button>

      {/* Main Navigation Group */}
      <nav className="bg-slate-900/60 border border-slate-800 rounded-2xl p-2.5 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {typeof item.count === 'number' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    item.badgeVariant === 'amber'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bull Board Queues Quick Link */}
      <a
        href="http://localhost:5000/admin/queues"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all group"
      >
        <div className="flex items-center space-x-3">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span>Bull Board Monitor</span>
        </div>
        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
      </a>


      {/* Telemetry / Quota Snapshot Card */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quota & Workers</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">100/hr</span>
        </div>

        {/* Hourly progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Usage this hour</span>
            <span className="font-mono text-slate-300">
              {rateLimit ? `${rateLimit.currentCount} / ${rateLimit.maxLimit}` : '0 / 100'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rateLimit && rateLimit.currentCount >= rateLimit.maxLimit
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
              style={{
                width: `${
                  rateLimit
                    ? Math.min(100, (rateLimit.currentCount / rateLimit.maxLimit) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Workers</span>
          </span>
          <span className="font-mono text-slate-300">
            {rateLimit?.workerConcurrency || 5} active
          </span>
        </div>
      </div>
    </aside>
  );
};
