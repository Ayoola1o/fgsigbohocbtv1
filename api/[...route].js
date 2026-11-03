var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/firebase.ts
var firebase_exports = {};
__export(firebase_exports, {
  db: () => db2,
  firebaseInitialized: () => firebaseInitialized,
  getFirestoreExams: () => getFirestoreExams,
  getFirestoreQuestions: () => getFirestoreQuestions,
  getFirestoreResults: () => getFirestoreResults,
  getFirestoreSettings: () => getFirestoreSettings,
  saveFirestoreSettings: () => saveFirestoreSettings
});
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import "dotenv/config";
var firebaseConfig, db2, firebaseInitialized, docToData, ensureDb, withTimeout, getFirestoreResults, getFirestoreQuestions, getFirestoreExams, getFirestoreSettings, saveFirestoreSettings;
var init_firebase = __esm({
  "server/firebase.ts"() {
    "use strict";
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
    };
    db2 = null;
    firebaseInitialized = false;
    try {
      if (!firebaseConfig.projectId) {
        console.error("\u26A0\uFE0F [firebase.ts] Firebase Project ID is not defined in the backend environment variables!");
      } else {
        const app2 = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db2 = initializeFirestore(app2, {
          experimentalForceLongPolling: true
        });
        firebaseInitialized = true;
        console.log("\u{1F525} [firebase.ts] Server-side Firebase Firestore initialized successfully with long-polling!");
      }
    } catch (error) {
      console.error("\u274C [firebase.ts] Failed to initialize Firebase on the backend:", error);
    }
    docToData = (doc2) => {
      const data = doc2.data();
      Object.keys(data).forEach((key) => {
        if (data[key] && typeof data[key].toDate === "function") {
          data[key] = data[key].toDate();
        } else if (data[key] instanceof Timestamp) {
          data[key] = data[key].toDate();
        }
      });
      return { id: doc2.id, ...data };
    };
    ensureDb = () => {
      if (!db2) {
        throw new Error(
          "Firebase environment variables are missing on the backend. Please add VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID to your Vercel project environment settings."
        );
      }
      return db2;
    };
    withTimeout = (promise, timeoutMs) => {
      return Promise.race([
        promise,
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Firebase request timed out")), timeoutMs)
        )
      ]);
    };
    getFirestoreResults = async () => {
      const database = ensureDb();
      const snapshot = await withTimeout(getDocs(collection(database, "results")), 3e3);
      return snapshot.docs.map(docToData);
    };
    getFirestoreQuestions = async () => {
      const database = ensureDb();
      const snapshot = await withTimeout(getDocs(collection(database, "questions")), 3e3);
      return snapshot.docs.map(docToData);
    };
    getFirestoreExams = async () => {
      const database = ensureDb();
      const snapshot = await withTimeout(getDocs(collection(database, "exams")), 3e3);
      return snapshot.docs.map(docToData);
    };
    getFirestoreSettings = async () => {
      const database = ensureDb();
      const docRef = doc(database, "settings", "global");
      const docSnap = await withTimeout(getDoc(docRef), 3e3);
      if (docSnap.exists()) {
        return docToData(docSnap);
      }
      return null;
    };
    saveFirestoreSettings = async (settingsData) => {
      const database = ensureDb();
      const docRef = doc(database, "settings", "global");
      await withTimeout(setDoc(docRef, settingsData, { merge: true }), 3e3);
    };
  }
});

// server/app.ts
import express2 from "express";
import session from "express-session";
import compression from "compression";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminUsers: () => adminUsers,
  appNotifications: () => appNotifications,
  classLevels: () => classLevels,
  defaultGradingScale: () => defaultGradingScale,
  defaultNotificationTemplates: () => defaultNotificationTemplates,
  defaultSystemSettings: () => defaultSystemSettings,
  departments: () => departments,
  difficultyLevels: () => difficultyLevels,
  examSessions: () => examSessions,
  examTypeOptions: () => examTypeOptions,
  exams: () => exams,
  insertExamSchema: () => insertExamSchema,
  insertExamSessionSchema: () => insertExamSessionSchema,
  insertQuestionSchema: () => insertQuestionSchema,
  insertResultSchema: () => insertResultSchema,
  insertStudentSchema: () => insertStudentSchema,
  insertUserSchema: () => insertUserSchema,
  notificationCategories: () => notificationCategories,
  notificationSeverities: () => notificationSeverities,
  questionTypes: () => questionTypes,
  questions: () => questions,
  results: () => results,
  students: () => students,
  systemSettings: () => systemSettings,
  systemSettingsSchema: () => systemSettingsSchema,
  termOptions: () => termOptions,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var questionTypes = ["multiple-choice", "true-false", "short-answer", "theory"];
var difficultyLevels = ["easy", "medium", "hard"];
var termOptions = ["First Term", "Second Term", "Third Term", "Others"];
var examTypeOptions = ["Objectives", "Theory"];
var departments = ["Science", "Commercial", "Art", "Others", "General"];
var classLevels = [
  "JSS1",
  "JSS2",
  "JSS3",
  "SS1",
  "SS2",
  "SS3",
  "WAEC",
  "NECO",
  "GCE WAEC",
  "GCE NECO"
];
var questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(),
  subject: text("subject").notNull(),
  difficulty: text("difficulty").notNull(),
  options: jsonb("options").$type(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull().default(1),
  classLevel: text("class_level").notNull(),
  term: text("term").notNull().default("First Term"),
  examType: text("exam_type").notNull().default("Objectives"),
  imageUrl: text("image_url"),
  department: text("department")
});
var insertQuestionSchema = createInsertSchema(questions).omit({
  id: true
}).extend({
  questionType: z.enum(questionTypes),
  difficulty: z.enum(difficultyLevels),
  options: z.array(z.string()).optional(),
  points: z.number().min(1).default(1),
  classLevel: z.enum(classLevels),
  term: z.enum(termOptions).default("First Term"),
  imageUrl: z.string().optional(),
  department: z.string().optional()
});
var exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  duration: integer("duration").notNull(),
  // in minutes
  totalPoints: integer("total_points").notNull(),
  passingScore: integer("passing_score").notNull(),
  questionIds: jsonb("question_ids").$type().notNull(),
  numberOfQuestionsToDisplay: integer("number_of_questions_to_display"),
  classLevel: text("class_level").notNull(),
  term: text("term").notNull().default("First Term"),
  theoryInstructions: text("theory_instructions"),
  examType: text("exam_type").notNull().default("Objectives"),
  theoryConfig: jsonb("theory_config").$type(),
  subjectConfig: jsonb("subject_config").$type(),
  subjectSlots: jsonb("subject_slots").$type(),
  isActive: boolean("is_active").notNull().default(true),
  enableCalculator: boolean("enable_calculator").notNull().default(false),
  enableFormulaSheet: boolean("enable_formula_sheet").notNull().default(false),
  department: text("department"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
  totalPoints: true
}).extend({
  duration: z.number().min(1),
  passingScore: z.number().min(0).max(100),
  theoryInstructions: z.string().optional(),
  questionIds: z.array(z.string()).optional(),
  numberOfQuestionsToDisplay: z.number().optional(),
  classLevel: z.enum(classLevels),
  term: z.enum(termOptions).default("First Term"),
  examType: z.enum(examTypeOptions).default("Objectives"),
  department: z.enum(departments).optional(),
  theoryConfig: z.any().optional(),
  subjectConfig: z.record(z.number()).optional(),
  subjectSlots: z.any().optional(),
  enableCalculator: z.boolean().optional(),
  enableFormulaSheet: z.boolean().optional()
});
var examSessions = pgTable("exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull(),
  studentName: text("student_name").notNull(),
  studentId: text("student_id").notNull(),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  endedAt: timestamp("ended_at"),
  answers: jsonb("answers").$type().notNull().default({}),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  timeRemaining: integer("time_remaining"),
  // in seconds
  sessionQuestionIds: jsonb("session_question_ids").$type(),
  lastSeenAt: timestamp("last_seen_at"),
  tabSwitches: integer("tab_switches").default(0),
  windowBlurs: integer("window_blurs").default(0),
  extendedMinutes: integer("extended_minutes").default(0),
  invigilatorMessage: text("invigilator_message"),
  broadcastMessage: text("broadcast_message"),
  isFlagged: boolean("is_flagged").default(false),
  isTestAttempt: boolean("is_test_attempt").notNull().default(false)
});
var insertExamSessionSchema = createInsertSchema(examSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  isCompleted: true
}).extend({
  answers: z.record(z.string()).default({}),
  currentQuestionIndex: z.number().default(0),
  sessionQuestionIds: z.array(z.string()).optional(),
  isTestAttempt: z.boolean().optional()
});
var results = pgTable("results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  examId: varchar("exam_id").notNull(),
  studentName: text("student_name").notNull(),
  studentId: text("student_id").notNull(),
  score: integer("score").notNull(),
  totalPoints: integer("total_points").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),
  submissionType: text("submission_type"),
  // 'student' or 'auto'
  answers: jsonb("answers").$type().notNull(),
  correctAnswers: jsonb("correct_answers").$type().notNull(),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
  isTestAttempt: boolean("is_test_attempt").notNull().default(false)
});
var insertResultSchema = createInsertSchema(results).omit({
  id: true,
  completedAt: true
}).extend({
  submissionType: z.enum(["student", "auto"]).optional(),
  isTestAttempt: z.boolean().optional()
});
var students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  studentId: text("student_id").notNull().unique(),
  classLevel: text("class_level").notNull(),
  sex: text("sex"),
  department: text("department"),
  blockedExams: jsonb("blocked_exams").$type(),
  averageScore: integer("average_score"),
  academicStanding: text("academic_standing"),
  strengths: jsonb("strengths").$type(),
  weaknesses: jsonb("weaknesses").$type(),
  academicTrajectory: text("academic_trajectory"),
  diagnosis: text("diagnosis"),
  actionPlan: jsonb("action_plan").$type(),
  lastAnalyzed: text("last_analyzed"),
  isTestUser: boolean("is_test_user").notNull().default(false)
});
var insertStudentSchema = createInsertSchema(students).omit({
  id: true
}).extend({
  classLevel: z.enum(classLevels),
  sex: z.enum(["M", "F"]).optional(),
  department: z.enum(departments).optional(),
  blockedExams: z.array(z.string()).optional(),
  averageScore: z.number().optional(),
  academicStanding: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  academicTrajectory: z.string().optional(),
  diagnosis: z.string().optional(),
  actionPlan: z.array(z.string()).optional(),
  lastAnalyzed: z.string().optional(),
  isTestUser: z.boolean().optional()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default("global"),
  schoolName: text("school_name").notNull().default("Faith Immaculate Academy"),
  schoolLogo: text("school_logo"),
  schoolAddress: text("school_address"),
  schoolContact: text("school_contact"),
  currentSession: text("current_session").notNull().default("2025/2026"),
  termStart: text("term_start"),
  termEnd: text("term_end"),
  defaultDuration: integer("default_duration").notNull().default(60),
  defaultGradingScale: jsonb("default_grading_scale").$type(),
  defaultNegativeMarkingEnabled: boolean("default_negative_marking_enabled").notNull().default(false),
  defaultNegativeMarkingValue: integer("default_negative_marking_value").notNull().default(0),
  defaultAttempts: integer("default_attempts").notNull().default(1),
  defaultRandomizationEnabled: boolean("default_randomization_enabled").notNull().default(true),
  resultApprovalRequired: boolean("result_approval_required").notNull().default(false),
  rankingMethod: text("ranking_method").notNull().default("class-wide"),
  omitExamTitles: boolean("omit_exam_titles").notNull().default(false),
  scoreFormat: text("score_format").notNull().default("percentage"),
  showResultButton: boolean("show_result_button").notNull().default(true),
  hideCompleted: boolean("hide_completed").notNull().default(false),
  passingThreshold: integer("passing_threshold").notNull().default(50),
  reportSignature: boolean("report_signature").notNull().default(true),
  schoolMotto: boolean("school_motto").notNull().default(true),
  signaturePrincipal: text("signature_principal"),
  signatureTeacher: text("signature_teacher"),
  signatureOfficer: text("signature_officer"),
  minPasswordLength: integer("min_password_length").notNull().default(6),
  passwordComplexityRequired: boolean("password_complexity_required").notNull().default(false),
  sessionTimeoutAdmin: integer("session_timeout_admin").notNull().default(30),
  sessionTimeoutStudent: integer("session_timeout_student").notNull().default(60),
  twoFactorAdminEnabled: boolean("two_factor_admin_enabled").notNull().default(false),
  ipWhitelist: text("ip_whitelist"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(false),
  smsNotificationsEnabled: boolean("sms_notifications_enabled").notNull().default(false),
  notificationTemplates: jsonb("notification_templates"),
  disconnectGracePeriod: integer("disconnect_grace_period").notNull().default(30),
  heartbeatInterval: integer("heartbeat_interval").notNull().default(10),
  tabSwitchDetectionEnabled: boolean("tab_switch_detection_enabled").notNull().default(true),
  autoSubmitOnExpiryGracePeriod: integer("auto_submit_on_expiry_grace_period").notNull().default(0),
  dataRetentionPeriodDays: integer("data_retention_period_days").notNull().default(365),
  backupFrequency: text("backup_frequency").notNull().default("weekly"),
  testModeEnabled: boolean("test_mode_enabled").notNull().default(false),
  auditLogVerbosity: text("audit_log_verbosity").notNull().default("basic"),
  auditLogRetentionDays: integer("audit_log_retention_days").notNull().default(90),
  auditLogRoles: jsonb("audit_log_roles"),
  analysisMode: text("analysis_mode").notNull().default("automatic"),
  timerWarning: integer("timer_warning").notNull().default(5),
  conceptStrengthThreshold: integer("concept_strength_threshold").notNull().default(70),
  conceptFocusThreshold: integer("concept_focus_threshold").notNull().default(50),
  termWeights: jsonb("term_weights").$type().default({ term1: 33.3, term2: 33.3, term3: 33.4 }),
  departmentSubjectMappings: jsonb("department_subject_mappings").$type().default({
    Science: ["Physics", "Chemistry", "Biology", "Further Mathematics", "Mathematics", "English Language", "Agricultural Science", "Civic Education"],
    Commercial: ["Financial Accounting", "Commerce", "Economics", "Book Keeping", "Office Practice", "Mathematics", "English Language", "Civic Education"],
    Art: ["Government", "Literature in English", "Christian Religious Studies", "Islamic Religious Studies", "History", "Yoruba", "Hausa", "Igbo", "Mathematics", "English Language", "Civic Education"],
    General: ["Mathematics", "English Language", "Civic Education"]
  })
});
var defaultGradingScale = [
  { grade: "A", minScore: 75, maxScore: 100 },
  { grade: "B", minScore: 60, maxScore: 74 },
  { grade: "C", minScore: 50, maxScore: 59 },
  { grade: "D", minScore: 45, maxScore: 49 },
  { grade: "E", minScore: 40, maxScore: 44 },
  { grade: "F", minScore: 0, maxScore: 39 }
];
var defaultNotificationTemplates = {
  examPublished: "A new examination '{examTitle}' has been scheduled for {classLevel}. Duration: {duration} minutes.",
  resultsReleased: "Results for '{examTitle}' are now available. Log in to your portal to view your scorecard.",
  accountCreated: "Welcome to Faith Immaculate Academy CBT Portal. Your Student ID is {studentId}."
};
var defaultSystemSettings = {
  schoolName: "Faith Immaculate Academy",
  schoolLogo: "",
  schoolAddress: "123 Academy Way, Faith City",
  schoolContact: "+234 800 123 4567",
  currentSession: "2025/2026",
  termStart: "",
  termEnd: "",
  defaultDuration: 60,
  defaultGradingScale,
  defaultNegativeMarkingEnabled: false,
  defaultNegativeMarkingValue: 0,
  defaultAttempts: 1,
  defaultRandomizationEnabled: true,
  resultApprovalRequired: false,
  rankingMethod: "class-wide",
  omitExamTitles: false,
  scoreFormat: "percentage",
  showResultButton: true,
  hideCompleted: false,
  passingThreshold: 50,
  reportSignature: true,
  schoolMotto: true,
  signaturePrincipal: "",
  signatureTeacher: "",
  signatureOfficer: "",
  minPasswordLength: 6,
  passwordComplexityRequired: false,
  sessionTimeoutAdmin: 30,
  sessionTimeoutStudent: 60,
  twoFactorAdminEnabled: false,
  ipWhitelist: "",
  emailNotificationsEnabled: false,
  smsNotificationsEnabled: false,
  notificationTemplates: defaultNotificationTemplates,
  disconnectGracePeriod: 30,
  heartbeatInterval: 10,
  tabSwitchDetectionEnabled: true,
  autoSubmitOnExpiryGracePeriod: 0,
  dataRetentionPeriodDays: 365,
  backupFrequency: "weekly",
  testModeEnabled: false,
  auditLogVerbosity: "basic",
  auditLogRetentionDays: 90,
  auditLogRoles: ["Admin", "SuperAdmin"],
  analysisMode: "automatic",
  timerWarning: 5,
  conceptStrengthThreshold: 70,
  conceptFocusThreshold: 50,
  termWeights: { term1: 33.3, term2: 33.3, term3: 33.4 },
  departmentSubjectMappings: {
    Science: ["Physics", "Chemistry", "Biology", "Further Mathematics", "Mathematics", "English Language", "Agricultural Science", "Civic Education"],
    Commercial: ["Financial Accounting", "Commerce", "Economics", "Book Keeping", "Office Practice", "Mathematics", "English Language", "Civic Education"],
    Art: ["Government", "Literature in English", "Christian Religious Studies", "Islamic Religious Studies", "History", "Yoruba", "Hausa", "Igbo", "Mathematics", "English Language", "Civic Education"],
    General: ["Mathematics", "English Language", "Civic Education"]
  }
};
var systemSettingsSchema = z.object({
  schoolName: z.string().min(1, "School Name is required").default(defaultSystemSettings.schoolName),
  schoolLogo: z.string().optional().default(defaultSystemSettings.schoolLogo),
  schoolAddress: z.string().optional().default(defaultSystemSettings.schoolAddress),
  schoolContact: z.string().optional().default(defaultSystemSettings.schoolContact),
  currentSession: z.string().min(1, "Current Session is required").default(defaultSystemSettings.currentSession),
  termStart: z.string().optional().default(defaultSystemSettings.termStart),
  termEnd: z.string().optional().default(defaultSystemSettings.termEnd),
  defaultDuration: z.number().min(1, "Default duration must be at least 1 minute").default(defaultSystemSettings.defaultDuration),
  defaultGradingScale: z.array(z.object({
    grade: z.string(),
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100)
  })).default(defaultSystemSettings.defaultGradingScale),
  defaultNegativeMarkingEnabled: z.boolean().default(defaultSystemSettings.defaultNegativeMarkingEnabled),
  defaultNegativeMarkingValue: z.number().min(0).default(defaultSystemSettings.defaultNegativeMarkingValue),
  defaultAttempts: z.number().min(1, "Default attempts must be at least 1").default(defaultSystemSettings.defaultAttempts),
  defaultRandomizationEnabled: z.boolean().default(defaultSystemSettings.defaultRandomizationEnabled),
  resultApprovalRequired: z.boolean().default(defaultSystemSettings.resultApprovalRequired),
  rankingMethod: z.enum(["class-wide", "subject-wide"]).default(defaultSystemSettings.rankingMethod),
  omitExamTitles: z.boolean().default(defaultSystemSettings.omitExamTitles),
  scoreFormat: z.string().default(defaultSystemSettings.scoreFormat),
  showResultButton: z.boolean().default(defaultSystemSettings.showResultButton),
  hideCompleted: z.boolean().default(defaultSystemSettings.hideCompleted),
  passingThreshold: z.number().min(0).max(100).default(defaultSystemSettings.passingThreshold),
  reportSignature: z.boolean().default(defaultSystemSettings.reportSignature),
  schoolMotto: z.boolean().default(defaultSystemSettings.schoolMotto),
  signaturePrincipal: z.string().optional().default(defaultSystemSettings.signaturePrincipal),
  signatureTeacher: z.string().optional().default(defaultSystemSettings.signatureTeacher),
  signatureOfficer: z.string().optional().default(defaultSystemSettings.signatureOfficer),
  minPasswordLength: z.number().min(4, "Password must be at least 4 characters").default(defaultSystemSettings.minPasswordLength),
  passwordComplexityRequired: z.boolean().default(defaultSystemSettings.passwordComplexityRequired),
  sessionTimeoutAdmin: z.number().min(1, "Timeout must be at least 1 minute").default(defaultSystemSettings.sessionTimeoutAdmin),
  sessionTimeoutStudent: z.number().min(1, "Timeout must be at least 1 minute").default(defaultSystemSettings.sessionTimeoutStudent),
  twoFactorAdminEnabled: z.boolean().default(defaultSystemSettings.twoFactorAdminEnabled),
  ipWhitelist: z.string().optional().default(defaultSystemSettings.ipWhitelist),
  emailNotificationsEnabled: z.boolean().default(defaultSystemSettings.emailNotificationsEnabled),
  smsNotificationsEnabled: z.boolean().default(defaultSystemSettings.smsNotificationsEnabled),
  notificationTemplates: z.record(z.string()).default(defaultSystemSettings.notificationTemplates),
  disconnectGracePeriod: z.number().min(0).default(defaultSystemSettings.disconnectGracePeriod),
  heartbeatInterval: z.number().min(1).default(defaultSystemSettings.heartbeatInterval),
  tabSwitchDetectionEnabled: z.boolean().default(defaultSystemSettings.tabSwitchDetectionEnabled),
  autoSubmitOnExpiryGracePeriod: z.number().min(0).default(defaultSystemSettings.autoSubmitOnExpiryGracePeriod),
  dataRetentionPeriodDays: z.number().min(1).default(defaultSystemSettings.dataRetentionPeriodDays),
  backupFrequency: z.enum(["daily", "weekly", "monthly", "none"]).default(defaultSystemSettings.backupFrequency),
  testModeEnabled: z.boolean().default(defaultSystemSettings.testModeEnabled),
  auditLogVerbosity: z.enum(["basic", "verbose", "debug"]).default(defaultSystemSettings.auditLogVerbosity),
  auditLogRetentionDays: z.number().min(1).default(defaultSystemSettings.auditLogRetentionDays),
  auditLogRoles: z.array(z.string()).default(defaultSystemSettings.auditLogRoles),
  analysisMode: z.string().default(defaultSystemSettings.analysisMode),
  timerWarning: z.number().min(1).max(60).default(defaultSystemSettings.timerWarning),
  conceptStrengthThreshold: z.number().min(1).max(100).default(defaultSystemSettings.conceptStrengthThreshold),
  conceptFocusThreshold: z.number().min(1).max(100).default(defaultSystemSettings.conceptFocusThreshold),
  termWeights: z.object({
    term1: z.number().min(0).max(100),
    term2: z.number().min(0).max(100),
    term3: z.number().min(0).max(100)
  }).default(defaultSystemSettings.termWeights),
  departmentSubjectMappings: z.record(z.array(z.string())).default(defaultSystemSettings.departmentSubjectMappings)
});
var adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("Super Admin"),
  theme: text("theme").notNull().default("system"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  landingPage: text("landing_page").notNull().default("/admin"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  notificationPreferences: jsonb("notification_preferences").$type(),
  activeSessions: jsonb("active_sessions").$type(),
  permissions: jsonb("permissions").$type(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var notificationCategories = ["results", "cheating", "questions", "messages", "exams", "system"];
var notificationSeverities = ["urgent", "important", "info"];
var appNotifications = pgTable("app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetAdminId: text("target_admin_id"),
  // null = broadcast to all admins
  category: text("category").notNull(),
  // 'results' | 'cheating' | 'questions' | 'messages' | 'exams' | 'system'
  severity: text("severity").notNull().default("info"),
  // 'urgent' | 'important' | 'info'
  title: text("title").notNull(),
  message: text("message").notNull(),
  deepLink: text("deep_link"),
  isRead: boolean("is_read").notNull().default(false),
  batchId: text("batch_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});

// server/storage.ts
import { eq, inArray, and, desc } from "drizzle-orm";

// server/db.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 3e4
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
var MemStorage = class {
  questions;
  exams;
  examSessions;
  results;
  users;
  students;
  systemSettings;
  constructor() {
    this.questions = /* @__PURE__ */ new Map();
    this.exams = /* @__PURE__ */ new Map();
    this.examSessions = /* @__PURE__ */ new Map();
    this.results = /* @__PURE__ */ new Map();
    this.users = /* @__PURE__ */ new Map();
    this.students = /* @__PURE__ */ new Map();
    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
    let dataDir = isProd ? path.join("/tmp") : path.join(process.cwd(), "server", "data");
    try {
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (err) {
          console.warn(`Failed to create data dir at ${dataDir}, falling back to /tmp`);
          dataDir = "/tmp";
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      const file = path.join(dataDir, "students.json");
      if (fs.existsSync(file)) {
        const txt = fs.readFileSync(file, "utf8");
        const arr = JSON.parse(txt);
        for (const s of arr || []) this.students.set(s.id, s);
      }
    } catch (e) {
    }
    try {
      const settingsFile = path.join(dataDir, "settings.json");
      if (fs.existsSync(settingsFile)) {
        const txt = fs.readFileSync(settingsFile, "utf8");
        const parsed = JSON.parse(txt);
        this.systemSettings = { ...defaultSystemSettings, ...parsed };
      } else {
        this.systemSettings = { ...defaultSystemSettings };
      }
    } catch (e) {
      this.systemSettings = { ...defaultSystemSettings };
    }
    const adminId = "admin-id";
    this.users.set(adminId, {
      id: adminId,
      username: "Admin",
      password: "admin"
    });
  }
  // Questions
  async getQuestions() {
    return Array.from(this.questions.values());
  }
  async getStudentByStudentId(studentId) {
    return Array.from(this.students.values()).find((s) => s.studentId === studentId);
  }
  async getStudentById(id) {
    return this.students.get(id);
  }
  async getQuestion(id) {
    return this.questions.get(id);
  }
  async getQuestionsByIds(ids) {
    const questions2 = [];
    for (const id of ids) {
      const question = this.questions.get(id);
      if (question) {
        questions2.push(question);
      }
    }
    return questions2;
  }
  async createQuestion(insertQuestion) {
    const id = randomUUID();
    const question = {
      id,
      questionText: insertQuestion.questionText,
      questionType: insertQuestion.questionType,
      subject: insertQuestion.subject,
      difficulty: insertQuestion.difficulty,
      options: insertQuestion.options ?? null,
      correctAnswer: insertQuestion.correctAnswer,
      points: insertQuestion.points,
      classLevel: insertQuestion.classLevel ?? null,
      term: insertQuestion.term ?? "First Term",
      examType: insertQuestion.examType ?? "Objectives",
      imageUrl: insertQuestion.imageUrl ?? null,
      // department may be optional on the insert schema
      department: insertQuestion.department ?? null
    };
    this.questions.set(id, question);
    return question;
  }
  // Bulk create questions (useful for imports)
  async createQuestions(insertQuestions) {
    const out = [];
    for (const q of insertQuestions) {
      const created = await this.createQuestion(q);
      out.push(created);
    }
    return out;
  }
  async updateQuestion(id, data) {
    const q = this.questions.get(id);
    if (!q) return void 0;
    const updated = { ...q, ...data };
    this.questions.set(id, updated);
    return updated;
  }
  async updateQuestions(ids, updates) {
    for (const id of ids) {
      await this.updateQuestion(id, updates);
    }
  }
  async deleteQuestion(id) {
    this.questions.delete(id);
  }
  async deleteQuestions(ids) {
    for (const id of ids) {
      this.questions.delete(id);
    }
  }
  // Exams
  async getExams(classLevel) {
    let allExams = Array.from(this.exams.values());
    if (classLevel) {
      allExams = allExams.filter((exam) => exam.classLevel === classLevel);
    }
    return allExams;
  }
  async getExam(id) {
    return this.exams.get(id);
  }
  async createExam(insertExam) {
    const id = randomUUID();
    let totalPoints = 0;
    for (const questionId of insertExam.questionIds || []) {
      const question = await this.getQuestion(questionId);
      if (question) {
        totalPoints += question.points;
      }
    }
    const exam = {
      id,
      title: insertExam.title,
      description: insertExam.description ?? null,
      subject: insertExam.subject,
      duration: insertExam.duration,
      totalPoints,
      passingScore: insertExam.passingScore,
      questionIds: insertExam.questionIds || [],
      numberOfQuestionsToDisplay: insertExam.numberOfQuestionsToDisplay ?? null,
      classLevel: insertExam.classLevel ?? null,
      term: insertExam.term ?? "First Term",
      theoryInstructions: insertExam.theoryInstructions ?? null,
      examType: insertExam.examType ?? "Objectives",
      theoryConfig: insertExam.theoryConfig ?? null,
      subjectConfig: insertExam.subjectConfig ?? null,
      subjectSlots: insertExam.subjectSlots ?? null,
      isActive: true,
      enableCalculator: insertExam.enableCalculator ?? false,
      enableFormulaSheet: insertExam.enableFormulaSheet ?? false,
      department: insertExam.department ?? null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.exams.set(id, exam);
    return exam;
  }
  async updateExam(id, data) {
    const exam = this.exams.get(id);
    if (!exam) return void 0;
    const updatedExam = { ...exam, ...data };
    this.exams.set(id, updatedExam);
    return updatedExam;
  }
  async deleteExam(id) {
    this.exams.delete(id);
  }
  // Exam Sessions
  async getExamSessions() {
    return Array.from(this.examSessions.values());
  }
  async getExamSession(id) {
    return this.examSessions.get(id);
  }
  async createExamSession(insertSession) {
    const id = randomUUID();
    const session2 = {
      ...insertSession,
      id,
      startedAt: /* @__PURE__ */ new Date(),
      endedAt: null,
      answers: insertSession.answers || {},
      currentQuestionIndex: insertSession.currentQuestionIndex || 0,
      sessionQuestionIds: insertSession.sessionQuestionIds || [],
      isCompleted: false,
      timeRemaining: null,
      lastSeenAt: /* @__PURE__ */ new Date(),
      tabSwitches: 0,
      windowBlurs: 0,
      extendedMinutes: 0,
      invigilatorMessage: null,
      broadcastMessage: null,
      isFlagged: false,
      isTestAttempt: insertSession.isTestAttempt || false
    };
    this.examSessions.set(id, session2);
    return session2;
  }
  async updateExamSession(id, data) {
    const session2 = this.examSessions.get(id);
    if (!session2) return void 0;
    const updatedSession = { ...session2, ...data };
    this.examSessions.set(id, updatedSession);
    return updatedSession;
  }
  async deleteExamSession(id) {
    this.examSessions.delete(id);
  }
  // Results
  async getResults() {
    return Array.from(this.results.values());
  }
  async getResult(id) {
    return this.results.get(id);
  }
  async getResultBySessionId(sessionId) {
    return Array.from(this.results.values()).find(
      (result) => result.sessionId === sessionId
    );
  }
  async createResult(insertResult) {
    const id = randomUUID();
    const result = {
      ...insertResult,
      id,
      submissionType: insertResult.submissionType ?? null,
      completedAt: /* @__PURE__ */ new Date(),
      isTestAttempt: insertResult.isTestAttempt || false
    };
    this.results.set(id, result);
    return result;
  }
  async deleteResult(id) {
    this.results.delete(id);
  }
  async deleteResults(ids) {
    for (const id of ids) {
      this.results.delete(id);
    }
  }
  // Users
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((u) => u.username.toLowerCase() === username.toLowerCase());
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Students
  async getStudents() {
    return Array.from(this.students.values());
  }
  async createStudent(insertStudent) {
    const existing = Array.from(this.students.values()).find((s) => s.studentId === insertStudent.studentId);
    if (existing) {
      throw new Error(`Student ID '${insertStudent.studentId}' already exists`);
    }
    const id = randomUUID();
    const student = {
      id,
      name: insertStudent.name,
      studentId: insertStudent.studentId,
      classLevel: insertStudent.classLevel,
      sex: insertStudent.sex || null,
      department: insertStudent.department || null,
      blockedExams: insertStudent.blockedExams || null,
      averageScore: insertStudent.averageScore || null,
      academicStanding: insertStudent.academicStanding || null,
      strengths: insertStudent.strengths || null,
      weaknesses: insertStudent.weaknesses || null,
      academicTrajectory: insertStudent.academicTrajectory || null,
      diagnosis: insertStudent.diagnosis || null,
      actionPlan: insertStudent.actionPlan || null,
      lastAnalyzed: insertStudent.lastAnalyzed || null,
      isTestUser: insertStudent.isTestUser || false
    };
    this.students.set(id, student);
    this.saveStudentsToDisk();
    return student;
  }
  async createStudents(insertStudents) {
    const out = [];
    for (const s of insertStudents) {
      try {
        const created = await this.createStudent(s);
        out.push(created);
      } catch (e) {
      }
    }
    this.saveStudentsToDisk();
    return out;
  }
  async updateStudent(id, data) {
    const existing = this.students.get(id);
    if (!existing) return void 0;
    if (data.studentId && data.studentId !== existing.studentId) {
      const duplicate = Array.from(this.students.values()).find((s) => s.studentId === data.studentId);
      if (duplicate) {
        throw new Error(`Student ID '${data.studentId}' already exists`);
      }
    }
    const updated = { ...existing, ...data };
    this.students.set(id, updated);
    this.saveStudentsToDisk();
    return updated;
  }
  async deleteStudent(id) {
    this.students.delete(id);
    this.saveStudentsToDisk();
  }
  async toggleStudentExamBlock(studentId, examId, blockState) {
    const student = await this.getStudentByStudentId(studentId) || Array.from(this.students.values()).find((s) => s.id === studentId);
    if (!student) return;
    let blocked = student.blockedExams || [];
    if (blockState) {
      if (!blocked.includes(examId)) blocked = [...blocked, examId];
    } else {
      blocked = blocked.filter((id) => id !== examId);
    }
    student.blockedExams = blocked;
    this.students.set(student.id, student);
    this.saveStudentsToDisk();
  }
  async deleteExamSessionsForStudent(studentId, examId) {
    for (const [id, s] of Array.from(this.examSessions.entries())) {
      if (s.studentId === studentId && s.examId === examId) {
        this.examSessions.delete(id);
      }
    }
  }
  async purgeTestAttempts() {
    this.results.forEach((r, id) => {
      if (r.isTestAttempt === true || r.isTestAttempt === "true") {
        this.results.delete(id);
      }
    });
    this.examSessions.forEach((s, id) => {
      if (s.isTestAttempt === true || s.isTestAttempt === "true") {
        this.examSessions.delete(id);
      }
    });
  }
  saveStudentsToDisk() {
    try {
      const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
      let dataDir = isProd ? path.join("/tmp") : path.join(process.cwd(), "server", "data");
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (e) {
          dataDir = "/tmp";
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      const file = path.join(dataDir, "students.json");
      fs.writeFileSync(file, JSON.stringify(Array.from(this.students.values()), null, 2), "utf8");
    } catch (e) {
    }
  }
  // System Settings Methods
  async getSystemSettings() {
    return this.systemSettings;
  }
  async saveSystemSettings(settings) {
    this.systemSettings = { ...this.systemSettings, ...settings };
    this.saveSettingsToDisk();
    return this.systemSettings;
  }
  saveSettingsToDisk() {
    try {
      const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL;
      let dataDir = isProd ? path.join("/tmp") : path.join(process.cwd(), "server", "data");
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (e) {
          dataDir = "/tmp";
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      const file = path.join(dataDir, "settings.json");
      fs.writeFileSync(file, JSON.stringify(this.systemSettings, null, 2), "utf8");
    } catch (e) {
    }
  }
};
var DatabaseStorage = class {
  resultsCache = null;
  resultsCacheTime = 0;
  resultsInFlight = null;
  studentsCache = null;
  studentsCacheTime = 0;
  studentsInFlight = null;
  examsCache = null;
  examsCacheTime = 0;
  examsInFlight = null;
  examSessionsCache = null;
  examSessionsCacheTime = 0;
  examSessionsInFlight = null;
  questionsCache = null;
  questionsMap = /* @__PURE__ */ new Map();
  questionsCacheTime = 0;
  questionsInFlight = null;
  systemSettingsCache = null;
  async getQuestions() {
    const now = Date.now();
    if (this.questionsCache && now - this.questionsCacheTime < 6e4) {
      return this.questionsCache;
    }
    if (this.questionsInFlight) {
      return this.questionsInFlight;
    }
    this.questionsInFlight = (async () => {
      try {
        const rows = await db.select().from(questions);
        this.questionsCache = rows;
        this.questionsCacheTime = Date.now();
        this.questionsMap = new Map(rows.map((q) => [q.id, q]));
        return rows;
      } finally {
        this.questionsInFlight = null;
      }
    })();
    return this.questionsInFlight;
  }
  async getQuestion(id) {
    if (this.questionsMap.has(id)) {
      return this.questionsMap.get(id);
    }
    if (!this.questionsCache) {
      await this.getQuestions();
      if (this.questionsMap.has(id)) {
        return this.questionsMap.get(id);
      }
    }
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    if (q) {
      this.questionsMap.set(q.id, q);
    }
    return q;
  }
  async getQuestionsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    if (!this.questionsCache) {
      await this.getQuestions();
    }
    const missingIds = [];
    const result = [];
    for (const id of ids) {
      const cached = this.questionsMap.get(id);
      if (cached) {
        result.push(cached);
      } else {
        missingIds.push(id);
      }
    }
    if (missingIds.length > 0) {
      const fetched = await db.select().from(questions).where(inArray(questions.id, missingIds));
      for (const q of fetched) {
        this.questionsMap.set(q.id, q);
        result.push(q);
      }
      if (this.questionsCache) {
        this.questionsCache = [...this.questionsCache, ...fetched];
      }
    }
    const resultMap = new Map(result.map((q) => [q.id, q]));
    return ids.map((id) => resultMap.get(id)).filter(Boolean);
  }
  async createQuestion(question) {
    const [created] = await db.insert(questions).values(question).returning();
    if (created) {
      this.questionsMap.set(created.id, created);
      if (this.questionsCache) {
        this.questionsCache = [...this.questionsCache, created];
      }
    }
    return created;
  }
  async createQuestions(insertQuestions) {
    if (insertQuestions.length === 0) return [];
    const created = await db.insert(questions).values(insertQuestions).returning();
    if (created.length > 0) {
      for (const q of created) {
        this.questionsMap.set(q.id, q);
      }
      if (this.questionsCache) {
        this.questionsCache = [...this.questionsCache, ...created];
      }
    }
    return created;
  }
  async updateQuestion(id, data) {
    const [updated] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    if (updated) {
      this.questionsMap.set(updated.id, updated);
      if (this.questionsCache) {
        this.questionsCache = this.questionsCache.map((q) => q.id === id ? updated : q);
      }
    }
    return updated;
  }
  async updateQuestions(ids, updates) {
    if (ids.length === 0) return;
    await db.update(questions).set(updates).where(inArray(questions.id, ids));
    const idSet = new Set(ids);
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.map((q) => {
        if (idSet.has(q.id)) {
          const updated = { ...q, ...updates };
          this.questionsMap.set(q.id, updated);
          return updated;
        }
        return q;
      });
    }
  }
  async deleteQuestion(id) {
    await db.delete(questions).where(eq(questions.id, id));
    this.questionsMap.delete(id);
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.filter((q) => q.id !== id);
    }
  }
  async deleteQuestions(ids) {
    if (ids.length === 0) return;
    await db.delete(questions).where(inArray(questions.id, ids));
    const idSet = new Set(ids);
    for (const id of ids) {
      this.questionsMap.delete(id);
    }
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.filter((q) => !idSet.has(q.id));
    }
  }
  async getExams(classLevel) {
    const now = Date.now();
    let allExams = this.examsCache;
    if (!allExams || now - this.examsCacheTime >= 6e4) {
      if (this.examsInFlight) {
        allExams = await this.examsInFlight;
      } else {
        this.examsInFlight = (async () => {
          try {
            const rows = await db.select().from(exams);
            this.examsCache = rows;
            this.examsCacheTime = Date.now();
            return rows;
          } finally {
            this.examsInFlight = null;
          }
        })();
        allExams = await this.examsInFlight;
      }
    }
    if (classLevel) {
      return allExams.filter((exam) => exam.classLevel === classLevel);
    }
    return allExams;
  }
  async getExam(id) {
    const all = await this.getExams();
    return all.find((e) => e.id === id);
  }
  async createExam(exam) {
    const [created] = await db.insert(exams).values({ totalPoints: 0, ...exam }).returning();
    if (this.examsCache && created) {
      this.examsCache = [...this.examsCache, created];
    }
    return created;
  }
  async updateExam(id, data) {
    const [updated] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    if (this.examsCache && updated) {
      this.examsCache = this.examsCache.map((e) => e.id === id ? updated : e);
    }
    return updated;
  }
  async deleteExam(id) {
    await db.delete(exams).where(eq(exams.id, id));
    if (this.examsCache) {
      this.examsCache = this.examsCache.filter((e) => e.id !== id);
    }
  }
  async getExamSessions() {
    const now = Date.now();
    if (this.examSessionsCache && now - this.examSessionsCacheTime < 1e4) {
      return this.examSessionsCache;
    }
    if (this.examSessionsInFlight) {
      return this.examSessionsInFlight;
    }
    this.examSessionsInFlight = (async () => {
      try {
        const rows = await db.select().from(examSessions);
        this.examSessionsCache = rows;
        this.examSessionsCacheTime = Date.now();
        return rows;
      } finally {
        this.examSessionsInFlight = null;
      }
    })();
    return this.examSessionsInFlight;
  }
  async getExamSession(id) {
    if (this.examSessionsCache) {
      const cached = this.examSessionsCache.find((s2) => s2.id === id);
      if (cached) return cached;
    }
    const [s] = await db.select().from(examSessions).where(eq(examSessions.id, id));
    return s;
  }
  async createExamSession(session2) {
    const [created] = await db.insert(examSessions).values(session2).returning();
    if (this.examSessionsCache && created) {
      this.examSessionsCache = [...this.examSessionsCache, created];
    }
    return created;
  }
  async updateExamSession(id, data) {
    const [updated] = await db.update(examSessions).set(data).where(eq(examSessions.id, id)).returning();
    if (this.examSessionsCache && updated) {
      this.examSessionsCache = this.examSessionsCache.map((s) => s.id === id ? updated : s);
    }
    return updated;
  }
  async deleteExamSession(id) {
    await db.delete(examSessions).where(eq(examSessions.id, id));
    if (this.examSessionsCache) {
      this.examSessionsCache = this.examSessionsCache.filter((s) => s.id !== id);
    }
  }
  async getResults() {
    const now = Date.now();
    if (this.resultsCache && now - this.resultsCacheTime < 6e4) {
      return this.resultsCache;
    }
    if (this.resultsInFlight) {
      return this.resultsInFlight;
    }
    this.resultsInFlight = (async () => {
      try {
        const rows = await db.select().from(results).orderBy(desc(results.completedAt));
        this.resultsCache = rows;
        this.resultsCacheTime = Date.now();
        return rows;
      } finally {
        this.resultsInFlight = null;
      }
    })();
    return this.resultsInFlight;
  }
  async getResult(id) {
    if (this.resultsCache) {
      const cached = this.resultsCache.find((r2) => r2.id === id);
      if (cached) return cached;
    }
    const [r] = await db.select().from(results).where(eq(results.id, id));
    return r;
  }
  async getResultBySessionId(sessionId) {
    if (this.resultsCache) {
      const cached = this.resultsCache.find((r2) => r2.sessionId === sessionId);
      if (cached) return cached;
    }
    const [r] = await db.select().from(results).where(eq(results.sessionId, sessionId));
    return r;
  }
  async createResult(result) {
    const [created] = await db.insert(results).values(result).returning();
    if (this.resultsCache && created) {
      this.resultsCache = [created, ...this.resultsCache.filter((r) => r.id !== created.id)];
    }
    return created;
  }
  async deleteResult(id) {
    await db.delete(results).where(eq(results.id, id));
    if (this.resultsCache) {
      this.resultsCache = this.resultsCache.filter((r) => r.id !== id);
    }
  }
  async deleteResults(ids) {
    if (ids.length === 0) return;
    await db.delete(results).where(inArray(results.id, ids));
    if (this.resultsCache) {
      const set = new Set(ids);
      this.resultsCache = this.resultsCache.filter((r) => !set.has(r.id));
    }
  }
  async getUserByUsername(username) {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async createUser(user) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async getStudents() {
    const now = Date.now();
    if (this.studentsCache && now - this.studentsCacheTime < 6e4) {
      return this.studentsCache;
    }
    if (this.studentsInFlight) {
      return this.studentsInFlight;
    }
    this.studentsInFlight = (async () => {
      try {
        const rows = await db.select().from(students);
        this.studentsCache = rows;
        this.studentsCacheTime = Date.now();
        return rows;
      } finally {
        this.studentsInFlight = null;
      }
    })();
    return this.studentsInFlight;
  }
  async getStudentByStudentId(studentId) {
    const cleanId = studentId.trim();
    const all = await this.getStudents();
    return all.find((item) => item.studentId.trim().toLowerCase() === cleanId.toLowerCase() || item.id === cleanId);
  }
  async createStudent(student) {
    const [created] = await db.insert(students).values(student).returning();
    if (this.studentsCache && created) {
      this.studentsCache = [...this.studentsCache, created];
    }
    return created;
  }
  async createStudents(insertStudents) {
    if (insertStudents.length === 0) return [];
    const created = await db.insert(students).values(insertStudents).onConflictDoNothing().returning();
    if (this.studentsCache && created.length > 0) {
      this.studentsCache = [...this.studentsCache, ...created];
    }
    return created;
  }
  async updateStudent(id, data) {
    const [updated] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    if (this.studentsCache && updated) {
      this.studentsCache = this.studentsCache.map((s) => s.id === id ? updated : s);
    }
    return updated;
  }
  async deleteStudent(id) {
    await db.delete(students).where(eq(students.id, id));
    if (this.studentsCache) {
      this.studentsCache = this.studentsCache.filter((s) => s.id !== id);
    }
  }
  async toggleStudentExamBlock(studentId, examId, blockState) {
    let student = await this.getStudentByStudentId(studentId);
    let targetId = student?.id;
    if (!student) {
      const [byUuid] = await db.select().from(students).where(eq(students.id, studentId));
      if (!byUuid) return;
      student = byUuid;
      targetId = byUuid.id;
    }
    let blocked = student.blockedExams || [];
    if (blockState) {
      if (!blocked.includes(examId)) blocked = [...blocked, examId];
    } else {
      blocked = blocked.filter((id) => id !== examId);
    }
    await db.update(students).set({ blockedExams: blocked }).where(eq(students.id, targetId));
    if (this.studentsCache) {
      this.studentsCache = this.studentsCache.map((s) => s.id === targetId ? { ...s, blockedExams: blocked } : s);
    }
  }
  async deleteExamSessionsForStudent(studentId, examId) {
    await db.delete(examSessions).where(
      and(
        eq(examSessions.studentId, studentId),
        eq(examSessions.examId, examId)
      )
    );
  }
  async purgeTestAttempts() {
    await db.delete(results).where(eq(results.isTestAttempt, true));
    await db.delete(examSessions).where(eq(examSessions.isTestAttempt, true));
    if (this.resultsCache) {
      this.resultsCache = this.resultsCache.filter((r) => !r.isTestAttempt);
    }
  }
  async getSystemSettings() {
    if (this.systemSettingsCache) {
      return this.systemSettingsCache;
    }
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "global"));
    const finalSettings = settings || defaultSystemSettings;
    this.systemSettingsCache = finalSettings;
    return finalSettings;
  }
  async saveSystemSettings(settings) {
    const existing = await this.getSystemSettings();
    const updated = { ...existing, ...settings };
    await db.insert(systemSettings).values({ id: "global", ...updated }).onConflictDoUpdate({
      target: systemSettings.id,
      set: updated
    });
    this.systemSettingsCache = updated;
    return updated;
  }
};
var storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

// server/routes.ts
import { z as z2 } from "zod";
import multer from "multer";
import path2 from "path";
import express from "express";
import fs3 from "fs";

// server/docx-reader.ts
import fs2 from "fs";
import mammoth from "mammoth";
async function extractTextFromFile(filePath) {
  if (filePath.endsWith(".txt") || filePath.endsWith(".csv")) {
    return fs2.promises.readFile(filePath, "utf8");
  } else if (filePath.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else {
    throw new Error("Unsupported file format. Please upload .txt, .csv or .docx");
  }
}

// server/routes.ts
import { GoogleGenAI } from "@google/genai";

// workers/psychometricWorker.js
function calculatePsychometrics(workerData) {
  const {
    selectedExamId,
    termFilter,
    classFilter,
    subjectFilter,
    studentFilter,
    allResults,
    allQuestions,
    allExams,
    allStudents,
    allExamSessions
  } = workerData;
  const examMap = new Map(allExams.map((e) => [e.id, e]));
  const studentMap = /* @__PURE__ */ new Map();
  allStudents.forEach((s) => {
    if (s.studentId) {
      studentMap.set(s.studentId.toLowerCase().trim(), s);
    }
  });
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
  const sessionMap = new Map((allExamSessions || []).map((s) => [s.id, s]));
  const filteredResults = allResults.filter((r) => {
    const exam = examMap.get(r.examId);
    const student = studentMap.get(r.studentId?.toLowerCase().trim());
    if (studentFilter && studentFilter !== "__all__") {
      const sId = student?.studentId || r.studentId || "";
      if (sId.toLowerCase().trim() !== studentFilter.toLowerCase().trim()) {
        return false;
      }
    }
    if (selectedExamId && selectedExamId !== "__all__" && r.examId !== selectedExamId) {
      return false;
    }
    if (termFilter && termFilter !== "__all__") {
      const examTerm = exam?.term || "First Term";
      if (examTerm !== termFilter) return false;
    }
    if (classFilter && classFilter !== "__all__") {
      const studentClass = student?.classLevel || exam?.classLevel;
      if (studentClass !== classFilter) return false;
    }
    if (subjectFilter && subjectFilter !== "__all__") {
      const examSubject = exam?.subject || "";
      if (!examSubject.includes(subjectFilter)) return false;
    }
    return true;
  });
  const activeQuestions = selectedExamId === "__all__" ? allQuestions.filter((q) => {
    if (classFilter && classFilter !== "__all__" && q.classLevel !== classFilter) return false;
    if (subjectFilter && subjectFilter !== "__all__" && !q.subject.includes(subjectFilter)) return false;
    if (termFilter && termFilter !== "__all__" && q.term !== termFilter) return false;
    return true;
  }) : allQuestions.filter((q) => {
    const activeExam = examMap.get(selectedExamId);
    return activeExam?.questionIds?.includes(q.id);
  });
  const totalCandidates = filteredResults.length;
  const studentPredictions = [];
  let atRiskCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  const resultsByStudent = /* @__PURE__ */ new Map();
  allResults.forEach((r) => {
    if (!r.studentId) return;
    const key = r.studentId.toLowerCase().trim();
    const list = resultsByStudent.get(key) || [];
    list.push(r);
    resultsByStudent.set(key, list);
  });
  const realStudents = (allStudents || []).filter((s) => s.isTestUser !== true && s.isTestUser !== "true");
  realStudents.forEach((student) => {
    if (!student.studentId) return;
    const sKey = student.studentId.toLowerCase().trim();
    const sResults = resultsByStudent.get(sKey) || [];
    const classFilteredResults = classFilter && classFilter !== "__all__" ? sResults.filter((r) => {
      const ex = examMap.get(r.examId);
      return student.classLevel === classFilter || ex?.classLevel === classFilter;
    }) : sResults;
    let historicalAvg = 50;
    let recentAvg = 50;
    let focusFactor = 100;
    if (classFilteredResults.length > 0) {
      const sum = classFilteredResults.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
      historicalAvg = Math.round(sum / classFilteredResults.length);
      const sorted = [...classFilteredResults].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });
      const recent = sorted.slice(0, 3);
      const recentSum = recent.reduce((acc, r) => acc + (Number(r.percentage) || 0), 0);
      recentAvg = Math.round(recentSum / recent.length);
      let totalSwitches = 0;
      let telemetryCount = 0;
      classFilteredResults.forEach((r) => {
        if (r.telemetry && typeof r.telemetry.tabSwitches === "number") {
          totalSwitches += r.telemetry.tabSwitches;
          telemetryCount++;
        }
      });
      const avgSwitches = telemetryCount > 0 ? totalSwitches / telemetryCount : 0;
      focusFactor = Math.max(0, 100 - Math.round(avgSwitches * 10));
    }
    const passProbability = Math.round(historicalAvg * 0.6 + recentAvg * 0.3 + focusFactor * 0.1);
    let status = "Safe";
    if (passProbability < 50) {
      status = "Critical";
      atRiskCount++;
    } else if (passProbability < 70) {
      status = "Warning";
      warningCount++;
    } else {
      safeCount++;
    }
    studentPredictions.push({
      name: student.name,
      studentId: student.studentId,
      classLevel: student.classLevel,
      department: student.department || "General",
      passProbability,
      status,
      historicalAvg,
      recentAvg,
      focusFactor
    });
  });
  const cohortPassProbability = studentPredictions.length > 0 ? Math.round((safeCount + warningCount) / studentPredictions.length * 100) : 0;
  let fatiguedCount = 0;
  const pacingRecords = [];
  filteredResults.forEach((r) => {
    const session2 = sessionMap.get(r.sessionId);
    const exam = examMap.get(r.examId);
    const qIds = session2?.sessionQuestionIds || exam?.questionIds || [];
    if (qIds.length < 4) return;
    const segmentCount = Math.max(1, Math.floor(qIds.length * 0.25));
    const firstQIds = qIds.slice(0, segmentCount);
    const lastQIds = qIds.slice(-segmentCount);
    const checkStats = (targetIds) => {
      let correct = 0;
      let totalTime = 0;
      targetIds.forEach((qId) => {
        if (r.correctAnswers && r.correctAnswers[qId] === true) correct++;
        const t = r.telemetry?.timeSpentPerQuestion?.[qId] || 0;
        totalTime += Number(t);
      });
      return {
        accuracy: Math.round(correct / targetIds.length * 100),
        speed: Math.round(totalTime / targetIds.length * 10) / 10
        // avg seconds per question
      };
    };
    const firstStats = checkStats(firstQIds);
    const lastStats = checkStats(lastQIds);
    const isFatigued = lastStats.accuracy < firstStats.accuracy && lastStats.speed < firstStats.speed;
    if (isFatigued) fatiguedCount++;
    pacingRecords.push({
      studentName: r.studentName,
      studentId: r.studentId,
      examTitle: exam?.title || "Exam",
      classLevel: studentMap.get(r.studentId?.toLowerCase().trim())?.classLevel || exam?.classLevel || "SS3",
      subject: exam?.subject || "General",
      firstAccuracy: firstStats.accuracy,
      firstSpeed: firstStats.speed,
      lastAccuracy: lastStats.accuracy,
      lastSpeed: lastStats.speed,
      isFatigued
    });
  });
  const cognitiveFatigueRate = pacingRecords.length > 0 ? Math.round(fatiguedCount / pacingRecords.length * 100) : 0;
  const collusionPairs = [];
  const studentMaxCollusion = /* @__PURE__ */ new Map();
  const resultsByExamId = /* @__PURE__ */ new Map();
  filteredResults.forEach((r) => {
    const list = resultsByExamId.get(r.examId) || [];
    list.push(r);
    resultsByExamId.set(r.examId, list);
  });
  resultsByExamId.forEach((resultsList, eId) => {
    const examObj = examMap.get(eId);
    if (resultsList.length < 2) return;
    const wrongAnswerMap = /* @__PURE__ */ new Map();
    resultsList.forEach((r) => {
      Object.entries(r.answers || {}).forEach(([qId, ans]) => {
        if (r.correctAnswers?.[qId] === false && ans) {
          const key = `${qId}:${ans.trim().toLowerCase()}`;
          const list = wrongAnswerMap.get(key) || [];
          list.push(r);
          wrongAnswerMap.set(key, list);
        }
      });
    });
    const pairMatches = /* @__PURE__ */ new Map();
    wrongAnswerMap.forEach((candidates) => {
      if (candidates.length < 2) return;
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const A = candidates[i];
          const B = candidates[j];
          const key = A.studentId < B.studentId ? `${A.studentId}|${B.studentId}` : `${B.studentId}|${A.studentId}`;
          const matchObj = pairMatches.get(key) || { A, B, identicalMisses: 0 };
          matchObj.identicalMisses += 1;
          pairMatches.set(key, matchObj);
        }
      }
    });
    pairMatches.forEach(({ A, B, identicalMisses }) => {
      let commonMissedCount = 0;
      if (A.correctAnswers && B.correctAnswers) {
        Object.keys(A.answers || {}).forEach((qId) => {
          if (A.correctAnswers[qId] === false && B.correctAnswers[qId] === false) {
            commonMissedCount++;
          }
        });
      }
      if (commonMissedCount >= 3) {
        const collusionIndex = Math.round(identicalMisses / commonMissedCount * 100) / 100;
        if (collusionIndex >= 0.6) {
          collusionPairs.push({
            studentA: A.studentName,
            studentIdA: A.studentId,
            studentB: B.studentName,
            studentIdB: B.studentId,
            examTitle: examObj?.title || "Exam",
            commonMissedCount,
            identicalMisses,
            index: collusionIndex
          });
          const maxA = studentMaxCollusion.get(A.studentId) || 0;
          if (collusionIndex > maxA) studentMaxCollusion.set(A.studentId, collusionIndex);
          const maxB = studentMaxCollusion.get(B.studentId) || 0;
          if (collusionIndex > maxB) studentMaxCollusion.set(B.studentId, collusionIndex);
        }
      }
    });
  });
  let integrityCriticalCount = 0;
  let integritySuspiciousCount = 0;
  let integritySecureCount = 0;
  const integrityStudentsLog = [];
  filteredResults.forEach((r) => {
    const maxColl = studentMaxCollusion.get(r.studentId) || 0;
    const tabSwitches = r.telemetry?.tabSwitches || 0;
    let rapidGuessCount = 0;
    if (r.telemetry?.timeSpentPerQuestion) {
      Object.entries(r.telemetry.timeSpentPerQuestion).forEach(([qId, timeSec]) => {
        if (r.correctAnswers?.[qId] === true && Number(timeSec) < 2.5) {
          rapidGuessCount++;
        }
      });
    }
    let integrityStatus = "Secure";
    if (maxColl >= 0.75 || tabSwitches >= 6 || rapidGuessCount >= 5) {
      integrityStatus = "Critical";
      integrityCriticalCount++;
    } else if (maxColl >= 0.6 || tabSwitches >= 3 || rapidGuessCount >= 2) {
      integrityStatus = "Suspicious";
      integritySuspiciousCount++;
    } else {
      integritySecureCount++;
    }
    const timeline = [];
    timeline.push({ time: "0:00", event: "Session initialized successfully", type: "info" });
    if (tabSwitches > 0) {
      for (let i = 1; i <= tabSwitches; i++) {
        timeline.push({
          time: `${Math.min(i * 3, 20)}:15`,
          event: `Screen blur / Window tab switch detected (Flag #${i})`,
          type: "warning"
        });
      }
    }
    if (rapidGuessCount > 0) {
      timeline.push({
        time: "15:40",
        event: `${rapidGuessCount} question(s) answered in <2.5s (Rapid Guessing Flag)`,
        type: "danger"
      });
    }
    if (maxColl >= 0.6) {
      timeline.push({
        time: "Post-Submission",
        event: `Answer collusion flagged (Index: ${Math.round(maxColl * 100)}% choice similarity)`,
        type: "danger"
      });
    }
    timeline.push({ time: "Graded", event: `Exam completed. Score: ${r.percentage}%`, type: "success" });
    integrityStudentsLog.push({
      studentName: r.studentName,
      studentId: r.studentId,
      examId: r.examId,
      examTitle: examMap.get(r.examId)?.title || "Exam",
      tabSwitches,
      rapidGuesses: rapidGuessCount,
      maxCollusion: maxColl,
      status: integrityStatus,
      timeline
    });
  });
  let mean = 0;
  let stdDev = 0;
  let skewness = 0;
  const bellCurvePoints = [];
  const histogramBuckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count: 0
  }));
  if (totalCandidates > 0) {
    const percentages = filteredResults.map((r) => Number(r.percentage) || 0);
    const sum = percentages.reduce((acc, p) => acc + p, 0);
    mean = sum / totalCandidates;
    const sqDiffSum = percentages.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0);
    stdDev = Math.sqrt(sqDiffSum / totalCandidates);
    let cubedDiffSum = percentages.reduce((acc, p) => acc + Math.pow(p - mean, 3), 0);
    skewness = stdDev > 0 ? cubedDiffSum / totalCandidates / Math.pow(stdDev, 3) : 0;
    percentages.forEach((p) => {
      const bucketIdx = Math.min(Math.floor(p / 10), 9);
      histogramBuckets[bucketIdx].count++;
    });
    for (let x = 0; x <= 100; x += 5) {
      let density = 0;
      if (stdDev > 0) {
        density = 1 / (stdDev * Math.sqrt(2 * Math.PI)) * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
      } else if (Math.round(mean) === x) {
        density = 1;
      }
      bellCurvePoints.push({ score: x, density: Math.round(density * 1e5) / 1e5 });
    }
  }
  const answersByQuestion = /* @__PURE__ */ new Map();
  const correctByQuestion = /* @__PURE__ */ new Map();
  filteredResults.forEach((r) => {
    if (r.answers) {
      Object.entries(r.answers).forEach(([qId, choice]) => {
        const list = answersByQuestion.get(qId) || [];
        list.push(choice);
        answersByQuestion.set(qId, list);
      });
    }
    if (r.correctAnswers) {
      Object.entries(r.correctAnswers).forEach(([qId, isCorrect]) => {
        const list = correctByQuestion.get(qId) || [];
        list.push(isCorrect === true);
        correctByQuestion.set(qId, list);
      });
    }
  });
  let cronbachAlpha = 0.7;
  if (activeQuestions.length > 1 && totalCandidates > 2) {
    let sumQuestionVariances = 0;
    activeQuestions.forEach((q) => {
      const corrects = correctByQuestion.get(q.id) || [];
      const correctCount = corrects.filter((c) => c === true).length;
      const p = corrects.length > 0 ? correctCount / corrects.length : 0.5;
      const qVar = p * (1 - p);
      sumQuestionVariances += qVar;
    });
    const studentTotalScores = filteredResults.map((r) => {
      let score = 0;
      activeQuestions.forEach((q) => {
        if (r.correctAnswers && r.correctAnswers[q.id] === true) {
          score += Number(q.points) || 1;
        }
      });
      return score;
    });
    const sumTotalScores = studentTotalScores.reduce((a, b) => a + b, 0);
    const scoreMean = sumTotalScores / totalCandidates;
    const totalScoreVar = studentTotalScores.reduce((acc, s) => acc + Math.pow(s - scoreMean, 2), 0) / totalCandidates;
    if (totalScoreVar > 0) {
      const k = activeQuestions.length;
      cronbachAlpha = k / (k - 1) * (1 - sumQuestionVariances / totalScoreVar);
      cronbachAlpha = Math.max(-1, Math.min(1, cronbachAlpha));
    }
  }
  const itemAnalysisSpreadsheet = activeQuestions.map((q) => {
    const corrects = correctByQuestion.get(q.id) || [];
    const totalCount = corrects.length;
    const correctCount = corrects.filter((c) => c === true).length;
    const pIndex = totalCount > 0 ? correctCount / totalCount : 0.5;
    let difficultyStatus = "Sweet Spot";
    if (pIndex > 0.85) difficultyStatus = "Easy";
    else if (pIndex < 0.2) difficultyStatus = "Hard";
    const sortedScorers = [...filteredResults].sort((a, b) => b.percentage - a.percentage);
    const sliceCount = Math.max(1, Math.floor(sortedScorers.length * 0.27));
    const topScorers = sortedScorers.slice(0, sliceCount);
    const bottomScorers = sortedScorers.slice(-sliceCount);
    const getCorrectRate = (group) => {
      if (group.length === 0) return 0;
      const hits = group.filter((r) => r.correctAnswers && r.correctAnswers[q.id] === true).length;
      return hits / group.length;
    };
    const dIndex = getCorrectRate(topScorers) - getCorrectRate(bottomScorers);
    let discriminationStatus = "Useless";
    if (dIndex > 0.35) discriminationStatus = "Excellent";
    else if (dIndex >= 0.2) discriminationStatus = "Good";
    else if (dIndex < 0) discriminationStatus = "Flawed (Negative)";
    const selections = answersByQuestion.get(q.id) || [];
    const selectionCounts = {};
    if (q.options && Array.isArray(q.options)) {
      q.options.forEach((opt) => {
        selectionCounts[opt] = 0;
      });
    }
    selections.forEach((sel) => {
      if (selectionCounts[sel] !== void 0) {
        selectionCounts[sel]++;
      } else {
        selectionCounts[sel] = 1;
      }
    });
    const choicesPercentage = {};
    Object.entries(selectionCounts).forEach(([choice, count]) => {
      choicesPercentage[choice] = selections.length > 0 ? Math.round(count / selections.length * 100) : 0;
    });
    return {
      id: q.id,
      questionText: q.questionText,
      subject: q.subject,
      classLevel: q.classLevel,
      term: q.term,
      difficulty: q.difficulty,
      pIndex: Math.round(pIndex * 100) / 100,
      dIndex: Math.round(dIndex * 100) / 100,
      difficultyStatus,
      discriminationStatus,
      choicesPercentage,
      totalAttempts: totalCount
    };
  });
  const examLedger = {};
  allExams.forEach((exam) => {
    const eResults = (allResults || []).filter((r) => r.examId === exam.id);
    const candidatesCount = eResults.length;
    const meanScore = candidatesCount > 0 ? Math.round(eResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / candidatesCount) : 0;
    examLedger[exam.id] = { candidatesCount, meanScore };
  });
  return {
    cohortPassProbability,
    atRiskCount,
    safeCount,
    warningCount,
    studentPredictions,
    cognitiveFatigueRate,
    pacingRecords,
    collusionPairs,
    integrityCriticalCount,
    integritySuspiciousCount,
    integritySecureCount,
    integrityStudentsLog,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    skewness: Math.round(skewness * 100) / 100,
    bellCurvePoints,
    histogramBuckets,
    cronbachAlpha: Math.round(cronbachAlpha * 100) / 100,
    itemAnalysis: itemAnalysisSpreadsheet,
    totalCandidates,
    examLedger
  };
}
try {
  let wt;
  if (typeof __require !== "undefined") {
    wt = __require("worker_threads");
  }
  if (wt && !wt.isMainThread && wt.parentPort) {
    try {
      const computed = calculatePsychometrics(wt.workerData);
      wt.parentPort.postMessage(computed);
    } catch (err) {
      wt.parentPort.postMessage({ error: err.message || String(err) });
    }
  }
} catch (e) {
}

// server/routes.ts
var upload = multer({
  storage: process.env.VERCEL ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path2.join(process.cwd(), "uploads");
      if (!fs3.existsSync(uploadDir)) {
        fs3.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp2 = Date.now();
      const ext = path2.extname(file.originalname);
      cb(null, `${timestamp2}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
async function registerRoutes(app2) {
  app2.use("/uploads", express.static(path2.join(process.cwd(), "uploads")));
  app2.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const url = req.file.filename ? `/uploads/${req.file.filename}` : `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      res.json({ url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "username and password required" });
      }
      console.log("Processing login for:", username);
      console.log("Calling storage.getUserByUsername...");
      const user = await storage.getUserByUsername(username);
      console.log("Storage returned:", user);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      try {
        req.session = req.session || {};
        req.session.userId = user.id;
      } catch (e) {
      }
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Failed to login",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/admin/logout", async (req, res) => {
    try {
      const s = req.session;
      if (s && typeof s.destroy === "function") {
        s.destroy(() => {
          res.json({ ok: true });
        });
      } else {
        if (s) s.userId = void 0;
        res.json({ ok: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });
  app2.get("/api/admin/me", async (req, res) => {
    try {
      const s = req.session;
      const uid = s && s.userId;
      if (!uid) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserByUsername((await storage.getUserByUsername("Admin"))?.username || "");
      res.json({ id: uid, username: user?.username || "Admin" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  app2.get("/api/questions/count", async (_req, res) => {
    try {
      const questions2 = await storage.getQuestions();
      res.json({ count: questions2.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch question count" });
    }
  });
  app2.get("/api/questions", async (req, res) => {
    try {
      const questions2 = await storage.getQuestions();
      res.json(questions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });
  app2.get("/api/questions/:id", async (req, res) => {
    try {
      const question = await storage.getQuestion(req.params.id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch question" });
    }
  });
  app2.post("/api/questions", async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create question" });
    }
  });
  app2.post("/api/questions/bulk", async (req, res) => {
    try {
      const payload = req.body;
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Expected an array of questions" });
      }
      const successes = [];
      const errors = [];
      for (let i = 0; i < payload.length; i++) {
        const raw = payload[i];
        if (raw && typeof raw.options === "string") {
          try {
            raw.options = JSON.parse(raw.options);
          } catch (e) {
            raw.options = raw.options.split("|").map((p) => p.trim()).filter(Boolean);
          }
        }
        const parsed = insertQuestionSchema.safeParse(raw);
        if (!parsed.success) {
          errors.push({ row: i, reason: JSON.stringify(parsed.error.errors) });
          continue;
        }
        successes.push(parsed.data);
      }
      const created = [];
      const chunkSize = 200;
      for (let i = 0; i < successes.length; i += chunkSize) {
        const chunk = successes.slice(i, i + chunkSize);
        const createdChunk = await storage.createQuestions(chunk);
        created.push(...createdChunk);
      }
      res.json({ insertedCount: created.length, inserted: created, errors });
    } catch (error) {
      res.status(500).json({ error: "Failed to import questions" });
    }
  });
  app2.post("/api/questions/import-ai", upload.single("file"), async (req, res) => {
    try {
      const defaultMeta = {
        classLevel: req.query.classLevel || req.body.classLevel || "SS3",
        term: req.query.term || req.body.term || "First Term",
        examType: req.query.examType || req.body.examType || "Objectives",
        subject: req.query.subject || req.body.subject || "Biology",
        department: req.query.department || req.body.department || "General"
      };
      let rawText = "";
      if (req.file) {
        console.log("AI Importer: Extracting text from file:", req.file.path);
        rawText = await extractTextFromFile(req.file.path);
      } else if (req.body.rawText) {
        console.log("AI Importer: Extracting text from direct JSON request body.");
        rawText = req.body.rawText;
      } else {
        return res.status(400).json({ error: "No file uploaded and no direct rawText provided" });
      }
      console.log("AI Importer: Extracted text successfully. Length:", rawText.length);
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("AI Importer: process.env.GEMINI_API_KEY is not defined. Falling back to local smart regex parser!");
        const parsed = fallbackParseQuestions(rawText, defaultMeta);
        return res.json(parsed);
      }
      const examTypeStr = String(defaultMeta.examType || "").toLowerCase();
      const isObjectives = examTypeStr.includes("objective") || examTypeStr.includes("obj");
      console.log(`AI Importer: Sending raw text to Gemini AI using ${isObjectives ? "Objectives" : "Theory"} schema...`);
      const ai = new GoogleGenAI({ apiKey });
      const objectivesSchema = {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            description: "A list of multiple-choice objective questions.",
            items: {
              type: "OBJECT",
              properties: {
                classLevel: { type: "STRING" },
                term: { type: "STRING" },
                examType: { type: "STRING" },
                subject: { type: "STRING" },
                questionText: { type: "STRING" },
                questionType: { type: "STRING", description: "Must be 'multiple_choice'" },
                difficulty: { type: "STRING", description: "Must be 'Easy', 'Medium', or 'Hard'" },
                points: { type: "INTEGER" },
                correctAnswer: { type: "STRING", description: "The designated correct option letter (e.g. A, B, C, D)" },
                options: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: "Designated options/choices, e.g. ['A) Option One', 'B) Option Two', ...]"
                }
              },
              required: ["classLevel", "term", "examType", "subject", "questionText", "questionType", "difficulty", "points", "correctAnswer", "options"]
            }
          }
        },
        required: ["questions"]
      };
      const theorySchema = {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            description: "A list of theory/essay questions.",
            items: {
              type: "OBJECT",
              properties: {
                classLevel: { type: "STRING" },
                term: { type: "STRING" },
                examType: { type: "STRING" },
                subject: { type: "STRING" },
                questionText: { type: "STRING" },
                questionType: { type: "STRING", description: "Must be 'fill_in_the_blank' or 'theory' or 'essay'" },
                difficulty: { type: "STRING", description: "Must be 'Easy', 'Medium', or 'Hard'" },
                points: { type: "INTEGER" }
              },
              required: ["classLevel", "term", "examType", "subject", "questionText", "questionType", "difficulty", "points"]
            }
          }
        },
        required: ["questions"]
      };
      const prompt = isObjectives ? `
You are "Exam GEN", a professional educational data extraction agent.
Your goal is to parse the raw exam questions paper text provided and translate it into a perfectly structured JSON object matching the Objectives schema.
Each question represents a multiple choice question (Objectives).

Instructions:
1. Extract ALL multiple choice questions.
2. Extract or infer the academic term (e.g., 'First Term', 'Second Term') for each question from the document or context headers. If the term is not discernible from the document, fallback to "${defaultMeta.term}". If classLevel/subject metadata is missing, use classLevel="${defaultMeta.classLevel}" and subject="${defaultMeta.subject}".
3. Parse the options carefully. Group each option into an array of strings formatted like: ["A) Option Text", "B) Option Text", ...]. E.g. ["A) Apple", "B) Banana", "C) Orange"].
4. Correct answers must be formatted as exactly the uppercase letter corresponding to the correct option, e.g. "A", "B", "C", "D" etc., deduced from key markings or downstream answers if present, or by reasoning through the question if not explicitly marked.
5. Do NOT include any answer lines, correct answer labels, or explanation lines (such as "Answer: B", "Ans: B", or "*B*") in the options array. The options array must strictly contain only the choices/options (A, B, C, D, etc.).
6. questionType: Must be strictly 'multiple_choice'.
7. examType: Must be strictly 'Objectives'.
8. difficulty: Must be strictly 'Easy', 'Medium', or 'Hard'. Capitalize first letter. Default to 'Medium'.
9. points: Must be a valid integer, defaulting to 1 if unknown.

Strictly adhere to the provided JSON schema. Ensure 100% of questions are extracted without summaries or omissions.
` : `
You are "Exam GEN", a professional educational data extraction agent.
Your goal is to parse the paper text and translate all structured theoretical, essay, short-answer, and theory questions matching the Theory schema.

Instructions:
1. Extract ALL theory or essay questions.
2. Extract or infer the academic term (e.g., 'First Term', 'Second Term') for each question from the document or context headers. If the term is not discernible from the document, fallback to "${defaultMeta.term}". If classLevel/subject metadata is missing, use classLevel="${defaultMeta.classLevel}" and subject="${defaultMeta.subject}".
3. questionType must be strictly 'fill_in_the_blank' or 'theory' or 'essay'. (If the question requires a descriptive answer, use 'theory').
4. examType: Must be strictly 'Theory'.
5. difficulty: Must be strictly 'Easy', 'Medium', or 'Hard'. Capitalize first letter. Default to 'Medium'.
6. points: Must be a valid integer, defaulting to 5 if unknown or map as specified.
7. Do NOT include options or correctAnswer properties.

Strictly adhere to the provided JSON schema. Ensure 100% of questions are extracted without summaries or omissions.
`;
      const targetChunkSize = 7e3;
      const textChunks = [];
      const lines = rawText.split(/\r?\n/);
      let currentChunk = [];
      let currentLength = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        const isNewQuestion = /^(?:question\s*(\d+)[:.]?|(\d+)[\s.)\]:-]+)/i.test(trimmed);
        if (isNewQuestion && currentLength >= targetChunkSize) {
          textChunks.push(currentChunk.join("\n"));
          currentChunk = [line];
          currentLength = line.length;
        } else {
          currentChunk.push(line);
          currentLength += line.length + 1;
        }
      }
      if (currentChunk.length > 0) {
        textChunks.push(currentChunk.join("\n"));
      }
      console.log(`AI Importer: Splitting raw text into ${textChunks.length} chunks for processing.`);
      const processChunk = async (chunkText, chunkIndex) => {
        let attempt = 0;
        const maxRetries = 3;
        const initialDelay = 1500;
        while (true) {
          try {
            console.log(`AI Importer: Sending chunk ${chunkIndex + 1}/${textChunks.length} to Gemini (Attempt ${attempt + 1})...`);
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `${prompt}

Document Content to Parse (Chunk ${chunkIndex + 1} of ${textChunks.length}):
---
${chunkText}
---`,
              config: {
                responseMimeType: "application/json",
                responseSchema: isObjectives ? objectivesSchema : theorySchema,
                temperature: 0.1
              }
            });
            const parsed = JSON.parse(response.text || "{}");
            const questions2 = parsed.questions || [];
            console.log(`AI Importer: Chunk ${chunkIndex + 1}/${textChunks.length} parsed successfully. Found ${questions2.length} questions.`);
            return questions2;
          } catch (err) {
            attempt++;
            const errMsg = err instanceof Error ? err.message : String(err);
            const isNetworkError = errMsg.includes("fetch failed") || err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.status === 429 || err.status >= 500;
            if (attempt >= maxRetries || !isNetworkError) {
              console.error(`AI Importer: Chunk ${chunkIndex + 1}/${textChunks.length} failed permanently on attempt ${attempt}:`, errMsg);
              throw err;
            }
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.warn(`AI Importer: Chunk ${chunkIndex + 1}/${textChunks.length} failed on attempt ${attempt} (${errMsg}). Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      };
      const chunkPromises = textChunks.map((chunk, idx) => processChunk(chunk, idx));
      const chunkResults = await Promise.all(chunkPromises);
      const allQuestions = [];
      for (const questions2 of chunkResults) {
        allQuestions.push(...questions2);
      }
      console.log(`AI Importer: Completed parsing all chunks. Total questions extracted: ${allQuestions.length}`);
      res.json({ questions: allQuestions });
    } catch (error) {
      console.error("AI Importer Error:", error);
      try {
        fs3.writeFileSync(path2.join(process.cwd(), "server-error.log"), error instanceof Error ? `${error.message}
${error.stack}` : String(error));
      } catch (logErr) {
        console.error("Failed to write server-error.log", logErr);
      }
      res.status(500).json({
        error: "Failed to parse questions with AI",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  function fallbackParseQuestions(text2, defaultMeta) {
    const questions2 = [];
    const lines = text2.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let currentQuestion = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const questionMatch = line.match(/^(\d+)[\.\):]?\s*(.*)/);
      if (questionMatch) {
        if (currentQuestion) {
          questions2.push(currentQuestion);
        }
        currentQuestion = {
          classLevel: defaultMeta.classLevel || "SS3",
          term: defaultMeta.term || "First Term",
          examType: defaultMeta.examType || "Examination",
          subject: defaultMeta.subject || "Biology",
          questionText: questionMatch[2],
          questionType: "multiple_choice",
          difficulty: "Medium",
          points: 1,
          correctAnswer: "",
          options: []
        };
      } else if (currentQuestion) {
        const optionMatch = line.match(/^[\[\(]?([A-Da-d])[\.\]\)]\s*(.*)/);
        if (optionMatch) {
          const optText = optionMatch[2].replace(/\(correct\)/i, "").replace(/\*/g, "").trim();
          currentQuestion.options.push(optText);
          if (line.toLowerCase().includes("(correct)") || line.toLowerCase().includes("*")) {
            currentQuestion.correctAnswer = optText;
          }
        } else {
          currentQuestion.questionText += " " + line;
        }
      }
    }
    if (currentQuestion) {
      questions2.push(currentQuestion);
    }
    questions2.forEach((q) => {
      if (q.options.length === 0) {
        q.questionType = "fill_in_the_blank";
        q.correctAnswer = q.correctAnswer || "Answer";
      } else {
        if (!q.correctAnswer) {
          q.correctAnswer = q.options[0];
        }
      }
    });
    return { questions: questions2 };
  }
  app2.patch("/api/questions/:id", async (req, res) => {
    try {
      const updated = await storage.updateQuestion(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update question" });
    }
  });
  app2.patch("/api/questions/bulk", async (req, res) => {
    try {
      const { ids, updates } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request body: 'ids' array is required." });
      }
      await storage.updateQuestions(ids, updates || {});
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update questions" });
    }
  });
  app2.delete("/api/questions/:id", async (req, res) => {
    try {
      await storage.deleteQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  });
  app2.delete("/api/questions", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      await storage.deleteQuestions(ids);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete questions" });
    }
  });
  app2.post("/api/questions/bulk-fetch", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request body: 'ids' array is required." });
      }
      const questions2 = await storage.getQuestionsByIds(ids);
      res.json(questions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions by IDs" });
    }
  });
  app2.get("/api/exams", async (req, res) => {
    try {
      const { classLevel } = req.query;
      let effectiveClassLevel = classLevel;
      try {
        const s = req.session;
        if (s && s.studentId) {
          const student = await storage.getStudentByStudentId(s.studentId);
          if (student && student.classLevel) {
            effectiveClassLevel = student.classLevel;
          }
        }
      } catch (e) {
      }
      const exams2 = await storage.getExams(effectiveClassLevel);
      res.json(exams2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });
  app2.get("/api/exams/:id", async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      res.json(exam);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam" });
    }
  });
  app2.get("/api/exams/:id/questions", async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      const questions2 = await storage.getQuestionsByIds(exam.questionIds || []);
      res.json(questions2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam questions" });
    }
  });
  app2.post("/api/exams", async (req, res) => {
    try {
      const validatedData = insertExamSchema.parse(req.body);
      let questionIds = validatedData.questionIds ?? [];
      if ((!questionIds || questionIds.length === 0) && validatedData.numberOfQuestionsToDisplay && validatedData.numberOfQuestionsToDisplay > 0) {
        const pool2 = (await storage.getQuestions()).filter((q) => q.classLevel === validatedData.classLevel && (!validatedData.subject || q.subject === validatedData.subject));
        if (pool2.length < validatedData.numberOfQuestionsToDisplay) {
          return res.status(400).json({ error: `Not enough questions in bank for class level ${validatedData.classLevel}` });
        }
        for (let i = pool2.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool2[i], pool2[j]] = [pool2[j], pool2[i]];
        }
        questionIds = pool2.slice(0, validatedData.numberOfQuestionsToDisplay).map((q) => q.id);
      }
      const examData = { ...validatedData, questionIds };
      const exam = await storage.createExam(examData);
      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create exam" });
    }
  });
  app2.post("/api/students/login", async (req, res) => {
    try {
      const { username, password, studentName, studentId, name: bodyName } = req.body;
      const name = username || studentName || bodyName;
      const sid = password || studentId;
      if (!name || !sid) {
        return res.status(400).json({ error: "Student name and ID are required" });
      }
      const allStudents = await storage.getStudents();
      const student = allStudents.find(
        (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim() && s.studentId.toLowerCase().trim() === sid.toLowerCase().trim()
      );
      if (!student) {
        console.log(`Login failed for name: "${name}", ID: "${sid}"`);
        console.log(`Available students:`, allStudents.map((s) => ({ name: s.name, id: s.studentId })));
        return res.status(401).json({ error: "Invalid student name or ID. Please check your credentials." });
      }
      try {
        req.session = req.session || {};
        req.session.studentId = student.id;
      } catch (e) {
      }
      res.json({
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        classLevel: student.classLevel,
        department: student.department || "General",
        sex: student.sex || "M"
      });
    } catch (error) {
      console.error("Student login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.patch("/api/exams/:id", async (req, res) => {
    try {
      const exam = await storage.updateExam(req.params.id, req.body);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      res.json(exam);
    } catch (error) {
      res.status(500).json({ error: "Failed to update exam" });
    }
  });
  app2.delete("/api/exams/:id", async (req, res) => {
    try {
      await storage.deleteExam(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exam" });
    }
  });
  app2.get("/api/exam-sessions", async (req, res) => {
    try {
      const sessions = await storage.getExamSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam sessions" });
    }
  });
  app2.get("/api/exam-sessions/:id", async (req, res) => {
    try {
      const session2 = await storage.getExamSession(req.params.id);
      if (!session2) {
        return res.status(404).json({ error: "Exam session not found" });
      }
      res.json({ ...session2, serverTime: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam session" });
    }
  });
  app2.post("/api/exam-sessions", async (req, res) => {
    try {
      const validatedData = insertExamSessionSchema.parse(req.body);
      const exam = await storage.getExam(validatedData.examId);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      let sessionQuestionIds = [...exam.questionIds];
      const slots = exam.subjectSlots;
      if (Array.isArray(slots) && slots.length > 0) {
        const allStudents = await storage.getStudents();
        const student = allStudents.find(
          (s) => s.studentId.toLowerCase().trim() === validatedData.studentId.toLowerCase().trim() || s.name.toLowerCase().trim() === validatedData.studentName.toLowerCase().trim()
        );
        const studentDept = student?.department ? student.department.trim() : null;
        const poolQuestions = await storage.getQuestionsByIds(exam.questionIds || []);
        let selectedIds = [];
        for (const slot of slots) {
          if (slot.type === "elective") {
            if (!studentDept) {
              return res.status(400).json({
                error: `Student '${validatedData.studentName}' does not have a department assigned. Department is required for elective slot '${slot.name || "Elective Slot"}'. Please contact an administrator.`
              });
            }
            const mapping = slot.departmentMappings?.find(
              (m) => m.department.toLowerCase().trim() === studentDept.toLowerCase() || m.department.toLowerCase().startsWith("art") && studentDept.toLowerCase().startsWith("art")
            );
            if (!mapping || !mapping.subjects || mapping.subjects.length === 0) {
              return res.status(400).json({
                error: `Department '${studentDept}' is not mapped for elective slot '${slot.name || "Elective Slot"}' in this exam. Please contact your invigilator.`
              });
            }
            const targetSubjects = mapping.subjects;
            const countPerSubj = Math.ceil((slot.questionCount || 10) / targetSubjects.length);
            for (const subj of targetSubjects) {
              const subjQuestions = poolQuestions.filter((q) => (q.subject || "").toLowerCase().trim() === subj.toLowerCase().trim());
              for (let i = subjQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
              }
              selectedIds = [...selectedIds, ...subjQuestions.slice(0, countPerSubj).map((q) => q.id)];
            }
          } else {
            const subj = slot.subject || "";
            const limit = Number(slot.questionCount) || 10;
            const subjQuestions = poolQuestions.filter((q) => (q.subject || "").toLowerCase().trim() === subj.toLowerCase().trim());
            for (let i = subjQuestions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
            }
            selectedIds = [...selectedIds, ...subjQuestions.slice(0, limit).map((q) => q.id)];
          }
        }
        sessionQuestionIds = selectedIds;
      } else if (exam.subjectConfig && Object.keys(exam.subjectConfig).length > 0) {
        const poolQuestions = await storage.getQuestionsByIds(exam.questionIds || []);
        let selectedIds = [];
        for (const [subj, count] of Object.entries(exam.subjectConfig)) {
          const limit = Number(count) || 0;
          if (limit <= 0) continue;
          const subjQuestions = poolQuestions.filter((q) => (q.subject || "").toLowerCase() === subj.toLowerCase());
          for (let i = subjQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
          }
          const sliced = subjQuestions.slice(0, limit);
          selectedIds = [...selectedIds, ...sliced.map((q) => q.id)];
        }
        sessionQuestionIds = selectedIds;
      } else {
        for (let i = sessionQuestionIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sessionQuestionIds[i], sessionQuestionIds[j]] = [sessionQuestionIds[j], sessionQuestionIds[i]];
        }
        if (exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0 && exam.numberOfQuestionsToDisplay < sessionQuestionIds.length) {
          sessionQuestionIds = sessionQuestionIds.slice(0, exam.numberOfQuestionsToDisplay);
        }
      }
      const sessionData = {
        ...validatedData,
        sessionQuestionIds
      };
      const session2 = await storage.createExamSession(sessionData);
      res.status(201).json(session2);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating exam session:", error);
      res.status(500).json({ error: "Failed to create exam session" });
    }
  });
  app2.patch("/api/exam-sessions/:id", async (req, res) => {
    try {
      const session2 = await storage.updateExamSession(req.params.id, req.body);
      if (!session2) {
        return res.status(404).json({ error: "Exam session not found" });
      }
      res.json(session2);
    } catch (error) {
      res.status(500).json({ error: "Failed to update exam session" });
    }
  });
  app2.delete("/api/exam-sessions/:id", async (req, res) => {
    try {
      await storage.deleteExamSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exam session" });
    }
  });
  app2.post("/api/exam-sessions/:id/submit", async (req, res) => {
    try {
      const session2 = await storage.getExamSession(req.params.id);
      if (!session2) {
        return res.status(404).json({ error: "Exam session not found" });
      }
      if (session2.isCompleted) {
        const existingResult = await storage.getResultBySessionId(session2.id);
        if (existingResult) {
          return res.json(existingResult);
        }
      }
      const exam = await storage.getExam(session2.examId);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      const questionIdsToGrade = session2.sessionQuestionIds || exam.questionIds;
      const questions2 = await storage.getQuestionsByIds(questionIdsToGrade);
      const answers = req.body.answers || session2.answers || {};
      const correctAnswers = {};
      let score = 0;
      let sessionTotalPoints = 0;
      for (const question of questions2) {
        sessionTotalPoints += question.points;
        const studentAnswer = answers[question.id];
        const isCorrect = studentAnswer && studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        correctAnswers[question.id] = isCorrect;
        if (isCorrect) {
          score += question.points;
        }
      }
      const percentage = sessionTotalPoints > 0 ? Math.round(score / sessionTotalPoints * 100) : 0;
      const passed = percentage >= exam.passingScore;
      await storage.updateExamSession(session2.id, {
        isCompleted: true,
        endedAt: /* @__PURE__ */ new Date(),
        answers
      });
      const submissionType = req.body.submissionType || "student";
      const result = await storage.createResult({
        sessionId: session2.id,
        examId: exam.id,
        studentName: session2.studentName,
        studentId: session2.studentId,
        score,
        totalPoints: sessionTotalPoints,
        percentage,
        passed,
        submissionType,
        answers,
        correctAnswers
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit exam" });
    }
  });
  app2.get("/api/results", async (req, res) => {
    try {
      const { studentId, examId } = req.query;
      let results2 = await storage.getResults();
      if (studentId) {
        const cleanSid = String(studentId).toLowerCase().trim();
        results2 = results2.filter((r) => r.studentId?.toLowerCase().trim() === cleanSid);
      }
      if (examId) {
        results2 = results2.filter((r) => r.examId === String(examId));
      }
      res.json(results2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });
  app2.get("/api/results/:id", async (req, res) => {
    try {
      const result = await storage.getResult(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Result not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch result" });
    }
  });
  app2.delete("/api/results/:id", async (req, res) => {
    try {
      await storage.deleteResult(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete result" });
    }
  });
  app2.delete("/api/results", async (req, res) => {
    try {
      const { ids } = req.body;
      if (ids && Array.isArray(ids)) {
        await storage.deleteResults(ids);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete results" });
    }
  });
  app2.post("/api/results/:id/reset", async (req, res) => {
    try {
      const result = await storage.getResult(req.params.id);
      if (result) {
        await storage.deleteResult(result.id);
        await storage.deleteExamSessionsForStudent(result.studentId, result.examId);
      }
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset result" });
    }
  });
  app2.get("/api/students", async (req, res) => {
    try {
      const { studentId, classLevel } = req.query;
      let students2 = await storage.getStudents();
      if (studentId) {
        const cleanSid = String(studentId).toLowerCase().trim();
        students2 = students2.filter(
          (s) => s.studentId.toLowerCase().trim() === cleanSid || s.id.toLowerCase().trim() === cleanSid
        );
      }
      if (classLevel) {
        students2 = students2.filter((s) => s.classLevel === String(classLevel));
      }
      res.json(students2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });
  app2.get("/api/students/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const student = await storage.getStudentByStudentId(id);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  });
  app2.post("/api/students", async (req, res) => {
    try {
      const payload = req.body;
      if (Array.isArray(payload)) {
        const rows = payload;
        const toCreate = rows.filter((r) => r && r.name && r.studentId && r.classLevel).map((r) => ({
          name: r.name,
          studentId: r.studentId,
          classLevel: r.classLevel,
          sex: r.sex
        }));
        const created = await storage.createStudents(toCreate);
        return res.status(201).json(created);
      }
      if (payload && typeof payload === "object") {
        const { name, studentId, classLevel, sex } = payload;
        if (!name || !studentId || !classLevel) {
          return res.status(400).json({ error: "name, studentId, and classLevel required" });
        }
        const created = await storage.createStudent({ name, studentId, classLevel, sex });
        return res.status(201).json(created);
      }
      res.status(400).json({ error: "Invalid payload" });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to create students" });
    }
  });
  app2.patch("/api/students/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body;
      const updated = await storage.updateStudent(id, data);
      if (!updated) return res.status(404).json({ error: "Student not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  });
  app2.delete("/api/students/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteStudent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });
  app2.post("/api/students/:id/toggle-block", async (req, res) => {
    try {
      const { examId, blockState } = req.body;
      if (!examId) {
        return res.status(400).json({ error: "examId is required" });
      }
      await storage.toggleStudentExamBlock(req.params.id, examId, Boolean(blockState));
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle block status" });
    }
  });
  const analyticsResponseCache = /* @__PURE__ */ new Map();
  app2.post("/api/ai/remedial", async (req, res) => {
    try {
      const { candidateName, examTitle, score, totalPoints, percentage, incorrectQuestions } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          summary: `Candidate ${candidateName || "Student"} scored ${percentage || 0}% in ${examTitle || "the assessment"}.`,
          strengths: ["Demonstrated commendable focus and basic topic understanding."],
          remedialSteps: [
            "Review key definitions and practice core drill problems daily.",
            "Re-examine incorrectly answered topics in the detailed breakdown below."
          ]
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an educational AI cognitive coach for Faith Immaculate Academy. Analyze candidate performance:
Candidate: ${candidateName || "Student"}
Exam: ${examTitle || "CBT Assessment"}
Score: ${score}/${totalPoints} (${percentage}%)
Incorrect Question Topics: ${JSON.stringify(incorrectQuestions || [])}

Provide structured JSON with:
1. "summary": Encouraging 2-sentence feedback.
2. "strengths": Array of 2 strength bullet points.
3. "remedialSteps": Array of 3 actionable, specific study/revision steps for improvement.`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const text2 = response.text || "{}";
      const parsed = JSON.parse(text2);
      res.json(parsed);
    } catch (err) {
      console.error("AI Remedial Generation Error:", err);
      res.json({
        summary: "Keep up the dedication to academic excellence!",
        strengths: ["Active examination participation"],
        remedialSteps: ["Review incorrect choices in the detailed breakdown below."]
      });
    }
  });
  app2.post("/api/ai/generate-questions", async (req, res) => {
    try {
      const { subject, classLevel, term, topic, count, examType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const numQuestions = Math.min(Math.max(Number(count) || 5, 1), 25);
      const isObjectives = !examType || examType.toLowerCase().includes("objective") || examType.toLowerCase().includes("mcq");
      if (!apiKey) {
        const mockQuestions = Array.from({ length: numQuestions }, (_, i) => ({
          subject: subject || "General Studies",
          classLevel: classLevel || "JSS 1",
          term: term || "First Term",
          questionText: `[AI Generated Sample Q${i + 1}] Core principle of ${topic || subject || "the syllabus"}: What is the primary characteristic?`,
          questionType: isObjectives ? "multiple_choice" : "theory",
          options: isObjectives ? [
            "A) Primary fundamental standard",
            "B) Secondary observational factor",
            "C) Variable experimental parameter",
            "D) Derived structural component"
          ] : null,
          correctAnswer: isObjectives ? "A" : "Primary fundamental standard",
          points: 1,
          difficulty: i % 3 === 0 ? "Hard" : i % 2 === 0 ? "Medium" : "Easy"
        }));
        return res.json({ questions: mockQuestions });
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate ${numQuestions} high-quality, syllabus-aligned ${isObjectives ? "multiple-choice objective" : "theory"} questions for Nigerian CBT curriculum.
Subject: ${subject || "General Science"}
Class Level: ${classLevel || "JSS 1"}
Term: ${term || "First Term"}
Topic Focus: ${topic || "Core Curriculum"}
Format: Return strict JSON with a key "questions" containing an array of objects.

Each question object must include:
- "subject": "${subject}"
- "classLevel": "${classLevel}"
- "term": "${term}"
- "questionText": Clear concise question text
- "questionType": "${isObjectives ? "multiple_choice" : "theory"}"
- "options": ${isObjectives ? '["A) Option text", "B) Option text", "C) Option text", "D) Option text"]' : "null"}
- "correctAnswer": "${isObjectives ? "Designated correct letter A, B, C, or D" : "Expected model answer key"}"
- "points": 1
- "difficulty": "Easy", "Medium", or "Hard"`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const text2 = response.text || "{}";
      const parsed = JSON.parse(text2);
      res.json(parsed);
    } catch (err) {
      console.error("AI Question Generation Error:", err);
      res.status(500).json({ error: "Failed to generate AI questions", details: err.message });
    }
  });
  app2.post("/api/ai/student-risk-analysis", async (req, res) => {
    try {
      const { studentName, classLevel, averageScore, recentScores, tabSwitches } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const isAtRisk = (averageScore || 50) < 50 || (tabSwitches || 0) > 4;
        return res.json({
          riskLevel: isAtRisk ? "High Risk" : "Stable",
          recommendation: isAtRisk ? `Candidate ${studentName || "Student"} is experiencing performance dips in recent CBT sessions. Assign 1-on-1 remedial drills.` : `Candidate ${studentName || "Student"} maintains steady academic trajectory across term assessments.`
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze student risk for Faith Immaculate Academy:
Student: ${studentName} (${classLevel})
Cumulative Average: ${averageScore}%
Recent Score Trend: ${JSON.stringify(recentScores || [])}
Integrity Flags (Tab Switches): ${tabSwitches || 0}

Return JSON with:
1. "riskLevel": "Low Risk", "Moderate Risk", or "High Risk"
2. "recommendation": 2-sentence actionable intervention strategy for teachers/parents.`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      res.json({ riskLevel: "Moderate Risk", recommendation: "Monitor candidate in upcoming term drills." });
    }
  });
  app2.post("/api/ai/generate-comment", async (req, res) => {
    try {
      const { studentName, averageScore, classLevel, role, strengths, weaknesses } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      const isPrincipal = role === "principal";
      if (!apiKey) {
        return res.json({
          comment: isPrincipal ? `${studentName} has demonstrated admirable academic commitment this term with an overall average of ${averageScore}%. Keep striving for excellence.` : `${studentName} shows good effort in class assessments. Continued focus on ${weaknesses?.[0] || "core subjects"} will yield even higher results next term.`
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Generate a professional, encouraging ${isPrincipal ? "Principal" : "Form Teacher"} report card remark for a student at Faith Immaculate Academy.
Student Name: ${studentName}
Class: ${classLevel}
Term Score Average: ${averageScore}%
Identified Strengths: ${JSON.stringify(strengths || [])}
Focus Weaknesses: ${JSON.stringify(weaknesses || [])}

Return JSON with a single key "comment" containing a warm 2-sentence formal remark.`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      res.json({ comment: `${req.body.studentName || "Student"} shows active participation. Keep striving for higher academic achievements.` });
    }
  });
  app2.post("/api/ai/diagnose-curriculum", async (req, res) => {
    try {
      const { meanScore, stdDev, skewness, hardQuestionCount, easyQuestionCount } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          diagnosis: `Cohort mean score is ${meanScore || 65}%. The examination items demonstrate a balanced spread between difficulty and discrimination parameters.`,
          actionSteps: [
            "Maintain current question bank difficulty ratio.",
            "Review items with p-index < 0.20 for potential ambiguity."
          ]
        });
      }
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analyze CBT curriculum examination statistics for Faith Immaculate Academy:
Mean Score: ${meanScore}%
Standard Deviation: ${stdDev}
Skewness: ${skewness}
Hard Questions (p < 0.3): ${hardQuestionCount}
Easy Questions (p > 0.8): ${easyQuestionCount}

Return JSON with:
1. "diagnosis": 2-sentence institutional summary of test difficulty & validity.
2. "actionSteps": Array of 2 actionable recommendations for question authors.`;
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      res.json({
        diagnosis: "Examination parameters show standard distribution metrics.",
        actionSteps: ["Periodically review distractor options for hard items."]
      });
    }
  });
  app2.post("/api/admin/purge-test-data", async (req, res) => {
    try {
      console.log("[routes.ts] Initiating bulk purge of QA test attempts...");
      await storage.purgeTestAttempts();
      try {
        const { db: firestoreDb } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
        if (firestoreDb) {
          const { collection: collection2, getDocs: getDocs2, writeBatch, query, where } = await import("firebase/firestore");
          const resultsQuery = query(collection2(firestoreDb, "results"), where("isTestAttempt", "==", true));
          const resultsSnapshot = await getDocs2(resultsQuery);
          const sessionsQuery = query(collection2(firestoreDb, "exam_sessions"), where("isTestAttempt", "==", true));
          const sessionsSnapshot = await getDocs2(sessionsQuery);
          const batch = writeBatch(firestoreDb);
          resultsSnapshot.docs.forEach((doc2) => {
            batch.delete(doc2.ref);
          });
          sessionsSnapshot.docs.forEach((doc2) => {
            batch.delete(doc2.ref);
          });
          await batch.commit();
          console.log(`[routes.ts] Firestore purged: ${resultsSnapshot.docs.length} results, ${sessionsSnapshot.docs.length} sessions.`);
        }
      } catch (firestoreErr) {
        console.warn("\u26A0\uFE0F Firestore purge failed or not configured, relying on local storage purge:", firestoreErr);
      }
      analyticsResponseCache.clear();
      console.log("[routes.ts] Analytics response cache cleared.");
      res.json({ ok: true });
    } catch (error) {
      console.error("Purge test data failed:", error);
      res.status(500).json({ error: "Failed to purge test data", details: error.message || String(error) });
    }
  });
  app2.get("/api/analytics", async (req, res) => {
    try {
      const selectedExamId = req.query.examId || "__all__";
      const termFilter = req.query.term || "__all__";
      const classFilter = req.query.classLevel || "__all__";
      const subjectFilter = req.query.subject || "__all__";
      const studentFilter = req.query.studentId || "__all__";
      let allResults = [];
      let allQuestions = [];
      let allExams = [];
      let allStudents = [];
      let allExamSessions = [];
      try {
        const { db: firestoreDb } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
        if (firestoreDb) {
          const { collection: collection2, getDocs: getDocs2, query, where, limit } = await import("firebase/firestore");
          let resultsQ;
          if (selectedExamId !== "__all__") {
            resultsQ = query(collection2(firestoreDb, "results"), where("examId", "==", selectedExamId));
          } else if (studentFilter !== "__all__") {
            resultsQ = query(collection2(firestoreDb, "results"), where("studentId", "==", studentFilter));
          } else {
            resultsQ = query(collection2(firestoreDb, "results"), limit(600));
          }
          const resultsSnap = await getDocs2(resultsQ);
          allResults = resultsSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
          let questionsQ;
          if (subjectFilter !== "__all__") {
            questionsQ = query(collection2(firestoreDb, "questions"), where("subject", "==", subjectFilter));
          } else if (classFilter !== "__all__") {
            questionsQ = query(collection2(firestoreDb, "questions"), where("classLevel", "==", classFilter));
          } else {
            questionsQ = query(collection2(firestoreDb, "questions"), limit(1e3));
          }
          const questionsSnap = await getDocs2(questionsQ);
          allQuestions = questionsSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
          let examsQ;
          if (selectedExamId !== "__all__") {
            examsQ = query(collection2(firestoreDb, "exams"), where("id", "==", selectedExamId));
          } else if (classFilter !== "__all__") {
            examsQ = query(collection2(firestoreDb, "exams"), where("classLevel", "==", classFilter));
          } else {
            examsQ = query(collection2(firestoreDb, "exams"), limit(200));
          }
          const examsSnap = await getDocs2(examsQ);
          allExams = examsSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
          let studentsQ;
          if (studentFilter !== "__all__") {
            studentsQ = query(collection2(firestoreDb, "students"), where("studentId", "==", studentFilter));
          } else if (classFilter !== "__all__") {
            studentsQ = query(collection2(firestoreDb, "students"), where("classLevel", "==", classFilter));
          } else {
            studentsQ = query(collection2(firestoreDb, "students"), limit(500));
          }
          const studentsSnap = await getDocs2(studentsQ);
          allStudents = studentsSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
          let sessionsQ;
          if (selectedExamId !== "__all__") {
            sessionsQ = query(collection2(firestoreDb, "exam_sessions"), where("examId", "==", selectedExamId));
          } else if (studentFilter !== "__all__") {
            sessionsQ = query(collection2(firestoreDb, "exam_sessions"), where("studentId", "==", studentFilter));
          } else {
            sessionsQ = query(collection2(firestoreDb, "exam_sessions"), limit(500));
          }
          const sessionsSnap = await getDocs2(sessionsQ);
          allExamSessions = sessionsSnap.docs.map((doc2) => ({ id: doc2.id, ...doc2.data() }));
        }
      } catch (e) {
        console.warn("\u26A0\uFE0F Firestore analytics fetch failed. Falling back to local storage:", e);
      }
      if (allResults.length === 0) allResults = await storage.getResults();
      if (allQuestions.length === 0) allQuestions = await storage.getQuestions();
      if (allExams.length === 0) allExams = await storage.getExams();
      if (allStudents.length === 0) allStudents = await storage.getStudents();
      if (allExamSessions.length === 0) allExamSessions = await storage.getExamSessions();
      allResults = allResults.filter((r) => r.isTestAttempt !== true && r.isTestAttempt !== "true");
      allExamSessions = allExamSessions.filter((s) => s.isTestAttempt !== true && s.isTestAttempt !== "true");
      const lastResultTime = allResults.length > 0 ? allResults[allResults.length - 1]?.completedAt || "" : "";
      const cacheHash = `${allResults.length}_${lastResultTime}`;
      const cacheKey = `${selectedExamId}:${termFilter}:${classFilter}:${subjectFilter}:${studentFilter}`;
      const cachedEntry = analyticsResponseCache.get(cacheKey);
      if (cachedEntry && cachedEntry.cacheHash === cacheHash) {
        console.log(`[routes.ts] Instant Analytics Cache Hit for key: ${cacheKey}`);
        return res.json(cachedEntry.data);
      }
      const workerPayload = {
        selectedExamId,
        termFilter,
        classFilter,
        subjectFilter,
        studentFilter,
        allResults,
        allQuestions,
        allExams,
        allStudents,
        allExamSessions
      };
      const runInline = () => {
        if (res.headersSent) return;
        try {
          const computedData = calculatePsychometrics(workerPayload);
          res.json(computedData);
        } catch (calcError) {
          console.error("Inline psychometrics computation failed:", calcError);
          res.status(500).json({
            error: "Analytics computation failed",
            details: calcError.message || String(calcError)
          });
        }
      };
      try {
        let hasFinished = false;
        let wt;
        try {
          wt = typeof __require !== "undefined" ? __require("worker_threads") : null;
        } catch (e) {
          wt = null;
        }
        if (!wt) {
          throw new Error("worker_threads not supported in this environment");
        }
        const { Worker } = wt;
        const worker = new Worker(path2.join(process.cwd(), "workers", "psychometricWorker.js"), {
          workerData: workerPayload
        });
        worker.on("message", (computedData) => {
          hasFinished = true;
          if (computedData.error) {
            res.status(500).json({ error: computedData.error });
          } else {
            analyticsResponseCache.set(cacheKey, { data: computedData, cacheHash });
            res.json(computedData);
          }
        });
        worker.on("error", (err) => {
          console.error("Worker Thread error, falling back to inline calculation:", err);
          runInline();
        });
        worker.on("exit", (code) => {
          if (code !== 0 && !hasFinished) {
            console.warn(`Worker Thread stopped with exit code ${code}. Falling back to inline.`);
            runInline();
          }
        });
      } catch (workerError) {
        console.warn("Worker Threads require failed/unsupported. Falling back to inline computation:", workerError);
        runInline();
      }
    } catch (error) {
      console.error("Analytics computation error:", error);
      res.status(500).json({
        error: "Failed to compute analytics",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({
        error: "Failed to fetch settings",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/settings", async (req, res) => {
    try {
      const parsed = systemSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid settings format",
          details: parsed.error.format()
        });
      }
      const updated = await storage.saveSystemSettings(parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Save settings error:", error);
      res.status(500).json({
        error: "Failed to save settings",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
var app = express2();
app.use(compression());
app.use(express2.json({
  limit: "50mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
var SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1e3 }
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
var server = null;
async function createApp() {
  if (!server) {
    server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error handler caught:", err);
      res.status(status).json({
        error: message,
        details: process.env.NODE_ENV === "development" ? err.stack : void 0
      });
    });
  }
  return { app, server };
}

// api-src/[...route].ts
var config = {
  api: {
    bodyParser: false
  }
};
async function handler(req, res) {
  try {
    const { app: app2 } = await createApp();
    app2(req, res);
  } catch (e) {
    console.error("Critical Vercel handler error:", e);
    res.status(500).json({
      error: "Internal Server Error (Critical)",
      details: process.env.NODE_ENV === "development" ? e.message : "Server startup failed"
    });
  }
}
export {
  config,
  handler as default
};
