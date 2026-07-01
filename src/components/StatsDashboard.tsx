import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { Award, CheckCircle, Percent, AlertCircle, TrendingUp, Flame, Lock } from 'lucide-react';

export const StatsDashboard: React.FC = () => {
  const { stats, achievements } = useGameState();

  const cards = [
    {
      title: 'மொத்த மதிப்பெண் (Total Score)',
      value: stats.totalScore,
      icon: <Award className="h-5 w-5 text-amber-500" />,
      bg: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/5',
      border: 'border-amber-200/50 dark:border-amber-800/30'
    },
    {
      title: 'சரியான சொற்கள் (Solved Words)',
      value: `${stats.completedWords} / ${stats.totalWords}`,
      icon: <CheckCircle className="h-5 w-5 text-success-500" />,
      bg: 'from-success-500/10 to-success-600/5 dark:from-success-500/20 dark:to-success-600/5',
      border: 'border-success-200/50 dark:border-success-800/30'
    },
    {
      title: 'துல்லியம் (Accuracy)',
      value: `${stats.accuracy}%`,
      icon: <Percent className="h-5 w-5 text-brand-500" />,
      bg: 'from-brand-500/10 to-brand-600/5 dark:from-brand-500/20 dark:to-brand-600/5',
      border: 'border-brand-200/50 dark:border-brand-800/30'
    },
    {
      title: 'சிறந்த தொடர் (Best Streak)',
      value: stats.bestStreak,
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      bg: 'from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/5',
      border: 'border-orange-200/50 dark:border-orange-800/30'
    },
    {
      title: 'பிழைகள் (Total Mistakes)',
      value: stats.mistakes,
      icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
      bg: 'from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/5',
      border: 'border-rose-200/50 dark:border-rose-800/30'
    },
    {
      title: 'மொத்த முயற்சிகள் (Total Attempts)',
      value: stats.totalAttempts,
      icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
      bg: 'from-indigo-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:to-indigo-600/5',
      border: 'border-indigo-200/50 dark:border-indigo-800/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
          விளையாட்டு புள்ளிவிவரங்கள் <span className="text-slate-400 font-normal">| Player Statistics</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg} p-4.5 shadow-sm transition-all duration-300 hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className="rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/80 shadow-sm">
                  {card.icon}
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges System */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-850 dark:bg-slate-900/40">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
          சாதனைப் பதக்கங்கள் <span className="text-slate-400 font-normal">| Achievement Badges</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`relative flex items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                ach.unlocked
                  ? 'border-brand-100 bg-brand-50/10 dark:border-brand-950/20 dark:bg-brand-950/5'
                  : 'border-slate-100 bg-slate-50/20 opacity-50 dark:border-slate-800/40 dark:bg-slate-900/10'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm transition-transform duration-300 ${
                  ach.unlocked
                    ? 'bg-gradient-to-tr from-brand-100 to-brand-50 dark:from-brand-900/30 dark:to-brand-950/20 scale-105'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {ach.unlocked ? ach.icon : <Lock className="h-5 w-5 text-slate-400" />}
              </div>

              {/* Details */}
              <div className="min-w-0">
                <h3 className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {ach.title}
                </h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {ach.description}
                </p>
                {ach.unlocked && ach.unlockedAt && (
                  <span className="mt-1.5 block text-[9px] font-medium text-brand-600 dark:text-brand-400">
                    Unlocked: {ach.unlockedAt}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
