import React, { useMemo } from 'react';
import { Mail, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();

  // Parse error query parameter if redirected back with error
  const errorMessage = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error === 'oauth_not_configured') {
      return 'Google OAuth credentials are not configured yet on the backend. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.';
    }
    if (error === 'auth_failed') {
      return 'Google authentication failed or was cancelled. Please try again.';
    }
    if (error) {
      return `Authentication error: ${error}`;
    }
    return null;
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background ambient glow */}
      <div className="absolute inset-0 max-w-lg mx-auto h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Subtle decorative top border highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        {/* Brand & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 ring-1 ring-white/20">
            <Mail className="w-7 h-7 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ReachInbox
            </h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Email scheduling made simple
            </p>
          </div>
        </div>

        {/* Error notification if applicable */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Google OAuth Login Action */}
        <div className="pt-2">
          <button
            id="google-login-btn"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 rounded-xl font-medium text-sm text-slate-900 bg-white hover:bg-slate-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-white/10 active:scale-[0.98] ring-1 ring-slate-200 cursor-pointer"
          >
            {/* Google Colorful Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="font-semibold">Continue with Google</span>
          </button>
        </div>

        {/* Security badge and note */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-xs text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Protected with HTTP-only session cookies & CSRF state</span>
        </div>
      </div>
    </div>
  );
};
