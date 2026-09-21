import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    'Firebase config is missing required values. Copy .env.example to .env ' +
      'and fill in your Firebase project settings.',
  );
}

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
// Phase 19 (Receipt Management) is the first feature that needs file
// storage — see storage.rules for the per-user access rules that must be
// deployed alongside it.
export const storage = getStorage(firebaseApp);

/**
 * Analytics is intentionally NOT initialized here. `getAnalytics()` eagerly
 * makes network calls to Google's installations/measurement endpoints on
 * app boot, which throws console errors for any user on a restricted
 * network or with an ad/tracker blocker — a bad default for a finance app
 * nobody asked to be tracked by. If analytics is wanted later, initialize
 * it lazily (e.g. behind a settings toggle) using
 * `isSupported()` + `getAnalytics(firebaseApp)` from 'firebase/analytics',
 * with `VITE_FIREBASE_MEASUREMENT_ID` restored to the env config above.
 */
