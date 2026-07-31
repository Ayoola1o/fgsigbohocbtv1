import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import "dotenv/config";

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
    const collections = ["users", "students", "questions", "exams", "exam_sessions", "results"];
    console.log("=== FIRESTORE COLLECTIONS SUMMARY ===");
    for (const name of collections) {
        try {
            const snap = await getDocs(collection(db, name));
            console.log(`Collection '${name}': ${snap.size} documents`);
            if (snap.size > 0 && snap.size <= 5) {
                snap.forEach(doc => {
                    console.log(`  - [${doc.id}]:`, JSON.stringify(doc.data()));
                });
            }
        } catch (err: any) {
            console.error(`Error querying '${name}':`, err.message);
        }
    }
}

checkCollections();
