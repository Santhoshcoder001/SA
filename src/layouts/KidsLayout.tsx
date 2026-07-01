import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useGameStore } from '../hooks/useGameStore';
import { Trophy, Award, Moon, Sun, ArrowLeft, Settings, ShieldAlert, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const KidsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    progress, 
    settings, 
    updateSettings, 
    initializeSystem,
    isLoading,
    error,
    languages,
    activeLanguageId,
    selectLanguage,
    selectSubject
  } = useGameStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize DB and load languages on mount
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  const toggleTheme = () => {
    const currentTheme = settings.theme;
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const selectedLang = languages.find(l => l.id === activeLanguageId);

  const xpPercent = Math.min(100, Math.round((progress.xp / (progress.level * 100)) * 100));

  const showBackButton = location.pathname !== '/' && location.pathname !== '/subjects';

  const handleBack = () => {
    if (location.pathname.startsWith('/subject/')) {
      selectSubject(null);
      navigate('/subjects');
    } else {
      navigate(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-dashed border-sky-500 animate-spin" />
          <h2 className="text-xl font-bold text-sky-600 dark:text-sky-400 animate-bounce">Loading learning world...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full rounded-3xl border-2 border-rose-200 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-400 mb-2">Oops! Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sky-50/30 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b-4 border-sky-100 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 py-3 shadow-md">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-4">
          {/* Logo & Back button */}
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                onClick={handleBack}
                aria-label="Go back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90"
              >
                <ArrowLeft className="h-6 w-6 stroke-[3]" />
              </button>
            ) : (
              <Link to="/subjects" className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-400 text-white shadow-md shadow-sky-500/20 active:scale-95 transition-transform">
                  <Brain className="h-6 w-6" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-black tracking-tight text-indigo-950 dark:text-white flex items-center gap-1.5">
                    Antigravity <span className="text-sky-500 font-bold">Kids</span>
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Learning Hub</p>
                </div>
              </Link>
            )}
          </div>

          {/* Gamification Stats */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
            {/* Level Badge */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 dark:border-indigo-900/50 px-3 py-1.5 dark:bg-indigo-950/20 font-black text-indigo-700 dark:text-indigo-400 shadow-sm text-xs sm:text-sm">
              <Award className="h-4.5 w-4.5" />
              <span>Lv {progress.level}</span>
            </div>

            {/* Stars Count */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-amber-50 border-2 border-amber-200 dark:border-amber-900/50 px-3 py-1.5 dark:bg-amber-950/20 font-black text-amber-600 dark:text-amber-400 shadow-sm text-xs sm:text-sm">
              <Trophy className="h-4.5 w-4.5" />
              <span>{progress.stars}</span>
            </div>

            {/* Coins Count */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-yellow-50 border-2 border-yellow-200 dark:border-yellow-900/50 px-3 py-1.5 dark:bg-yellow-950/20 font-black text-yellow-600 dark:text-yellow-400 shadow-sm text-xs sm:text-sm">
              <span>🪙</span>
              <span>{progress.coins}</span>
            </div>

            {/* Daily Streak */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-orange-50 border-2 border-orange-200 dark:border-orange-900/50 px-3 py-1.5 dark:bg-orange-950/20 font-black text-orange-600 dark:text-orange-400 shadow-sm text-xs sm:text-sm">
              <span>🔥</span>
              <span>{progress.dailyStreak}</span>
            </div>

            {/* Active Language Badge */}
            {selectedLang && (
              <button
                onClick={() => {
                  selectLanguage(null);
                  navigate('/');
                }}
                className="hidden md:flex items-center gap-1.5 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-800 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 dark:bg-slate-900 shadow-sm text-xs font-bold transition-all active:scale-95"
              >
                <span>{selectedLang.flag}</span>
                <span>{selectedLang.name.split(' ')[0]}</span>
              </button>
            )}
          </div>

          {/* Quick Settings Action */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-2xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900 border-2 border-slate-200/50 dark:border-slate-800"
              title="Toggle Theme"
            >
              {settings.theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-2xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900 border-2 border-slate-200/50 dark:border-slate-800"
              title="Open Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <Link
              to="/import"
              className="hidden lg:flex items-center gap-1.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold px-4 py-2 text-xs transition-all shadow-md active:scale-95"
            >
              Import Words
            </Link>
            <Link
              to="/admin"
              className="hidden lg:flex items-center gap-1.5 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold px-4 py-2 text-xs transition-all shadow-md active:scale-95"
            >
              Admin Panel
            </Link>
          </div>
        </div>

        {/* XP Progress Bar below navbar */}
        <div className="mx-auto max-w-6xl px-4 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest shrink-0">XP progress</span>
            <div className="flex-1 bg-slate-200 dark:bg-slate-850 h-3 rounded-full overflow-hidden shadow-inner border border-slate-300/30">
              <motion.div 
                className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">{xpPercent}%</span>
          </div>
        </div>
      </header>

      {/* Main Outlet Grid */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
        <Outlet />
      </main>

      {/* Settings Modal Drawer */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full rounded-3xl border-4 border-indigo-200 bg-white p-6 shadow-2xl dark:border-slate-850 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-lg font-black text-indigo-950 dark:text-white flex items-center gap-1.5">
                  ⚙️ Settings Drawer
                </h3>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="py-4 space-y-4 text-sm font-semibold">
                {/* Sounds Toggles */}
                <div className="flex items-center justify-between">
                  <span>Sound Effects</span>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="w-5 h-5 accent-sky-500 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Text-To-Speech (TTS)</span>
                  <input
                    type="checkbox"
                    checked={settings.ttsEnabled}
                    onChange={(e) => updateSettings({ ttsEnabled: e.target.checked })}
                    className="w-5 h-5 accent-sky-500 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Speech provider config */}
                {settings.ttsEnabled && (
                  <div className="space-y-3 pt-2 border-t border-dashed border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400">TTS Engine Provider</span>
                      <select
                        value={settings.ttsProvider}
                        onChange={(e) => updateSettings({ ttsProvider: e.target.value as 'browser' | 'elevenlabs' })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:bg-slate-800 dark:border-slate-800"
                      >
                        <option value="browser">Browser Native Speech</option>
                        <option value="elevenlabs">ElevenLabs Multilingual API</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400">Pronunciation Speed ({settings.ttsSpeed}x)</span>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={settings.ttsSpeed}
                        onChange={(e) => updateSettings({ ttsSpeed: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Reset Progress button */}
                <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all stars, coins, level, achievements, and statistics?')) {
                        useGameStore.getState().resetProgress();
                        setSettingsOpen(false);
                        navigate('/');
                      }
                    }}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    Reset Profile Progress
                  </button>
                  <Link
                    to="/import"
                    onClick={() => setSettingsOpen(false)}
                    className="lg:hidden w-full text-center bg-teal-500 hover:bg-teal-600 text-white font-bold py-2.5 rounded-2xl transition-all shadow-sm active:scale-95 mb-2"
                  >
                    Import Words
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setSettingsOpen(false)}
                    className="lg:hidden w-full text-center bg-purple-500 hover:bg-purple-600 text-white font-bold py-2.5 rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    Open Admin Panel
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
