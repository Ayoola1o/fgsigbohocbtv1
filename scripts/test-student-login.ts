
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testStudentLogin() {
    console.log("🧪 Testing Student Login Functionality...");

    // 1. Create a test student
    const testStudent = {
        name: "Test Student",
        studentId: "TEST001",
        classLevel: "SS1",
        createdAt: new Date().toISOString() // Simulating what might be stored
    };

    console.log(`\n➕ Creating test student: ${testStudent.name} (${testStudent.studentId})`);
    const studentsRef = collection(db, "students");
    const docRef = await addDoc(studentsRef, testStudent);
    const createdId = docRef.id;
    console.log(`✅ Student created with ID: ${createdId}`);

    try {
        // 2. Simulate Login (Fetch all and find)
        console.log("\n🔐 Attempting login with correct credentials...");
        const snapshot = await getDocs(studentsRef);
        const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const loggedInUser = students.find(s =>
            s.name.trim().toLowerCase() === testStudent.name.toLowerCase() &&
            s.studentId.trim().toLowerCase() === testStudent.studentId.toLowerCase()
        );

        if (loggedInUser) {
            console.log("✅ Login SUCCESSFUL!");
            console.log("User found:", loggedInUser);
        } else {
            console.error("❌ Login FAILED! User not found.");
        }

        // 3. Simulate Failed Login
        console.log("\n🔐 Attempting login with WRONG credentials...");
        const wrongUser = students.find(s =>
            s.name.trim().toLowerCase() === "Wrong Name" &&
            s.studentId.trim().toLowerCase() === testStudent.studentId.toLowerCase()
        );

        if (!wrongUser) {
            console.log("✅ Login correctly rejected invalid credentials.");
        } else {
            console.error("❌ Login FAILED! Should have rejected invalid credentials.");
        }

    } catch (error) {
        console.error("❌ An error occurred during the test:", error);
    } finally {
        // 4. Cleanup
        console.log(`\n🧹 Cleaning up test student...`);
        await deleteDoc(doc(db, "students", createdId));
        console.log("✅ Cleanup complete.");
    }
}

testStudentLogin();
