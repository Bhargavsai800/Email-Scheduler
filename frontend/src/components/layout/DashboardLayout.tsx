import React from 'react';
import { Sidebar, NavView } from './Sidebar';
import { RateLimitTelemetry } from '../../types';

export interface DashboardLayoutProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
  rateLimit: RateLimitTelemetry | null;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentView,
  onSelectView,
  onComposeClick,
  scheduledCount,
  sentCount,
  rateLimit,
  children,
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={onSelectView}
        onComposeClick={onComposeClick}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        rateLimit={rateLimit}
      />

      {/* Main Feature View Area */}
      <div className="flex-1 w-full min-w-0 space-y-6">
        {children}
      </div>
    </div>
  );
};
