/**
 * Firebase Initialization Script
 * 
 * This script creates a default admin user in Firebase.
 * Run with: npm run init-firebase
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import "dotenv/config";

// Load environment variables
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

async function initializeFirebase() {
    console.log("🔥 Initializing Firebase...");

    // Validate config
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("❌ Firebase configuration is missing!");
        console.error("Please create a .env file with your Firebase credentials.");
        console.error("See .env.example for the required variables.");
        process.exit(1);
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log("✅ Firebase initialized");
    console.log(`📦 Project: ${firebaseConfig.projectId}`);

    // Check if admin user already exists
    console.log("\n👤 Checking for existing admin user...");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", "Admin"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        console.log("⚠️  Admin user already exists!");
        console.log("Username: Admin");
        console.log("If you forgot the password, delete the user from Firestore and run this script again.");
        return;
    }

    // Create default admin user
    console.log("➕ Creating default admin user...");
    const adminUser = {
        username: "Admin",
        password: "admin123" // Plain text for simplicity - in production, use proper hashing
    };

    await addDoc(usersRef, adminUser);

    console.log("✅ Admin user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("   Username: Admin");
    console.log("   Password: admin123");
    console.log("\n⚠️  IMPORTANT: Change this password in production!");
    console.log("\n🎉 Firebase setup complete! You can now run the app with: npm run dev");
}

initializeFirebase().catch(error => {
    console.error("❌ Error initializing Firebase:", error);
    process.exit(1);
});
