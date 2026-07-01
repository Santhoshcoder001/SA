import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { Award, BookOpen, Brain, Calendar, Moon, Settings, Sun, Trophy, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, activeTab, setActiveTab }) => {
  const { score, streak, stats, settings, updateSettings, gameMode, setGameMode } = useGameState();

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  const completedRatio = stats.totalWords > 0 
    ? Math.round((stats.completedWords / stats.totalWords) * 100) 
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md dark:border-slate-800/50 dark:bg-slate-950/80 transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Logo & Subtitle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/20">
                <Brain className="h-5.5 w-5.5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  தமிழ்வார்த்தை <span className="text-brand-500 font-normal">விளையாட்டு</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tamil Word Arrangement Game</p>
              </div>
            </div>

            {/* Quick Actions for Mobile */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={toggleDarkMode}
                className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                title="Toggle Dark Mode"
              >
                {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                title="Open Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:justify-end">
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-semibold border border-amber-200/30">
              <Trophy className="h-4 w-4" />
              <span className="text-xs text-amber-600/80 dark:text-amber-500/80 font-normal">Score:</span>
              <span className="text-sm font-bold tracking-wide">{score}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 font-semibold border border-orange-200/30">
              <span className="text-sm">🔥</span>
              <span className="text-xs text-orange-600/80 dark:text-orange-500/80 font-normal">Streak:</span>
              <span className="text-sm font-bold tracking-wide">{streak}</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 dark:bg-slate-900/60 border border-slate-200/30 dark:border-slate-800/30">
              <div className="w-16 sm:w-20 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completedRatio}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {stats.completedWords}/{stats.totalWords} ({completedRatio}%)
              </span>
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden items-center gap-1 md:flex">
              <button
                onClick={toggleDarkMode}
                className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
              >
                {settings.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="mt-3.5 flex border-t border-slate-200/40 pt-2 dark:border-slate-800/40">
          <nav className="flex flex-wrap gap-1">
            <button
              onClick={() => {
                setActiveTab('game');
                setGameMode('practice');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'game' && gameMode === 'practice'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              பயிற்சி (Practice)
            </button>

            <button
              onClick={() => {
                setActiveTab('game');
                setGameMode('challenge');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'game' && gameMode === 'challenge'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              தினசரி சவால் (Challenge)
            </button>

            <button
              onClick={() => {
                setActiveTab('game');
                setGameMode('review');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'game' && gameMode === 'review'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              மீள்பார்வை (Review)
            </button>

            <button
              onClick={() => setActiveTab('words')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'words'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              வார்த்தைகள் (Words List)
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'stats'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              புள்ளிவிவரம் (Stats)
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
