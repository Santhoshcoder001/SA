/**
 * useAuth — React hook for Firebase authentication state.
 *
 * Returns the signed-in Firebase user (or null for guests), loading state,
 * sign-in/sign-out actions, and the current cloud sync status.
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOutUser,
  onAuthStateChange,
  toUserProfile,
  type UserProfile,
} from '../services/authService';
import {
  getSyncStatus,
  onSyncStatusChange,
  type SyncStatus,
} from '../services/cloudSyncService';
import { isFirebaseConfigured } from '../services/firebaseConfig';

export interface AuthState {
  /** Current Firebase user — null = signed out / guest */
  user: User | null;
  /** Our lightweight UserProfile shape */
  profile: UserProfile | null;
  /** True while the initial auth state is being determined */
  isLoading: boolean;
  /** True when the user is signed in */
  isSignedIn: boolean;
  /** True when Firebase is configured in .env */
  isConfigured: boolean;
  /** Current cloud sync state */
  syncStatus: SyncStatus;
  /** Trigger Google Sign-In popup */
  signIn: () => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Last auth error, if any */
  authError: string | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [authError, setAuthError] = useState<string | null>(null);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChange((u) => {
      setUser(u);
      setIsLoading(false);
    });
    const unsubscribeSync = onSyncStatusChange(setSyncStatus);

    return () => {
      unsubscribeAuth();
      unsubscribeSync();
    };
  }, []);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setAuthError(msg);
      console.error('[useAuth] signIn error:', err);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await signOutUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-out failed';
      setAuthError(msg);
    }
  }, []);

  const profile = user ? toUserProfile(user) : null;

  return {
    user,
    profile,
    isLoading,
    isSignedIn: !!user,
    isConfigured: isFirebaseConfigured(),
    syncStatus,
    signIn,
    signOut,
    authError,
  };
}
