/**
 * Authentication service using Firebase Auth (Google Sign-In).
 * Falls back gracefully when Firebase is not configured.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebaseConfig';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
}

type AuthStateCallback = (user: User | null) => void;

const provider = isFirebaseConfigured() ? new GoogleAuthProvider() : null;
if (provider) {
  // Request name and email scopes
  provider.addScope('profile');
  provider.addScope('email');
}

/**
 * Trigger a Google Sign-In popup.
 * Returns the signed-in Firebase User.
 * Throws an error if Firebase is not configured.
 */
export async function signInWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured() || !auth || !provider) {
    throw new Error(
      'Firebase is not configured. Please add VITE_FIREBASE_* environment variables and restart the dev server.'
    );
  }
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured() || !auth) return;
  await firebaseSignOut(auth);
}

/**
 * Subscribe to Firebase auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback: AuthStateCallback): () => void {
  if (!isFirebaseConfigured() || !auth) {
    // No-op: immediately call with null (guest) and return no-op unsubscribe
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Convert a Firebase User to our internal UserProfile shape.
 */
export function toUserProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get the current signed-in Firebase user synchronously.
 * Returns null if not signed in or Firebase is not configured.
 */
export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured() || !auth) return null;
  return auth.currentUser;
}
