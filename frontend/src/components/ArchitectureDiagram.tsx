import React from 'react';
import { ArrowRight, Layout, Server, Database, Zap, Search, Layers, Clock } from 'lucide-react';

export const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Architecture & Data Flow Topology</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Component interaction map for the ReachInbox Email Job Scheduler
          </p>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
          Stage 1: Foundation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Tier 1: Frontend */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Layout className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Frontend UI</span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">React + Vite + Tailwind</h4>
            <p className="text-xs text-slate-400 mt-1">
              Scheduler dashboard, campaign builder, live status monitoring.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-indigo-400">
            Port 5173
          </div>
        </div>

        {/* Tier 2: Backend API */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/30 flex flex-col justify-between ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <Server className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">API Core</span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">Express + TypeScript</h4>
            <p className="text-xs text-slate-400 mt-1">
              REST endpoints, controllers, error handling, worker dispatcher.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-indigo-400">
            Port 5000 | /api
          </div>
        </div>

        {/* Tier 3: Queue & State */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Queue Engine</span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">BullMQ + Redis 7</h4>
            <p className="text-xs text-slate-400 mt-1">
              Delayed job orchestration without cron or interval loops.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-rose-400">
            Port 6379 | Redis AOF
          </div>
        </div>

        {/* Tier 4: Storage & Search */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-sky-400 mb-2">
              <Database className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Persistence</span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">PostgreSQL + ES</h4>
            <p className="text-xs text-slate-400 mt-1">
              Relational metadata with Prisma ORM & indexed search node.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] font-mono text-sky-400">
            Ports 5432 & 9200
          </div>
        </div>
      </div>
    </div>
  );
};
