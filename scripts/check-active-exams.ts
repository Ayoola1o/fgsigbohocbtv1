import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import "dotenv/config";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log(`Connecting to Firestore Project: ${firebaseConfig.projectId}...`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkActiveExams() {
  try {
    const examsRef = collection(db, "exams");
    const snapshot = await getDocs(examsRef);

    if (snapshot.empty) {
      console.log("No exams found in database.");
      return;
    }

    const allExams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeExams = allExams.filter((e: any) => e.isActive === true);

    console.log(`\n==================================================`);
    console.log(`📊 TOTAL EXAMS IN DATABASE: ${allExams.length}`);
    console.log(`✅ CURRENTLY ACTIVE EXAMS: ${activeExams.length}`);
    console.log(`==================================================\n`);

    activeExams.forEach((exam: any, idx) => {
      console.log(`[Active Exam ${idx + 1}]`);
      console.log(`  ID: ${exam.id}`);
      console.log(`  Title: ${exam.title || 'Untitled'}`);
      console.log(`  Class Level: ${exam.classLevel || 'N/A'}`);
      console.log(`  Subject: ${exam.subject || 'N/A'}`);
      console.log(`  Term: ${exam.term || 'N/A'}`);
      console.log(`  Duration: ${exam.duration ? exam.duration + ' mins' : 'N/A'}`);
      console.log(`  Questions: ${exam.questionIds ? exam.questionIds.length : 0}`);
      console.log(`--------------------------------------------------`);
    });
  } catch (error) {
    console.error("Error fetching active exams:", error);
  }
}

checkActiveExams();
