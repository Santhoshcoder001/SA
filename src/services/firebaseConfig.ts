/**
 * Firebase project configuration.
 * All values come from VITE_FIREBASE_* environment variables.
 *
 * To configure:
 * 1. Go to https://console.firebase.google.com
 * 2. Create / open your project
 * 3. Project Settings → Your apps → Web app → Copy firebaseConfig
 * 4. Paste the values into your .env file:
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Returns true if all required Firebase env vars are present.
 * When false, the app runs in local-only / guest mode.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
}

let app: FirebaseApp;
let auth: Auth;
let firestoreDb: Firestore;

if (isFirebaseConfigured()) {
  // Avoid re-initializing if already set up (hot-reload safe)
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestoreDb = getFirestore(app);
} else {
  console.warn(
    '[Firebase] VITE_FIREBASE_* environment variables are not set. ' +
    'The app will run in local-only (guest) mode. ' +
    'Cloud sync and sign-in will be disabled.'
  );
}

export { auth, firestoreDb as db };
