/**
 * CloudSyncBanner — shown once after a user signs in.
 * Lets the user choose whether to keep cloud progress or overwrite it with local data.
 */

import React from 'react';
import { Cloud, Smartphone, CheckCircle2 } from 'lucide-react';
import type { UserProgress } from '../types';

interface Props {
  localProgress: UserProgress;
  cloudProgress: UserProgress;
  onKeepCloud: () => void;
  onUseLocal: () => void;
  onDismiss: () => void;
}

function ProgressSnapshot({ progress, label, icon }: { progress: UserProgress; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-black text-slate-700 dark:text-white">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'Level', value: `Lv ${progress.level}` },
          { label: 'XP', value: progress.xp },
          { label: '⭐ Stars', value: progress.stars },
          { label: '🪙 Coins', value: progress.coins },
          { label: '🔥 Streak', value: progress.dailyStreak },
          { label: '✅ Done', value: progress.completedItemIds.length },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col">
            <span className="text-slate-400 text-[10px]">{stat.label}</span>
            <span className="font-black text-slate-800 dark:text-white">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CloudSyncBanner: React.FC<Props> = ({
  localProgress,
  cloudProgress,
  onKeepCloud,
  onUseLocal,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-indigo-200 dark:border-slate-700 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-950/40 p-3 rounded-2xl">
            <Cloud className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Cloud Progress Found</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              We found saved progress in the cloud. Which version would you like to keep?
            </p>
          </div>
        </div>

        {/* Progress comparison */}
        <div className="flex gap-3">
          <ProgressSnapshot
            progress={cloudProgress}
            label="☁️ Cloud"
            icon={<Cloud className="h-4 w-4 text-indigo-500" />}
          />
          <ProgressSnapshot
            progress={localProgress}
            label="📱 This Device"
            icon={<Smartphone className="h-4 w-4 text-slate-500" />}
          />
        </div>

        {/* Note about auto-merge */}
        <div className="flex items-start gap-2 bg-sky-50 dark:bg-sky-950/20 rounded-xl p-3">
          <CheckCircle2 className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-sky-700 dark:text-sky-400">
            Tip: "Keep Cloud" will automatically merge both — you always keep the highest stars, coins, and level from either version.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onKeepCloud}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-2xl transition-all shadow-md active:scale-95 text-sm"
          >
            ☁️ Keep Cloud (Merge)
          </button>
          <button
            onClick={onUseLocal}
            className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-2xl transition-all text-sm"
          >
            📱 Use This Device
          </button>
        </div>

        <button onClick={onDismiss} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1">
          Decide later
        </button>
      </div>
    </div>
  );
};
