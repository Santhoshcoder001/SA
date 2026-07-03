/**
 * AuthPage — full-screen Google Sign-In page.
 * Child-friendly, parent-facing design.
 * Route: /auth
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Cloud, Trophy, Star, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AuthPage: React.FC = () => {
  const { isSignedIn, isLoading, isConfigured, signIn, authError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) navigate('/', { replace: true });
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-3xl">
              <Brain className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Antigravity Kids</h1>
          <p className="text-indigo-200 text-sm mt-1 font-semibold">Learning Hub</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: <Cloud className="h-5 w-5 text-sky-500" />, text: 'Your progress syncs across all your devices' },
              { icon: <Trophy className="h-5 w-5 text-amber-500" />, text: 'Never lose your stars, coins, or achievements' },
              { icon: <Star className="h-5 w-5 text-indigo-500" />, text: 'Track your child\'s learning journey anywhere' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">{item.icon}</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Sign-in button */}
          {isConfigured ? (
            <button
              onClick={signIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-extrabold py-4 px-6 rounded-2xl shadow-md transition-all active:scale-95 text-base disabled:opacity-60"
            >
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
              ) : (
                /* Google G logo */
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 text-center space-y-2">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Firebase Not Configured</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Add your Firebase credentials to <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> to enable cloud sync.
              </p>
            </div>
          )}

          {/* Auth error */}
          {authError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-3 text-xs text-rose-600 dark:text-rose-400 font-semibold text-center">
              {authError}
            </div>
          )}

          {/* Continue without account */}
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors font-semibold"
          >
            Continue without signing in →
          </button>
        </div>
      </motion.div>
    </div>
  );
};
