import { initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    Firestore
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const getEnvVar = (key: string) => {
    if (import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return undefined;
};

const firebaseConfig = {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

// Validate config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

console.log("🔥 Firebase Config Debug:", {
    projectId: firebaseConfig.projectId,
    apiKey: firebaseConfig.apiKey ? "Set" : "Missing",
    env: import.meta.env
});

if (missingKeys.length > 0) {
    console.error(`Missing Firebase configuration keys: ${missingKeys.join(', ')}`);
    console.error("Please check your .env file.");
}

if (!firebaseConfig.projectId) {
    throw new Error("Firebase project ID is not defined. Please set VITE_FIREBASE_PROJECT_ID in your environment variables.");
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
let db: Firestore;

try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        })
    });
    console.log("Firestore initialized with offline persistence enabled.");
} catch (error) {
    console.error("Failed to initialize Firestore with offline persistence:", error);
    // Fallback to default initialization if persistence fails
    db = getFirestore(app);
}

let auth: any;

try {
    auth = getAuth(app);
} catch (error) {
    console.warn("Firebase Auth not initialized. This is expected if you haven't enabled Authentication in Firebase Console.", error);
    auth = null;
}

import { getStorage } from "firebase/storage";

// ... existing code ...

const storage = getStorage(app);

export { app, db, auth, storage };
