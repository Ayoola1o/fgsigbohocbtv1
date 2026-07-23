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
  db: () => db,
  firebaseInitialized: () => firebaseInitialized,
  getFirestoreExams: () => getFirestoreExams,
  getFirestoreQuestions: () => getFirestoreQuestions,
  getFirestoreResults: () => getFirestoreResults
});
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, Timestamp } from "firebase/firestore";
import "dotenv/config";
var firebaseConfig, db, firebaseInitialized, docToData, ensureDb, withTimeout, getFirestoreResults, getFirestoreQuestions, getFirestoreExams;
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
    db = null;
    firebaseInitialized = false;
    try {
      if (!firebaseConfig.projectId) {
        console.error("\u26A0\uFE0F [firebase.ts] Firebase Project ID is not defined in the backend environment variables!");
      } else {
        const app2 = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = initializeFirestore(app2, {
          experimentalForceLongPolling: true
        });
        firebaseInitialized = true;
        console.log("\u{1F525} [firebase.ts] Server-side Firebase Firestore initialized successfully with long-polling!");
      }
    } catch (error) {
      console.error("\u274C [firebase.ts] Failed to initialize Firebase on the backend:", error);
    }
    docToData = (doc) => {
      const data = doc.data();
      Object.keys(data).forEach((key) => {
        if (data[key] && typeof data[key].toDate === "function") {
          data[key] = data[key].toDate();
        } else if (data[key] instanceof Timestamp) {
          data[key] = data[key].toDate();
        }
      });
      return { id: doc.id, ...data };
    };
    ensureDb = () => {
      if (!db) {
        throw new Error(
          "Firebase environment variables are missing on the backend. Please add VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID to your Vercel project environment settings."
        );
      }
      return db;
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
  }
});

// server/app.ts
import express2 from "express";
import session from "express-session";

// server/routes.ts
import { createServer } from "http";

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
      isActive: true,
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
      timeRemaining: null
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
      completedAt: /* @__PURE__ */ new Date()
    };
    this.results.set(id, result);
    return result;
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
      lastAnalyzed: insertStudent.lastAnalyzed || null
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
};
var storage = new MemStorage();

// server/routes.ts
init_firebase();

// shared/schema.ts
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
  isActive: boolean("is_active").notNull().default(true),
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
  subjectConfig: z.record(z.number()).optional()
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
  sessionQuestionIds: jsonb("session_question_ids").$type()
});
var insertExamSessionSchema = createInsertSchema(examSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
  isCompleted: true
}).extend({
  answers: z.record(z.string()).default({}),
  currentQuestionIndex: z.number().default(0),
  sessionQuestionIds: z.array(z.string()).optional()
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
  completedAt: timestamp("completed_at").notNull().default(sql`now()`)
});
var insertResultSchema = createInsertSchema(results).omit({
  id: true,
  completedAt: true
}).extend({
  submissionType: z.enum(["student", "auto"]).optional()
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
  lastAnalyzed: text("last_analyzed")
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
  lastAnalyzed: z.string().optional()
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
  allStudents.forEach((student) => {
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
    for (let i = 0; i < resultsList.length; i++) {
      for (let j = i + 1; j < resultsList.length; j++) {
        const A = resultsList[i];
        const B = resultsList[j];
        const commonMissed = [];
        if (A.correctAnswers && B.correctAnswers) {
          Object.keys(A.answers || {}).forEach((qId) => {
            if (A.correctAnswers[qId] === false && B.correctAnswers[qId] === false) {
              commonMissed.push(qId);
            }
          });
        }
        if (commonMissed.length >= 3) {
          let identicalMisses = 0;
          commonMissed.forEach((qId) => {
            if (A.answers[qId] === B.answers[qId]) {
              identicalMisses++;
            }
          });
          const collusionIndex = Math.round(identicalMisses / commonMissed.length * 100) / 100;
          if (collusionIndex >= 0.6) {
            collusionPairs.push({
              studentA: A.studentName,
              studentIdA: A.studentId,
              studentB: B.studentName,
              studentIdB: B.studentId,
              examTitle: examObj?.title || "Exam",
              commonMissedCount: commonMissed.length,
              identicalMisses,
              index: collusionIndex
            });
            const maxA = studentMaxCollusion.get(A.studentId) || 0;
            if (collusionIndex > maxA) studentMaxCollusion.set(A.studentId, collusionIndex);
            const maxB = studentMaxCollusion.get(B.studentId) || 0;
            if (collusionIndex > maxB) studentMaxCollusion.set(B.studentId, collusionIndex);
          }
        }
      }
    }
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
    totalCandidates
  };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { calculatePsychometrics };
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
          const student = await storage.getStudentById(s.studentId);
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
      const questions2 = [];
      for (const questionId of exam.questionIds) {
        const question = await storage.getQuestion(questionId);
        if (question) {
          questions2.push(question);
        }
      }
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
        const pool = (await storage.getQuestions()).filter((q) => q.classLevel === validatedData.classLevel && (!validatedData.subject || q.subject === validatedData.subject));
        if (pool.length < validatedData.numberOfQuestionsToDisplay) {
          return res.status(400).json({ error: `Not enough questions in bank for class level ${validatedData.classLevel}` });
        }
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        questionIds = pool.slice(0, validatedData.numberOfQuestionsToDisplay).map((q) => q.id);
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
      if (exam.subjectConfig && Object.keys(exam.subjectConfig).length > 0) {
        const allQuestions = await storage.getQuestions();
        const poolQuestions = allQuestions.filter((q) => exam.questionIds.includes(q.id));
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
      const questions2 = [];
      for (const questionId of questionIdsToGrade) {
        const question = await storage.getQuestion(questionId);
        if (question) {
          questions2.push(question);
        }
      }
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
      const results2 = await storage.getResults();
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
  app2.get("/api/students", async (req, res) => {
    try {
      const students2 = await storage.getStudents();
      res.json(students2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
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
        allResults = await getFirestoreResults();
      } catch (e) {
        console.warn("\u26A0\uFE0F [routes.ts] Firestore results fetch failed. Falling back to local storage:", e);
        allResults = await storage.getResults();
      }
      try {
        allQuestions = await getFirestoreQuestions();
      } catch (e) {
        console.warn("\u26A0\uFE0F [routes.ts] Firestore questions fetch failed. Falling back to local storage:", e);
        allQuestions = await storage.getQuestions();
      }
      try {
        allExams = await getFirestoreExams();
      } catch (e) {
        console.warn("\u26A0\uFE0F [routes.ts] Firestore exams fetch failed. Falling back to local storage:", e);
        allExams = await storage.getExams();
      }
      try {
        const { db: firestoreDb } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
        if (firestoreDb) {
          const { collection: collection2, getDocs: getDocs2 } = await import("firebase/firestore");
          const snapshot = await getDocs2(collection2(firestoreDb, "students"));
          allStudents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("\u26A0\uFE0F Firestore students fetch failed. Falling back to local storage:", e);
      }
      if (allStudents.length === 0) {
        allStudents = await storage.getStudents();
      }
      try {
        const { db: firestoreDb } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
        if (firestoreDb) {
          const { collection: collection2, getDocs: getDocs2 } = await import("firebase/firestore");
          const snapshot = await getDocs2(collection2(firestoreDb, "exam_sessions"));
          allExamSessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("\u26A0\uFE0F Firestore exam sessions fetch failed. Falling back to local storage:", e);
      }
      if (allExamSessions.length === 0) {
        allExamSessions = await storage.getExamSessions();
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
var app = express2();
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
