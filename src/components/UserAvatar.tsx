/**
 * UserAvatar — compact avatar chip shown in the navbar when signed in.
 * Shows Google profile photo (or initials), display name, and sync status dot.
 * Clicking opens a dropdown with "Sync Now" and "Sign Out".
 */

import React, { useState, useRef, useEffect } from 'react';
import { LogOut, RefreshCw, CloudOff, Cloud, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGameStore } from '../hooks/useGameStore';
import { pullUserData, pushProgress } from '../services/cloudSyncService';
import type { SyncStatus } from '../services/cloudSyncService';

const SYNC_COLORS: Record<SyncStatus, string> = {
  idle:    'bg-slate-400',
  syncing: 'bg-amber-400 animate-pulse',
  synced:  'bg-emerald-500',
  error:   'bg-rose-500',
  offline: 'bg-slate-400',
};

const SYNC_ICONS: Record<SyncStatus, React.ReactNode> = {
  idle:    <Cloud className="h-3 w-3" />,
  syncing: <Loader2 className="h-3 w-3 animate-spin" />,
  synced:  <Cloud className="h-3 w-3" />,
  error:   <CloudOff className="h-3 w-3" />,
  offline: <CloudOff className="h-3 w-3" />,
};

export const UserAvatar: React.FC = () => {
  const { user, profile, syncStatus, signOut } = useAuth();
  const { progress, settings, achievements, userId } = useGameStore();
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || !profile) return null;

  const initials = profile.displayName
    ? profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleSyncNow = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      await pullUserData(userId);
      pushProgress(userId, {
        progress,
        settings,
        achievements,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Chip */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
        aria-label="User account menu"
      >
        {/* Avatar image or initials */}
        <div className="relative h-7 w-7 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName ?? 'User'} className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
          {/* Sync status dot */}
          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${SYNC_COLORS[syncStatus]}`} />
        </div>
        {/* Name (hidden on mobile) */}
        <span className="hidden sm:block text-xs font-bold text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
          {profile.displayName?.split(' ')[0] ?? 'User'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden">
          {/* Profile header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-black text-slate-800 dark:text-white truncate">{profile.displayName ?? 'User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`h-2 w-2 rounded-full ${SYNC_COLORS[syncStatus]}`} />
              <span className="text-[10px] text-slate-400 capitalize">{syncStatus}</span>
              {SYNC_ICONS[syncStatus]}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
