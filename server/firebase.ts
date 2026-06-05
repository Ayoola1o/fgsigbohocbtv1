import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, collection, getDocs, Timestamp, Firestore } from "firebase/firestore";
import "dotenv/config";

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

let db: Firestore | null = null;
let firebaseInitialized = false;

try {
    if (!firebaseConfig.projectId) {
        console.error("⚠️ [firebase.ts] Firebase Project ID is not defined in the backend environment variables!");
    } else {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = initializeFirestore(app, {
            experimentalForceLongPolling: true
        });
        firebaseInitialized = true;
        console.log("🔥 [firebase.ts] Server-side Firebase Firestore initialized successfully with long-polling!");
    }
} catch (error) {
    console.error("❌ [firebase.ts] Failed to initialize Firebase on the backend:", error);
}

// Helper to convert Firestore doc to standard JS data
const docToData = (doc: any): any => {
    const data = doc.data();
    // Convert Firestore Timestamps to JS Dates
    Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key].toDate === 'function') {
            data[key] = data[key].toDate();
        } else if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
    });
    return { id: doc.id, ...data };
};

const ensureDb = (): Firestore => {
    if (!db) {
        throw new Error(
            "Firebase environment variables are missing on the backend. Please add VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID to your Vercel project environment settings."
        );
    }
    return db;
};

// Timeout utility to prevent Firebase queries from hanging when offline/slow
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Firebase request timed out")), timeoutMs)
        )
    ]);
};

// Fetchers for Firestore collections with safety timeout thresholds
export const getFirestoreResults = async (): Promise<any[]> => {
    const database = ensureDb();
    const snapshot = await withTimeout(getDocs(collection(database, "results")), 3000);
    return snapshot.docs.map(docToData);
};

export const getFirestoreQuestions = async (): Promise<any[]> => {
    const database = ensureDb();
    const snapshot = await withTimeout(getDocs(collection(database, "questions")), 3000);
    return snapshot.docs.map(docToData);
};

export const getFirestoreExams = async (): Promise<any[]> => {
    const database = ensureDb();
    const snapshot = await withTimeout(getDocs(collection(database, "exams")), 3000);
    return snapshot.docs.map(docToData);
};

export { db, firebaseInitialized };
