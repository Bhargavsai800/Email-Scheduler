import React from 'react';
import { Database, Server, Zap, Search, Activity, Cpu } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ServiceCardData } from '../types';

export const ServiceCard: React.FC<ServiceCardData> = ({
  name,
  role,
  technology,
  status,
  latencyMs,
  details,
  iconName,
}) => {
  const getIcon = () => {
    switch (iconName) {
      case 'database':
        return <Database className="w-5 h-5 text-sky-400" />;
      case 'redis':
        return <Zap className="w-5 h-5 text-red-400" />;
      case 'queue':
        return <Activity className="w-5 h-5 text-indigo-400" />;
      case 'search':
        return <Search className="w-5 h-5 text-amber-400" />;
      case 'server':
      default:
        return <Server className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="group relative bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-slate-700/80 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 group-hover:scale-105 transition-transform duration-200">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm tracking-tight">{name}</h3>
            <p className="text-xs text-slate-400">{role}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-mono">{technology}</span>
        {latencyMs !== undefined ? (
          <span className="text-emerald-400 font-mono font-medium">{latencyMs} ms</span>
        ) : (
          <span className="text-slate-500 text-[11px]">Ready</span>
        )}
      </div>

      {details && (
        <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 bg-slate-950/40 p-1.5 rounded border border-slate-800/60 font-mono">
          {details}
        </p>
      )}
    </div>
  );
};
