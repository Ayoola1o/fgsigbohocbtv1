import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const getEnvVar = (key: string): string | undefined => {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  if (viteEnv[key]) return viteEnv[key];
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID"),
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const;
export const firebaseConfigured = requiredKeys.every(key => Boolean(firebaseConfig[key]));

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

function requireFirebaseConfig(): void {
  if (firebaseConfigured) return;
  throw new Error("Firebase-only features are unavailable because the VITE_FIREBASE_* settings are not configured.");
}

export function getFirebaseApp(): FirebaseApp {
  requireFirebaseConfig();
  if (!app) app = getApps().find(existing => existing.name === "[DEFAULT]") || initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseDb(): Firestore {
  if (db) return db;
  const firebaseApp = getFirebaseApp();
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalForceLongPolling: true,
    });
  } catch (error) {
    console.warn("Firestore offline persistence is unavailable; using the default Firestore client.", error);
    try {
      db = initializeFirestore(firebaseApp, { experimentalForceLongPolling: true });
    } catch {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(getFirebaseApp());
  return storage;
}
