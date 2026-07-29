import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Question Types
export const questionTypes = ["multiple-choice", "true-false", "short-answer", "theory"] as const;
export const difficultyLevels = ["easy", "medium", "hard"] as const;
export const termOptions = ["First Term", "Second Term", "Third Term", "Others"] as const;
export const examTypeOptions = ["Objectives", "Theory"] as const;
export const departments = ["Science", "Commercial", "Art", "Others", "General"] as const;



// Questions Table
export const classLevels = [
  "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"
] as const;

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(),
  subject: text("subject").notNull(),
  difficulty: text("difficulty").notNull(),
  options: jsonb("options").$type<string[]>(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull().default(1),
  classLevel: text("class_level").notNull(),
  term: text("term").notNull().default("First Term"),
  examType: text("exam_type").notNull().default("Objectives"),
  imageUrl: text("image_url"),
  department: text("department"),
});


export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
}).extend({
  questionType: z.enum(questionTypes),
  difficulty: z.enum(difficultyLevels),
  options: z.array(z.string()).optional(),
  points: z.number().min(1).default(1),
  classLevel: z.enum(classLevels),
  term: z.enum(termOptions).default("First Term"),
  imageUrl: z.string().optional(),
  department: z.string().optional(),
});


export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type SlotType = "common" | "elective";

export interface DepartmentSubjectMapping {
  department: string;
  subjects: string[];
}

export interface SubjectSlot {
  id: string;
  name: string;
  type: SlotType;
  subject?: string;
  departmentMappings?: DepartmentSubjectMapping[];
  questionCount: number;
}

// Exams Table
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  duration: integer("duration").notNull(), // in minutes
  totalPoints: integer("total_points").notNull(),
  passingScore: integer("passing_score").notNull(),
  questionIds: jsonb("question_ids").$type<string[]>().notNull(),
  numberOfQuestionsToDisplay: integer("number_of_questions_to_display"),
  classLevel: text("class_level").notNull(),
  term: text("term").notNull().default("First Term"),
  theoryInstructions: text("theory_instructions"),
  examType: text("exam_type").notNull().default("Objectives"),
  theoryConfig: jsonb("theory_config").$type<any>(),
  subjectConfig: jsonb("subject_config").$type<Record<string, number>>(),
  subjectSlots: jsonb("subject_slots").$type<SubjectSlot[]>(),
  isActive: boolean("is_active").notNull().default(true),
  enableCalculator: boolean("enable_calculator").notNull().default(false),
  enableFormulaSheet: boolean("enable_formula_sheet").notNull().default(false),
  department: text("department"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});


export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
  totalPoints: true,
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
  enableFormulaSheet: z.boolean().optional(),
});


export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// Exam Sessions Table
export const examSessions = pgTable("exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").notNull(),
  studentName: text("student_name").notNull(),
  studentId: text("student_id").notNull(),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  endedAt: timestamp("ended_at"),
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  timeRemaining: integer("time_remaining"), // in seconds
  sessionQuestionIds: jsonb("session_question_ids").$type<string[]>(),
  lastSeenAt: timestamp("last_seen_at"),
  tabSwitches: integer("tab_switches").default(0),
  windowBlurs: integer("window_blurs").default(0),
  extendedMinutes: integer("extended_minutes").default(0),
  invigilatorMessage: text("invigilator_message"),
  broadcastMessage: text("broadcast_message"),
  isFlagged: boolean("is_flagged").default(false),
  isTestAttempt: boolean("is_test_attempt").notNull().default(false),
});

export const insertExamSessionSchema = createInsertSchema(examSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  isCompleted: true,
}).extend({
  answers: z.record(z.string()).default({}),
  currentQuestionIndex: z.number().default(0),
  sessionQuestionIds: z.array(z.string()).optional(),
  isTestAttempt: z.boolean().optional(),
});

export type InsertExamSession = z.infer<typeof insertExamSessionSchema>;
export type ExamSession = typeof examSessions.$inferSelect;

// Results Table
export const results = pgTable("results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  examId: varchar("exam_id").notNull(),
  studentName: text("student_name").notNull(),
  studentId: text("student_id").notNull(),
  score: integer("score").notNull(),
  totalPoints: integer("total_points").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),
  submissionType: text("submission_type"), // 'student' or 'auto'
  answers: jsonb("answers").$type<Record<string, string>>().notNull(),
  correctAnswers: jsonb("correct_answers").$type<Record<string, boolean>>().notNull(),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
  isTestAttempt: boolean("is_test_attempt").notNull().default(false),
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  completedAt: true,
}).extend({
  submissionType: z.enum(['student', 'auto']).optional(),
  isTestAttempt: z.boolean().optional(),
});

export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof results.$inferSelect;

// Keep existing users table for potential future auth
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  studentId: text("student_id").notNull().unique(),
  classLevel: text("class_level").notNull(),
  sex: text("sex"),
  department: text("department"),
  blockedExams: jsonb("blocked_exams").$type<string[]>(),
  averageScore: integer("average_score"),
  academicStanding: text("academic_standing"),
  strengths: jsonb("strengths").$type<string[]>(),
  weaknesses: jsonb("weaknesses").$type<string[]>(),
  academicTrajectory: text("academic_trajectory"),
  diagnosis: text("diagnosis"),
  actionPlan: jsonb("action_plan").$type<string[]>(),
  lastAnalyzed: text("last_analyzed"),
  isTestUser: boolean("is_test_user").notNull().default(false),
});


export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
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
  isTestUser: z.boolean().optional(),
});


export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// Keep existing users table for potential future auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// System Settings Table Schema
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default("global"),
  schoolName: text("school_name").notNull().default("Faith Immaculate Academy"),
  schoolLogo: text("school_logo"),
  schoolAddress: text("school_address"),
  schoolContact: text("school_contact"),
  currentSession: text("current_session").notNull().default("2025/2026"),
  termStart: text("term_start"),
  termEnd: text("term_end"),
  defaultDuration: integer("default_duration").notNull().default(60),
  defaultGradingScale: jsonb("default_grading_scale").$type<any[]>(),
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
});

export const defaultGradingScale = [
  { grade: "A", minScore: 75, maxScore: 100 },
  { grade: "B", minScore: 60, maxScore: 74 },
  { grade: "C", minScore: 50, maxScore: 59 },
  { grade: "D", minScore: 45, maxScore: 49 },
  { grade: "E", minScore: 40, maxScore: 44 },
  { grade: "F", minScore: 0, maxScore: 39 },
];

export const defaultNotificationTemplates = {
  examPublished: "A new examination '{examTitle}' has been scheduled for {classLevel}. Duration: {duration} minutes.",
  resultsReleased: "Results for '{examTitle}' are now available. Log in to your portal to view your scorecard.",
  accountCreated: "Welcome to Faith Immaculate Academy CBT Portal. Your Student ID is {studentId}.",
};

export const defaultSystemSettings = {
  schoolName: "Faith Immaculate Academy",
  schoolLogo: "",
  schoolAddress: "123 Academy Way, Faith City",
  schoolContact: "+234 800 123 4567",
  currentSession: "2025/2026",
  termStart: "",
  termEnd: "",
  defaultDuration: 60,
  defaultGradingScale: defaultGradingScale,
  defaultNegativeMarkingEnabled: false,
  defaultNegativeMarkingValue: 0,
  defaultAttempts: 1,
  defaultRandomizationEnabled: true,
  resultApprovalRequired: false,
  rankingMethod: "class-wide" as const,
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
  backupFrequency: "weekly" as const,
  testModeEnabled: false,
  auditLogVerbosity: "basic" as const,
  auditLogRetentionDays: 90,
  auditLogRoles: ["Admin", "SuperAdmin"],
  analysisMode: "automatic",
  timerWarning: 5,
  conceptStrengthThreshold: 70,
  conceptFocusThreshold: 50,
};

export const systemSettingsSchema = z.object({
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
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

// --- Admin Personal User Profile & Preferences ---
export interface AdminNotificationPreferences {
  results: boolean;
  cheating: boolean; // Urgent cheating alerts are always enabled
  questions: boolean;
  messages: boolean;
  exams: boolean;
  system: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
}

export interface AdminActiveSession {
  id: string;
  device: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export const adminUsers = pgTable("admin_users", {
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
  notificationPreferences: jsonb("notification_preferences").$type<AdminNotificationPreferences>(),
  activeSessions: jsonb("active_sessions").$type<AdminActiveSession[]>(),
  permissions: jsonb("permissions").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type AdminUser = typeof adminUsers.$inferSelect;

// --- Centralized App Notification System ---
export const notificationCategories = ["results", "cheating", "questions", "messages", "exams", "system"] as const;
export const notificationSeverities = ["urgent", "important", "info"] as const;

export const appNotifications = pgTable("app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetAdminId: text("target_admin_id"), // null = broadcast to all admins
  category: text("category").notNull(), // 'results' | 'cheating' | 'questions' | 'messages' | 'exams' | 'system'
  severity: text("severity").notNull().default("info"), // 'urgent' | 'important' | 'info'
  title: text("title").notNull(),
  message: text("message").notNull(),
  deepLink: text("deep_link"),
  isRead: boolean("is_read").notNull().default(false),
  batchId: text("batch_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type AppNotification = typeof appNotifications.$inferSelect;


