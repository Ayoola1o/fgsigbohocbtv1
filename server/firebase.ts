import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, Timestamp } from "firebase/firestore";
import "dotenv/config";

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

// Validate environment parameters
if (!firebaseConfig.projectId) {
    console.error("⚠️ [firebase.ts] VITE_FIREBASE_PROJECT_ID is not defined in the backend environment!");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

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

// Fetchers for Firestore collections
export const getFirestoreResults = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, "results"));
    return snapshot.docs.map(docToData);
};

export const getFirestoreQuestions = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, "questions"));
    return snapshot.docs.map(docToData);
};

export const getFirestoreExams = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, "exams"));
    return snapshot.docs.map(docToData);
};
