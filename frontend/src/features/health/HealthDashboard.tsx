import React, { useState } from 'react';
import { useHealthCheck } from './useHealthCheck';
import { ServiceCard } from '../../components/ServiceCard';
import { ServiceCardData } from '../../types';
import { RefreshCw, Terminal, CheckCircle2, AlertTriangle, Clock, Server, HardDrive } from 'lucide-react';

export const HealthDashboard: React.FC = () => {
  const { data, loading, error, lastChecked, refetch } = useHealthCheck(15000);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Construct service cards based on health check response
  const services: ServiceCardData[] = [
    {
      name: 'Backend API Service',
      role: 'Express & TypeScript Core',
      technology: data?.system?.nodeVersion ? `Node.js ${data.system.nodeVersion}` : 'Express 4.21',
      status: error ? 'unreachable' : data ? 'healthy' : 'pending',
      details: error || (data ? `Uptime: ${data.uptimeSeconds}s | Env: ${data.environment}` : 'Connecting...'),
      iconName: 'server',
    },
    {
      name: 'PostgreSQL Database',
      role: 'Primary Relational Storage',
      technology: 'Postgres 16 / Prisma ORM',
      status: data?.services.database.status || 'pending',
      latencyMs: data?.services.database.latencyMs,
      details: data?.services.database.error || 'Connection pooling active via PrismaClient',
      iconName: 'database',
    },
    {
      name: 'Redis Cache & Broker',
      role: 'In-Memory Store & State',
      technology: 'Redis 7 / IORedis',
      status: data?.services.redis.status || 'pending',
      latencyMs: data?.services.redis.latencyMs,
      details: data?.services.redis.error || 'AOF persistence & cluster ready',
      iconName: 'redis',
    },
    {
      name: 'BullMQ Queue Engine',
      role: 'Reliable Delayed Job Dispatcher',
      technology: 'BullMQ v5',
      status: data?.services.bullmq.status || 'pending',
      details: data?.services.bullmq.error || `Queue: ${data?.services.bullmq.queueName || 'email-scheduling-queue'}`,
      iconName: 'queue',
    },
    {
      name: 'Elasticsearch Node',
      role: 'Full-text Email Indexing',
      technology: 'Elasticsearch 8.13',
      status: 'info',
      details: 'Docker Compose service configured at port 9200',
      iconName: 'search',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          {error ? (
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-white">
              {error ? 'Backend Connection Notice' : 'System Foundation Health'}
            </h2>
            <p className="text-xs text-slate-400">
              {lastChecked
                ? `Last evaluated: ${lastChecked.toLocaleTimeString()}`
                : 'Evaluating health endpoints...'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>{showRawJson ? 'Hide JSON' : 'View Payload'}</span>
          </button>

          <button
            onClick={refetch}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Pinging...' : 'Ping /api/health'}</span>
          </button>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard key={service.name} {...service} />
        ))}
      </div>

      {/* System Metrics Panel */}
      {data?.system && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>Server Process Telemetry</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Node.js Runtime</span>
              <span className="font-mono font-medium text-slate-200 mt-1 block">
                {data.system.nodeVersion} ({data.system.platform})
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Uptime</span>
              <span className="font-mono font-medium text-slate-200 mt-1 block">
                {data.uptimeSeconds} seconds
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Heap Memory Used</span>
              <span className="font-mono font-medium text-slate-200 mt-1 block">
                {data.system.memoryUsageMB} MB
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Free System Memory</span>
              <span className="font-mono font-medium text-slate-200 mt-1 block">
                {data.system.freeMemoryMB} / {data.system.totalMemoryMB} MB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Raw JSON Viewer */}
      {showRawJson && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
            <span>GET /api/health Response</span>
            <span>Content-Type: application/json</span>
          </div>
          <pre>{JSON.stringify(data || { error }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
