import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance =
      getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseDb(): Database {
  if (!dbInstance) {
    dbInstance = getDatabase(getFirebaseApp());
  }
  return dbInstance;
}

let authPromise: Promise<User> | null = null;

/**
 * Ensures the browser session has a persistent Firebase Anonymous Auth UID.
 * Preserves existing session across page reloads so players retain their seat.
 */
export function ensureAnonymousUser(): Promise<User> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (authPromise) return authPromise;

  authPromise = new Promise<User>((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        unsub();
        if (user) {
          resolve(user);
          return;
        }
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (err) {
          authPromise = null;
          reject(err);
        }
      },
      (err) => {
        unsub();
        authPromise = null;
        reject(err);
      }
    );
  });

  return authPromise;
}
