import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const fiacbtConfig = {
    apiKey: "AIzaSyAKHhFUSUhU1GS2_vdhAmfi5TstPgIfis8",
    authDomain: "fiacbt.firebaseapp.com",
    projectId: "fiacbt",
    messagingSenderId: "351492051480",
    appId: "1:351492051480:web:f25bdafcd3cebfcfa7e96d",
    storageBucket: "fiacbt.firebasestorage.app"
};

const app = initializeApp(fiacbtConfig, "fiacbt-app");
const db = getFirestore(app);

async function checkFiacbt() {
    console.log("=== CHECKING FIREBASE PROJECT: fiacbt ===");
    const collections = ["users", "students", "questions", "exams", "exam_sessions", "results"];
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
            console.error(`Error in collection '${name}':`, err.message);
        }
    }
}

checkFiacbt();
