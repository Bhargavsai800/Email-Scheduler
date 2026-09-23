import React from 'react';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './features/auth/LoginPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { useHealthCheck } from './features/health/useHealthCheck';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { data, error } = useHealthCheck(15000);
  const { isAuthenticated, isLoading } = useAuth();

  const isHealthy = error ? false : data?.status === 'ok' ? true : data ? false : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header isBackendHealthy={isHealthy} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {isLoading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Verifying user authentication...
            </p>
          </div>
        ) : isAuthenticated ? (
          <DashboardPage />
        ) : (
          <LoginPage />
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        <p>ReachInbox Hiring Assignment • Full-stack Email Job Scheduler</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
