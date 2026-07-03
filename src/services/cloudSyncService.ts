/**
 * Cloud Sync Service — Firestore-backed progress synchronisation.
 *
 * Sync Strategy:
 * - Local-first: zustand store (localStorage) is the source of truth during a session.
 * - Push on change: every progress update triggers a debounced Firestore write.
 * - Pull on login: on auth, fetches cloud data and merges (optimistic — takes maximum values).
 * - Offline resilient: Firestore SDK queues writes and syncs when reconnected.
 *
 * Scope: syncs UserProgress, Settings, Achievements, QuizHistory, and custom LearningItems.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import type { UserProgress, Settings, Achievement } from '../types';
import type { LearningItem } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

/** Observable sync status — updated by this service */
let _syncStatus: SyncStatus = 'idle';
const _listeners: Array<(s: SyncStatus) => void> = [];

function setSyncStatus(s: SyncStatus) {
  _syncStatus = s;
  _listeners.forEach(fn => fn(s));
}

export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}

export function onSyncStatusChange(fn: (s: SyncStatus) => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx > -1) _listeners.splice(idx, 1);
  };
}

// ─── Firestore document paths ───────────────────────────────────────────────

function userDoc(uid: string) {
  if (!db) throw new Error('Firestore not initialised');
  return doc(db, 'users', uid);
}

function itemsCollection(uid: string) {
  if (!db) throw new Error('Firestore not initialised');
  return collection(db, 'users', uid, 'learningItems');
}

// ─── Debounce helper ─────────────────────────────────────────────────────────

let _pushTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedPush(fn: () => Promise<void>, delayMs = 2000) {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(async () => {
    try {
      await fn();
    } catch (err) {
      console.error('[CloudSync] Push failed:', err);
      setSyncStatus('error');
    }
  }, delayMs);
}

// ─── Push ─────────────────────────────────────────────────────────────────────

export interface CloudPayload {
  progress: UserProgress;
  settings: Settings;
  achievements: Achievement[];
  updatedAt: string;
}

/**
 * Debounced push: writes progress + settings + achievements to Firestore.
 * Call this after every state mutation.
 */
export function pushProgress(uid: string, payload: CloudPayload): void {
  if (!isFirebaseConfigured() || !uid) return;

  setSyncStatus('syncing');
  debouncedPush(async () => {
    await setDoc(userDoc(uid), payload, { merge: true });
    setSyncStatus('synced');
  });
}

/**
 * Immediately writes custom LearningItems for the user to Firestore.
 * Uses batched writes (max 500 per batch).
 */
export async function pushLearningItems(uid: string, items: LearningItem[]): Promise<void> {
  if (!isFirebaseConfigured() || !uid || !db) return;
  setSyncStatus('syncing');

  try {
    // Write in chunks of 500 (Firestore batch limit)
    const CHUNK = 500;
    for (let i = 0; i < items.length; i += CHUNK) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + CHUNK);
      for (const item of chunk) {
        const ref = doc(itemsCollection(uid), item.id);
        batch.set(ref, item);
      }
      await batch.commit();
    }
    setSyncStatus('synced');
  } catch (err) {
    console.error('[CloudSync] pushLearningItems failed:', err);
    setSyncStatus('error');
    throw err;
  }
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

export interface PulledData {
  progress: UserProgress | null;
  settings: Settings | null;
  achievements: Achievement[] | null;
  learningItems: LearningItem[] | null;
  updatedAt: string | null;
}

/**
 * Pulls all cloud data for the user.
 * Returns null fields for documents that don't exist yet (new user).
 */
export async function pullUserData(uid: string): Promise<PulledData> {
  if (!isFirebaseConfigured() || !uid) {
    return { progress: null, settings: null, achievements: null, learningItems: null, updatedAt: null };
  }

  setSyncStatus('syncing');
  try {
    const snap = await getDoc(userDoc(uid));
    const data: DocumentData | undefined = snap.data();

    // Pull custom learning items sub-collection
    let learningItems: LearningItem[] | null = null;
    try {
      const itemsSnap = await getDocs(itemsCollection(uid));
      if (!itemsSnap.empty) {
        learningItems = itemsSnap.docs.map(d => d.data() as LearningItem);
      }
    } catch {
      // Sub-collection might not exist for new users — that's OK
    }

    setSyncStatus('synced');
    return {
      progress:      data?.progress ?? null,
      settings:      data?.settings ?? null,
      achievements:  data?.achievements ?? null,
      learningItems,
      updatedAt:     data?.updatedAt ?? null,
    };
  } catch (err) {
    console.error('[CloudSync] pullUserData failed:', err);
    setSyncStatus('error');
    throw err;
  }
}

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merge strategy: take the higher value for numeric stats,
 * union arrays, prefer cloud for structured objects.
 */
export function mergeProgress(local: UserProgress, cloud: UserProgress): UserProgress {
  return {
    level:        Math.max(local.level, cloud.level),
    xp:           Math.max(local.xp, cloud.xp),
    stars:        Math.max(local.stars, cloud.stars),
    coins:        Math.max(local.coins, cloud.coins),
    dailyStreak:  Math.max(local.dailyStreak, cloud.dailyStreak),
    lastActiveDate: cloud.lastActiveDate || local.lastActiveDate,
    // Union completed item IDs
    completedItemIds: Array.from(new Set([...local.completedItemIds, ...cloud.completedItemIds])),
    unlockedLevels:   Array.from(new Set([...local.unlockedLevels, ...cloud.unlockedLevels])),
    // Merge quiz histories (deduplicate by id)
    quizHistory: mergeById([...local.quizHistory, ...cloud.quizHistory], 'id'),
    // Merge attempts/mistakes — take max per item
    attemptsPerItem: mergeRecordMax(local.attemptsPerItem, cloud.attemptsPerItem),
    mistakesPerItem: mergeRecordMax(local.mistakesPerItem, cloud.mistakesPerItem),
  };
}

function mergeById<T extends { id: string }>(items: T[], _key: 'id'): T[] {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return Array.from(map.values());
}

function mergeRecordMax(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const result = { ...a };
  for (const key of Object.keys(b)) {
    result[key] = Math.max(result[key] ?? 0, b[key]);
  }
  return result;
}
