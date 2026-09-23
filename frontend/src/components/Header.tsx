import React from 'react';
import { Mail, Layers, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

interface HeaderProps {
  isBackendHealthy: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({ isBackendHealthy }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                Job Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400">Full-stack Assignment Foundation</p>
          </div>
        </div>

        {/* User Information & Status Indicators */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Health Status */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBackendHealthy === true
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                  : isBackendHealthy === false
                  ? 'bg-amber-400 shadow-sm shadow-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-200">
              {isBackendHealthy === true
                ? 'System Online'
                : isBackendHealthy === false
                ? 'Backend Reachable'
                : 'Connecting...'}
            </span>
          </div>

          {/* Authenticated User Header (Section 20) */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3 pl-2 sm:pl-4 border-l border-slate-800">
              {/* Avatar */}
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="w-9 h-9 rounded-full ring-2 ring-indigo-500/30 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500/30">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
              )}

              {/* Name & Email */}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white tracking-tight leading-none">
                  {user.name || 'ReachInbox User'}
                </div>
                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {user.email}
                </div>
              </div>

              {/* Logout Button */}
              <button
                id="header-logout-btn"
                onClick={logout}
                title="Log out"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-medium transition-all duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Log out</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
