
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

console.log("🔍 Diagnostic: Checking Firebase Configuration...");
console.log(`Project ID: ${firebaseConfig.projectId}`);
console.log(`API Key: ${firebaseConfig.apiKey ? "Set (starts with " + firebaseConfig.apiKey.substring(0, 4) + ")" : "Missing"}`);

if (!firebaseConfig.projectId) {
    console.error("❌ Project ID is missing. Check your .env file.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🔄 Attempting to connect to Firestore...");

async function testConnection() {
    try {
        const colRef = collection(db, "test_connection");
        await getDocs(colRef);
        console.log("✅ Connection successful! Firestore is reachable.");
    } catch (error: any) {
        console.error("❌ Connection failed!");
        console.error(`Error Code: ${error.code}`);
        console.error(`Error Message: ${error.message}`);

        if (error.code === 5 || error.message.includes("NOT_FOUND")) {
            console.log("\n💡 DIAGNOSIS: The Firestore database could not be found.");
            console.log("👉 Please go to the Firebase Console:");
            console.log("   1. Open your project: https://console.firebase.google.com/");
            console.log("   2. Go to 'Build' > 'Firestore Database'");
            console.log("   3. Click 'Create database'");
            console.log("   4. Select a location (e.g., nam5 for us-central)");
            console.log("   5. Start in Test mode");
        }
    }
}

testConnection();
