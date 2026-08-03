import "dotenv/config";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, Timestamp } from "firebase/firestore";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import {
  students,
  adminUsers,
  exams,
  questions,
  results,
  systemSettings,
  appNotifications,
  type Student,
  type AdminUser,
  type Exam,
  type Question,
  type Result,
  type AppNotification
} from "../shared/schema.js";
import { sql } from "drizzle-orm";

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

// 2. Helper to transform Firestore timestamp/date fields
function toJSDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
}

async function runMigration() {
  console.log("🚀 Starting Firestore -> Postgres Migration Audit & Transfer...");

  // Validate environment
  if (!firebaseConfig.projectId) {
    console.error("❌ Error: Firebase environment variables are missing (projectId required).");
    process.exit(1);
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  let dbPg: any = null;

  if (DATABASE_URL) {
    console.log("🔗 Connecting to Vercel Postgres / Neon DB...");
    const pool = new Pool({ connectionString: DATABASE_URL });
    dbPg = drizzle(pool);
  } else {
    console.log("⚠️ DATABASE_URL not detected in .env; running in DRY-RUN / AUDIT mode.");
  }

  // Initialize Firebase App & Firestore
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const firestoreDb = getFirestore(app);

  const summary = {
    students: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    adminUsers: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    exams: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    questions: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    results: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    systemSettings: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
    appNotifications: { read: 0, inserted: 0, failed: 0, errors: [] as string[] },
  };

  try {
    // --- A. Migrate Students ---
    console.log("\n📦 [1/7] Exporting & Transforming 'students' collection...");
    const studentsSnap = await getDocs(collection(firestoreDb, "students"));
    summary.students.read = studentsSnap.size;

    for (const docSnap of studentsSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<Student> = {
          id: docSnap.id,
          name: data.name || "Unknown Student",
          studentId: data.studentId || docSnap.id,
          classLevel: data.classLevel || "JSS1",
          sex: data.sex || null,
          department: data.department || null,
          blockedExams: Array.isArray(data.blockedExams) ? data.blockedExams : [],
          averageScore: typeof data.averageScore === "number" ? data.averageScore : null,
          academicStanding: data.academicStanding || null,
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
          academicTrajectory: data.academicTrajectory || null,
          diagnosis: data.diagnosis || null,
          actionPlan: Array.isArray(data.actionPlan) ? data.actionPlan : [],
          lastAnalyzed: data.lastAnalyzed || null,
          isTestUser: Boolean(data.isTestUser),
        };

        if (dbPg) {
          await dbPg.insert(students).values(payload).onConflictDoNothing();
        }
        summary.students.inserted++;
      } catch (err: any) {
        summary.students.failed++;
        summary.students.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- B. Migrate Admin Users ---
    console.log("📦 [2/7] Exporting & Transforming 'admin_users' collection...");
    const adminSnap = await getDocs(collection(firestoreDb, "admin_users"));
    summary.adminUsers.read = adminSnap.size;

    for (const docSnap of adminSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<AdminUser> = {
          id: docSnap.id,
          name: data.name || "System Admin",
          email: data.email || "admin@school.edu.ng",
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          role: data.role || "Super Admin",
          theme: data.theme || "system",
          timezone: data.timezone || "Africa/Lagos",
          landingPage: data.landingPage || "/admin",
          twoFactorEnabled: Boolean(data.twoFactorEnabled),
          notificationPreferences: data.notificationPreferences || null,
          activeSessions: Array.isArray(data.activeSessions) ? data.activeSessions : [],
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          createdAt: toJSDate(data.createdAt),
        };

        if (dbPg) {
          await dbPg.insert(adminUsers).values(payload).onConflictDoNothing();
        }
        summary.adminUsers.inserted++;
      } catch (err: any) {
        summary.adminUsers.failed++;
        summary.adminUsers.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- C. Migrate Exams ---
    console.log("📦 [3/7] Exporting & Transforming 'exams' collection...");
    const examsSnap = await getDocs(collection(firestoreDb, "exams"));
    summary.exams.read = examsSnap.size;

    for (const docSnap of examsSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<Exam> = {
          id: docSnap.id,
          title: data.title || "Untitled Exam",
          description: data.description || null,
          subject: data.subject || "General",
          duration: Number(data.duration) || 60,
          totalPoints: Number(data.totalPoints) || 100,
          passingScore: Number(data.passingScore) || 50,
          questionIds: Array.isArray(data.questionIds) ? data.questionIds : [],
          numberOfQuestionsToDisplay: data.numberOfQuestionsToDisplay ? Number(data.numberOfQuestionsToDisplay) : null,
          classLevel: data.classLevel || "JSS1",
          term: data.term || "First Term",
          theoryInstructions: data.theoryInstructions || null,
          examType: data.examType || "Objectives",
          theoryConfig: data.theoryConfig || null,
          subjectConfig: data.subjectConfig || null,
          subjectSlots: Array.isArray(data.subjectSlots) ? data.subjectSlots : null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          enableCalculator: Boolean(data.enableCalculator),
          enableFormulaSheet: Boolean(data.enableFormulaSheet),
          department: data.department || null,
          createdAt: toJSDate(data.createdAt),
        };

        if (dbPg) {
          await dbPg.insert(exams).values(payload).onConflictDoNothing();
        }
        summary.exams.inserted++;
      } catch (err: any) {
        summary.exams.failed++;
        summary.exams.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- D. Migrate Questions ---
    console.log("📦 [4/7] Exporting & Transforming 'questions' collection...");
    const questionsSnap = await getDocs(collection(firestoreDb, "questions"));
    summary.questions.read = questionsSnap.size;

    for (const docSnap of questionsSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<Question> = {
          id: docSnap.id,
          questionText: data.questionText || "Question text missing",
          questionType: data.questionType || "multiple-choice",
          subject: data.subject || "General",
          difficulty: data.difficulty || "medium",
          options: Array.isArray(data.options) ? data.options : [],
          correctAnswer: String(data.correctAnswer || ""),
          points: Number(data.points) || 1,
          classLevel: data.classLevel || "JSS1",
          term: data.term || "First Term",
          examType: data.examType || "Objectives",
          imageUrl: data.imageUrl || null,
          department: data.department || null,
        };

        if (dbPg) {
          await dbPg.insert(questions).values(payload).onConflictDoNothing();
        }
        summary.questions.inserted++;
      } catch (err: any) {
        summary.questions.failed++;
        summary.questions.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- E. Migrate Results ---
    console.log("📦 [5/7] Exporting & Transforming 'results' collection...");
    const resultsSnap = await getDocs(collection(firestoreDb, "results"));
    summary.results.read = resultsSnap.size;

    for (const docSnap of resultsSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<Result> = {
          id: docSnap.id,
          sessionId: data.sessionId || docSnap.id,
          examId: data.examId || "unknown-exam",
          studentName: data.studentName || "Student",
          studentId: data.studentId || "unknown-student",
          score: Number(data.score) || 0,
          totalPoints: Number(data.totalPoints) || 100,
          percentage: Number(data.percentage) || 0,
          passed: Boolean(data.passed),
          submissionType: data.submissionType || "student",
          answers: data.answers || {},
          correctAnswers: data.correctAnswers || {},
          completedAt: toJSDate(data.completedAt),
          isTestAttempt: Boolean(data.isTestAttempt),
        };

        if (dbPg) {
          await dbPg.insert(results).values(payload).onConflictDoNothing();
        }
        summary.results.inserted++;
      } catch (err: any) {
        summary.results.failed++;
        summary.results.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- F. Migrate System Settings ---
    console.log("📦 [6/7] Exporting & Transforming 'system_settings' collection...");
    const settingsSnap = await getDocs(collection(firestoreDb, "system_settings"));
    summary.systemSettings.read = settingsSnap.size;

    for (const docSnap of settingsSnap.docs) {
      const data = docSnap.data();
      try {
        if (dbPg) {
          await dbPg.insert(systemSettings).values({ id: docSnap.id, ...data }).onConflictDoNothing();
        }
        summary.systemSettings.inserted++;
      } catch (err: any) {
        summary.systemSettings.failed++;
        summary.systemSettings.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- G. Migrate Notifications ---
    console.log("📦 [7/7] Exporting & Transforming 'app_notifications' collection...");
    const notifSnap = await getDocs(collection(firestoreDb, "app_notifications"));
    summary.appNotifications.read = notifSnap.size;

    for (const docSnap of notifSnap.docs) {
      const data = docSnap.data();
      try {
        const payload: Partial<AppNotification> = {
          id: docSnap.id,
          targetAdminId: data.targetAdminId || null,
          category: data.category || "system",
          severity: data.severity || "info",
          title: data.title || "Notification",
          message: data.message || "",
          deepLink: data.deepLink || null,
          isRead: Boolean(data.isRead),
          batchId: data.batchId || null,
          createdAt: toJSDate(data.createdAt),
        };

        if (dbPg) {
          await dbPg.insert(appNotifications).values(payload).onConflictDoNothing();
        }
        summary.appNotifications.inserted++;
      } catch (err: any) {
        summary.appNotifications.failed++;
        summary.appNotifications.errors.push(`Doc ${docSnap.id}: ${err.message}`);
      }
    }

    // --- Final Migration Audit Summary ---
    console.log("\n==================================================");
    console.log("📊 FIRESTORE -> POSTGRES MIGRATION SUMMARY REPORT");
    console.log("==================================================");
    console.table({
      "Students": { "Firestore Read": summary.students.read, "Postgres Inserted": summary.students.inserted, "Failed": summary.students.failed },
      "Admin Users": { "Firestore Read": summary.adminUsers.read, "Postgres Inserted": summary.adminUsers.inserted, "Failed": summary.adminUsers.failed },
      "Exams": { "Firestore Read": summary.exams.read, "Postgres Inserted": summary.exams.inserted, "Failed": summary.exams.failed },
      "Questions": { "Firestore Read": summary.questions.read, "Postgres Inserted": summary.questions.inserted, "Failed": summary.questions.failed },
      "Results": { "Firestore Read": summary.results.read, "Postgres Inserted": summary.results.inserted, "Failed": summary.results.failed },
      "System Settings": { "Firestore Read": summary.systemSettings.read, "Postgres Inserted": summary.systemSettings.inserted, "Failed": summary.systemSettings.failed },
      "App Notifications": { "Firestore Read": summary.appNotifications.read, "Postgres Inserted": summary.appNotifications.inserted, "Failed": summary.appNotifications.failed },
    });
    console.log("📌 NOTE: No documents were deleted from Firestore (100% non-destructive copy).");
    console.log("==================================================\n");

  } catch (error) {
    console.error("❌ Migration encountered a top-level error:", error);
  }
}

runMigration().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
