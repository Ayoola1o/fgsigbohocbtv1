import {
  questions,
  exams,
  examSessions,
  results,
  students,
  users,
  systemSettings,
  adminUsers,
  type Question,
  type InsertQuestion,
  type Exam,
  type InsertExam,
  type ExamSession,
  type InsertExamSession,
  type Result,
  type InsertResult,
  type InsertUser,
  type User,
  type Student,
  type InsertStudent,
  type SystemSettings,
  defaultSystemSettings
} from "../shared/schema";
import { eq, inArray, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface IStorage {
  // Questions
  getQuestions(): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByIds(ids: string[]): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  createQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined>;
  updateQuestions(ids: string[], updates: Partial<Question>): Promise<void>;
  deleteQuestion(id: string): Promise<void>;
  deleteQuestions(ids: string[]): Promise<void>;

  // Exams
  getExams(classLevel?: string): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, data: Partial<Exam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<void>;

  // Exam Sessions
  getExamSessions(): Promise<ExamSession[]>;
  getExamSession(id: string): Promise<ExamSession | undefined>;
  getActiveExamSession(examId: string, studentId: string): Promise<ExamSession | undefined>;
  createExamSession(session: InsertExamSession): Promise<ExamSession>;
  updateExamSession(
    id: string,
    data: Partial<ExamSession>
  ): Promise<ExamSession | undefined>;
  deleteExamSession(id: string): Promise<void>;

  // Results
  getResults(): Promise<Result[]>;
  getResultsByStudentId(studentId: string): Promise<Result[]>;
  getResult(id: string): Promise<Result | undefined>;
  getResultBySessionId(sessionId: string): Promise<Result | undefined>;
  createResult(result: InsertResult): Promise<Result>;
  deleteResult(id: string): Promise<void>;
  deleteResults(ids: string[]): Promise<void>;

  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Students
  getStudents(): Promise<Student[]>;
  getStudentByStudentId(studentId: string): Promise<Student | undefined>;
  getStudentForLogin(name: string, studentId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  createStudents(students: InsertStudent[]): Promise<Student[]>;
  updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<void>;
  toggleStudentExamBlock(studentId: string, examId: string, blockState: boolean): Promise<void>;
  deleteExamSessionsForStudent(studentId: string, examId: string): Promise<void>;
  purgeTestAttempts(): Promise<void>;

  // System Settings
  getSystemSettings(): Promise<SystemSettings>;
  saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings>;
}

export class MemStorage implements IStorage {
  private questions: Map<string, Question>;
  private exams: Map<string, Exam>;
  private examSessions: Map<string, ExamSession>;
  private results: Map<string, Result>;
  private users: Map<string, User>;
  private students: Map<string, Student>;
  private systemSettings: SystemSettings;

  constructor() {
    this.questions = new Map();
    this.exams = new Map();
    this.examSessions = new Map();
    this.results = new Map();
    this.users = new Map();
    this.students = new Map();
    // load persisted students from disk (simple JSON persistence for prototyping)
    // Vercel has a read-only filesystem, except for /tmp.
    // Vercel has a read-only filesystem, except for /tmp.
    // Try to detect Vercel or generic production usage
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    let dataDir = isProd
      ? path.join("/tmp")
      : path.join(process.cwd(), "server", "data");

    try {
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (err) {
          // Fallback to tmp if generic path failed (e.g. read-only fs)
          console.warn(`Failed to create data dir at ${dataDir}, falling back to /tmp`);
          dataDir = "/tmp";
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      const file = path.join(dataDir, "students.json");
      if (fs.existsSync(file)) {
        const txt = fs.readFileSync(file, "utf8");
        const arr = JSON.parse(txt) as Student[];
        for (const s of arr || []) this.students.set(s.id, s);
      }
    } catch (e) {
      // ignore load errors
    }

    // Load persisted settings
    try {
      const settingsFile = path.join(dataDir, "settings.json");
      if (fs.existsSync(settingsFile)) {
        const txt = fs.readFileSync(settingsFile, "utf8");
        const parsed = JSON.parse(txt);
        this.systemSettings = { ...defaultSystemSettings, ...parsed } as SystemSettings;
      } else {
        this.systemSettings = { ...defaultSystemSettings };
      }
    } catch (e) {
      this.systemSettings = { ...defaultSystemSettings };
    }

    // Seed default admin user immediately
    const adminId = "admin-id";
    this.users.set(adminId, {
      id: adminId,
      username: "Admin",
      password: "admin"
    });
  }

  // Questions
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find((s) => s.studentId === studentId);
  }

  async getStudentForLogin(name: string, studentId: string): Promise<Student | undefined> {
    const cleanName = name.trim().toLowerCase();
    const cleanStudentId = studentId.trim().toLowerCase();
    return Array.from(this.students.values()).find(student =>
      student.name.trim().toLowerCase() === cleanName &&
      student.studentId.trim().toLowerCase() === cleanStudentId
    );
  }

  async getStudentById(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    const questions: Question[] = [];
    for (const id of ids) {
      const question = this.questions.get(id);
      if (question) {
        questions.push(question);
      }
    }
    return questions;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const question: Question = {
      id,
      questionText: insertQuestion.questionText,
      questionType: insertQuestion.questionType,
      subject: insertQuestion.subject,
      difficulty: insertQuestion.difficulty,
      options: insertQuestion.options ?? null,
      correctAnswer: insertQuestion.correctAnswer,
      points: insertQuestion.points,
      classLevel: (insertQuestion as any).classLevel ?? null,
      term: (insertQuestion as any).term ?? "First Term",
      examType: (insertQuestion as any).examType ?? "Objectives",
      imageUrl: insertQuestion.imageUrl ?? null,
      // department may be optional on the insert schema
      department: (insertQuestion as any).department ?? null,
    };
    this.questions.set(id, question);
    return question;
  }

  // Bulk create questions (useful for imports)
  async createQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]> {
    const out: Question[] = [];
    for (const q of insertQuestions) {
      const created = await this.createQuestion(q);
      out.push(created);
    }
    return out;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined> {
    const q = this.questions.get(id);
    if (!q) return undefined;
    const updated = { ...q, ...data };
    this.questions.set(id, updated);
    return updated;
  }

  async updateQuestions(ids: string[], updates: Partial<Question>): Promise<void> {
    for (const id of ids) {
      await this.updateQuestion(id, updates);
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    this.questions.delete(id);
  }

  async deleteQuestions(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.questions.delete(id);
    }
  }

  // Exams
  async getExams(classLevel?: string): Promise<Exam[]> {
    let allExams = Array.from(this.exams.values());
    if (classLevel) {
      allExams = allExams.filter(exam => exam.classLevel === classLevel);
    }
    return allExams;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    return this.exams.get(id);
  }

  async createExam(insertExam: InsertExam): Promise<Exam> {
    const id = randomUUID();

    // Calculate total points from questions
    let totalPoints = 0;
    for (const questionId of (insertExam.questionIds || [])) {
      const question = await this.getQuestion(questionId);
      if (question) {
        totalPoints += question.points;
      }
    }

    const exam: Exam = {
      id,
      title: insertExam.title,
      description: insertExam.description ?? null,
      subject: insertExam.subject,
      duration: insertExam.duration,
      totalPoints,
      passingScore: insertExam.passingScore,
      questionIds: insertExam.questionIds || [],
      numberOfQuestionsToDisplay: (insertExam as any).numberOfQuestionsToDisplay ?? null,
      classLevel: (insertExam as any).classLevel ?? null,
      term: (insertExam as any).term ?? "First Term",
      theoryInstructions: (insertExam as any).theoryInstructions ?? null,
      examType: (insertExam as any).examType ?? "Objectives",
      theoryConfig: (insertExam as any).theoryConfig ?? null,
      subjectConfig: (insertExam as any).subjectConfig ?? null,
      subjectSlots: (insertExam as any).subjectSlots ?? null,
      isActive: true,
      enableCalculator: insertExam.enableCalculator ?? false,
      enableFormulaSheet: insertExam.enableFormulaSheet ?? false,
      department: (insertExam as any).department ?? null,
      createdAt: new Date(),
    };
    this.exams.set(id, exam);
    return exam;
  }

  async updateExam(
    id: string,
    data: Partial<Exam>
  ): Promise<Exam | undefined> {
    const exam = this.exams.get(id);
    if (!exam) return undefined;

    const updatedExam = { ...exam, ...data };
    this.exams.set(id, updatedExam);
    return updatedExam;
  }

  async deleteExam(id: string): Promise<void> {
    this.exams.delete(id);
  }

  // Exam Sessions
  async getExamSessions(): Promise<ExamSession[]> {
    return Array.from(this.examSessions.values());
  }

  async getExamSession(id: string): Promise<ExamSession | undefined> {
    return this.examSessions.get(id);
  }

  async getActiveExamSession(examId: string, studentId: string): Promise<ExamSession | undefined> {
    const cleanStudentId = studentId.trim().toLowerCase();
    return Array.from(this.examSessions.values())
      .filter(session =>
        session.examId === examId &&
        !session.isCompleted &&
        session.studentId.trim().toLowerCase() === cleanStudentId
      )
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  }

  async createExamSession(
    insertSession: InsertExamSession
  ): Promise<ExamSession> {
    const id = randomUUID();
    const session: ExamSession = {
      ...insertSession,
      id,
      startedAt: new Date(),
      endedAt: null,
      answers: insertSession.answers || {},
      currentQuestionIndex: insertSession.currentQuestionIndex || 0,
      sessionQuestionIds: (insertSession as any).sessionQuestionIds || [],
      isCompleted: false,
      timeRemaining: null,
      lastSeenAt: new Date(),
      tabSwitches: 0,
      windowBlurs: 0,
      extendedMinutes: 0,
      invigilatorMessage: null,
      broadcastMessage: null,
      isFlagged: false,
      isTestAttempt: insertSession.isTestAttempt || false,
    };
    this.examSessions.set(id, session);
    return session;
  }

  async updateExamSession(
    id: string,
    data: Partial<ExamSession>
  ): Promise<ExamSession | undefined> {
    const session = this.examSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...data };
    this.examSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteExamSession(id: string): Promise<void> {
    this.examSessions.delete(id);
  }

  // Results
  async getResults(): Promise<Result[]> {
    return Array.from(this.results.values());
  }

  async getResultsByStudentId(studentId: string): Promise<Result[]> {
    const normalizedId = studentId.trim().toLowerCase();
    return Array.from(this.results.values()).filter(
      result => result.studentId.trim().toLowerCase() === normalizedId
    );
  }

  async getResult(id: string): Promise<Result | undefined> {
    return this.results.get(id);
  }

  async getResultBySessionId(sessionId: string): Promise<Result | undefined> {
    return Array.from(this.results.values()).find(
      (result) => result.sessionId === sessionId
    );
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const id = randomUUID();
    const result: Result = {
      ...insertResult,
      id,
      submissionType: insertResult.submissionType ?? null,
      completedAt: new Date(),
      isTestAttempt: insertResult.isTestAttempt || false,
    };
    this.results.set(id, result);
    return result;
  }

  async deleteResult(id: string): Promise<void> {
    this.results.delete(id);
  }

  async deleteResults(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.results.delete(id);
    }
  }

  // Users
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Students
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const existing = Array.from(this.students.values()).find(s => s.studentId === insertStudent.studentId);
    if (existing) {
      throw new Error(`Student ID '${insertStudent.studentId}' already exists`);
    }
    const id = randomUUID();
    const student: Student = {
      id,
      name: insertStudent.name,
      studentId: insertStudent.studentId,
      classLevel: insertStudent.classLevel,
      sex: insertStudent.sex || null,
      department: insertStudent.department || null,
      blockedExams: (insertStudent as any).blockedExams || null,
      averageScore: (insertStudent as any).averageScore || null,
      academicStanding: (insertStudent as any).academicStanding || null,
      strengths: (insertStudent as any).strengths || null,
      weaknesses: (insertStudent as any).weaknesses || null,
      academicTrajectory: (insertStudent as any).academicTrajectory || null,
      diagnosis: (insertStudent as any).diagnosis || null,
      actionPlan: (insertStudent as any).actionPlan || null,
      lastAnalyzed: (insertStudent as any).lastAnalyzed || null,
      isTestUser: insertStudent.isTestUser || false,
    };
    this.students.set(id, student);
    this.saveStudentsToDisk();
    return student;
  }

  async createStudents(insertStudents: InsertStudent[]): Promise<Student[]> {
    const out: Student[] = [];
    for (const s of insertStudents) {
      try {
        const created = await this.createStudent(s);
        out.push(created);
      } catch (e) {
        // skip duplicates in bulk import or handle error
        // for now we just skip to avoid breaking the whole batch
      }
    }
    this.saveStudentsToDisk();
    return out;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    const existing = this.students.get(id);
    if (!existing) return undefined;

    if (data.studentId && data.studentId !== existing.studentId) {
      const duplicate = Array.from(this.students.values()).find(s => s.studentId === data.studentId);
      if (duplicate) {
        throw new Error(`Student ID '${data.studentId}' already exists`);
      }
    }

    const updated = { ...existing, ...data };
    this.students.set(id, updated);
    this.saveStudentsToDisk();
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    this.students.delete(id);
    this.saveStudentsToDisk();
  }

  async toggleStudentExamBlock(studentId: string, examId: string, blockState: boolean): Promise<void> {
    const student = await this.getStudentByStudentId(studentId) || Array.from(this.students.values()).find(s => s.id === studentId);
    if (!student) return;
    let blocked = (student.blockedExams as string[]) || [];
    if (blockState) {
      if (!blocked.includes(examId)) blocked = [...blocked, examId];
    } else {
      blocked = blocked.filter(id => id !== examId);
    }
    student.blockedExams = blocked;
    this.students.set(student.id, student);
    this.saveStudentsToDisk();
  }

  async deleteExamSessionsForStudent(studentId: string, examId: string): Promise<void> {
    for (const [id, s] of Array.from(this.examSessions.entries())) {
      if (s.studentId === studentId && s.examId === examId) {
        this.examSessions.delete(id);
      }
    }
  }

  async purgeTestAttempts(): Promise<void> {
    this.results.forEach((r, id) => {
      if ((r as any).isTestAttempt === true || (r as any).isTestAttempt === "true") {
        this.results.delete(id);
      }
    });
    this.examSessions.forEach((s, id) => {
      if ((s as any).isTestAttempt === true || (s as any).isTestAttempt === "true") {
        this.examSessions.delete(id);
      }
    });
  }

  private saveStudentsToDisk() {
    try {
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      let dataDir = isProd
        ? path.join("/tmp")
        : path.join(process.cwd(), "server", "data");

      if (!fs.existsSync(dataDir)) {
        // Attempt to create, fallback to /tmp if fails
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (e) {
          dataDir = "/tmp";
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        }
      }
      // if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const file = path.join(dataDir, "students.json");
      fs.writeFileSync(file, JSON.stringify(Array.from(this.students.values()), null, 2), "utf8");
    } catch (e) {
      // ignore write errors
    }
  }

  // System Settings Methods
  async getSystemSettings(): Promise<SystemSettings> {
    return this.systemSettings;
  }

  async saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    this.systemSettings = { ...this.systemSettings, ...settings };
    this.saveSettingsToDisk();
    return this.systemSettings;
  }

  private saveSettingsToDisk() {
    try {
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      let dataDir = isProd
        ? path.join("/tmp")
        : path.join(process.cwd(), "server", "data");

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
      // ignore write errors
    }
  }
}

export class DatabaseStorage implements IStorage {
  private resultsCache: Result[] | null = null;
  private resultsCacheTime: number = 0;
  private resultsInFlight: Promise<Result[]> | null = null;

  private studentsCache: Student[] | null = null;
  private studentsCacheTime: number = 0;
  private studentsInFlight: Promise<Student[]> | null = null;

  private examsCache: Exam[] | null = null;
  private examsCacheTime: number = 0;
  private examsInFlight: Promise<Exam[]> | null = null;

  private examSessionsCache: ExamSession[] | null = null;
  private examSessionsCacheTime: number = 0;
  private examSessionsInFlight: Promise<ExamSession[]> | null = null;

  private questionsCache: Question[] | null = null;
  private questionsMap: Map<string, Question> = new Map();
  private questionsCacheTime: number = 0;
  private questionsInFlight: Promise<Question[]> | null = null;

  private systemSettingsCache: SystemSettings | null = null;

  async getQuestions(): Promise<Question[]> {
    const now = Date.now();
    if (this.questionsCache && (now - this.questionsCacheTime < 60000)) {
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
        this.questionsMap = new Map(rows.map(q => [q.id, q]));
        return rows;
      } finally {
        this.questionsInFlight = null;
      }
    })();
    return this.questionsInFlight;
  }

  async getQuestion(id: string): Promise<Question | undefined> {
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

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (!ids || ids.length === 0) return [];
    if (!this.questionsCache) {
      await this.getQuestions();
    }
    const missingIds: string[] = [];
    const result: Question[] = [];
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
    const resultMap = new Map(result.map(q => [q.id, q]));
    return ids.map(id => resultMap.get(id)).filter(Boolean) as Question[];
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [created] = await db.insert(questions).values(question).returning();
    if (created) {
      this.questionsMap.set(created.id, created);
      if (this.questionsCache) {
        this.questionsCache = [...this.questionsCache, created];
      }
    }
    return created;
  }

  async createQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]> {
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

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    if (updated) {
      this.questionsMap.set(updated.id, updated);
      if (this.questionsCache) {
        this.questionsCache = this.questionsCache.map(q => q.id === id ? updated : q);
      }
    }
    return updated;
  }

  async updateQuestions(ids: string[], updates: Partial<Question>): Promise<void> {
    if (ids.length === 0) return;
    await db.update(questions).set(updates).where(inArray(questions.id, ids));
    const idSet = new Set(ids);
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.map(q => {
        if (idSet.has(q.id)) {
          const updated = { ...q, ...updates };
          this.questionsMap.set(q.id, updated);
          return updated;
        }
        return q;
      });
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
    this.questionsMap.delete(id);
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.filter(q => q.id !== id);
    }
  }

  async deleteQuestions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(questions).where(inArray(questions.id, ids));
    const idSet = new Set(ids);
    for (const id of ids) {
      this.questionsMap.delete(id);
    }
    if (this.questionsCache) {
      this.questionsCache = this.questionsCache.filter(q => !idSet.has(q.id));
    }
  }

  async getExams(classLevel?: string): Promise<Exam[]> {
    const now = Date.now();
    let allExams = this.examsCache;
    if (!allExams || (now - this.examsCacheTime >= 60000)) {
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
      return allExams.filter(exam => exam.classLevel === classLevel);
    }
    return allExams;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const all = await this.getExams();
    return all.find(e => e.id === id);
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const [created] = await db.insert(exams).values({ totalPoints: 0, ...exam } as any).returning();
    if (this.examsCache && created) {
      this.examsCache = [...this.examsCache, created];
    }
    return created;
  }

  async updateExam(id: string, data: Partial<Exam>): Promise<Exam | undefined> {
    const [updated] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    if (this.examsCache && updated) {
      this.examsCache = this.examsCache.map(e => e.id === id ? updated : e);
    }
    return updated;
  }

  async deleteExam(id: string): Promise<void> {
    await db.delete(exams).where(eq(exams.id, id));
    if (this.examsCache) {
      this.examsCache = this.examsCache.filter(e => e.id !== id);
    }
  }

  async getExamSessions(): Promise<ExamSession[]> {
    const now = Date.now();
    if (this.examSessionsCache && (now - this.examSessionsCacheTime < 10000)) {
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

  async getExamSession(id: string): Promise<ExamSession | undefined> {
    if (this.examSessionsCache) {
      const cached = this.examSessionsCache.find(s => s.id === id);
      if (cached) return cached;
    }
    const [s] = await db.select().from(examSessions).where(eq(examSessions.id, id));
    return s;
  }

  async getActiveExamSession(examId: string, studentId: string): Promise<ExamSession | undefined> {
    const cleanStudentId = studentId.trim().toLowerCase();
    const [session] = await db.select().from(examSessions).where(and(
      eq(examSessions.examId, examId),
      eq(examSessions.isCompleted, false),
      sql`lower(trim(${examSessions.studentId})) = ${cleanStudentId}`,
    )).orderBy(desc(examSessions.startedAt)).limit(1);
    return session;
  }

  async createExamSession(session: InsertExamSession): Promise<ExamSession> {
    const [created] = await db.insert(examSessions).values(session).returning();
    if (this.examSessionsCache && created) {
      this.examSessionsCache = [...this.examSessionsCache, created];
    }
    return created;
  }

  async updateExamSession(id: string, data: Partial<ExamSession>): Promise<ExamSession | undefined> {
    const [updated] = await db.update(examSessions).set(data).where(eq(examSessions.id, id)).returning();
    if (this.examSessionsCache && updated) {
      this.examSessionsCache = this.examSessionsCache.map(s => s.id === id ? updated : s);
    }
    return updated;
  }

  async deleteExamSession(id: string): Promise<void> {
    await db.delete(examSessions).where(eq(examSessions.id, id));
    if (this.examSessionsCache) {
      this.examSessionsCache = this.examSessionsCache.filter(s => s.id !== id);
    }
  }

  async getResults(): Promise<Result[]> {
    const now = Date.now();
    if (this.resultsCache && (now - this.resultsCacheTime < 60000)) {
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

  async getResultsByStudentId(studentId: string): Promise<Result[]> {
    const normalizedId = studentId.trim().toLowerCase();
    return db.select().from(results)
      .where(sql`lower(trim(${results.studentId})) = ${normalizedId}`)
      .orderBy(desc(results.completedAt));
  }

  async getResult(id: string): Promise<Result | undefined> {
    if (this.resultsCache) {
      const cached = this.resultsCache.find(r => r.id === id);
      if (cached) return cached;
    }
    const [r] = await db.select().from(results).where(eq(results.id, id));
    return r;
  }

  async getResultBySessionId(sessionId: string): Promise<Result | undefined> {
    if (this.resultsCache) {
      const cached = this.resultsCache.find(r => r.sessionId === sessionId);
      if (cached) return cached;
    }
    const [r] = await db.select().from(results).where(eq(results.sessionId, sessionId));
    return r;
  }

  async createResult(result: InsertResult): Promise<Result> {
    const [created] = await db.insert(results).values(result).returning();
    if (this.resultsCache && created) {
      this.resultsCache = [created, ...this.resultsCache.filter(r => r.id !== created.id)];
    }
    return created;
  }

  async deleteResult(id: string): Promise<void> {
    await db.delete(results).where(eq(results.id, id));
    if (this.resultsCache) {
      this.resultsCache = this.resultsCache.filter(r => r.id !== id);
    }
  }

  async deleteResults(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(results).where(inArray(results.id, ids));
    if (this.resultsCache) {
      const set = new Set(ids);
      this.resultsCache = this.resultsCache.filter(r => !set.has(r.id));
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getStudents(): Promise<Student[]> {
    const now = Date.now();
    if (this.studentsCache && (now - this.studentsCacheTime < 60000)) {
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

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const cleanId = studentId.trim();
    const all = await this.getStudents();
    return all.find(item => item.studentId.trim().toLowerCase() === cleanId.toLowerCase() || item.id === cleanId);
  }

  async getStudentForLogin(name: string, studentId: string): Promise<Student | undefined> {
    const cleanName = name.trim().toLowerCase();
    const cleanStudentId = studentId.trim().toLowerCase();
    const [student] = await db.select().from(students).where(sql`
      lower(trim(${students.studentId})) = ${cleanStudentId}
      and lower(trim(${students.name})) = ${cleanName}
    `).limit(1);
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [created] = await db.insert(students).values(student).returning();
    if (this.studentsCache && created) {
      this.studentsCache = [...this.studentsCache, created];
    }
    return created;
  }

  async createStudents(insertStudents: InsertStudent[]): Promise<Student[]> {
    if (insertStudents.length === 0) return [];
    const created = await db.insert(students).values(insertStudents).onConflictDoNothing().returning();
    if (this.studentsCache && created.length > 0) {
      this.studentsCache = [...this.studentsCache, ...created];
    }
    return created;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    const [updated] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    if (this.studentsCache && updated) {
      this.studentsCache = this.studentsCache.map(s => s.id === id ? updated : s);
    }
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
    if (this.studentsCache) {
      this.studentsCache = this.studentsCache.filter(s => s.id !== id);
    }
  }

  async toggleStudentExamBlock(studentId: string, examId: string, blockState: boolean): Promise<void> {
    let student = await this.getStudentByStudentId(studentId);
    let targetId = student?.id;
    if (!student) {
      const [byUuid] = await db.select().from(students).where(eq(students.id, studentId));
      if (!byUuid) return;
      student = byUuid;
      targetId = byUuid.id;
    }
    let blocked = (student.blockedExams as string[]) || [];
    if (blockState) {
      if (!blocked.includes(examId)) blocked = [...blocked, examId];
    } else {
      blocked = blocked.filter(id => id !== examId);
    }
    await db.update(students).set({ blockedExams: blocked }).where(eq(students.id, targetId!));
    if (this.studentsCache) {
      this.studentsCache = this.studentsCache.map(s => s.id === targetId ? { ...s, blockedExams: blocked } : s);
    }
  }

  async deleteExamSessionsForStudent(studentId: string, examId: string): Promise<void> {
    await db.delete(examSessions).where(
      and(
        eq(examSessions.studentId, studentId),
        eq(examSessions.examId, examId)
      )
    );
  }

  async purgeTestAttempts(): Promise<void> {
    await db.delete(results).where(eq(results.isTestAttempt, true));
    await db.delete(examSessions).where(eq(examSessions.isTestAttempt, true));
    if (this.resultsCache) {
      this.resultsCache = this.resultsCache.filter(r => !r.isTestAttempt);
    }
  }

  async getSystemSettings(): Promise<SystemSettings> {
    if (this.systemSettingsCache) {
      return this.systemSettingsCache;
    }
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "global"));
    const finalSettings = (settings as unknown as SystemSettings) || defaultSystemSettings;
    this.systemSettingsCache = finalSettings;
    return finalSettings;
  }

  async saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSystemSettings();
    const updated = { ...existing, ...settings };
    await db.insert(systemSettings).values({ id: "global", ...updated } as any)
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: updated
      });
    this.systemSettingsCache = updated;
    return updated;
  }
}

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production; refusing to start with volatile in-memory storage.");
}

export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

