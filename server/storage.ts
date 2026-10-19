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
import { eq, inArray, and } from "drizzle-orm";
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
  createExamSession(session: InsertExamSession): Promise<ExamSession>;
  updateExamSession(
    id: string,
    data: Partial<ExamSession>
  ): Promise<ExamSession | undefined>;
  deleteExamSession(id: string): Promise<void>;

  // Results
  getResults(): Promise<Result[]>;
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
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [q] = await db.select().from(questions).where(eq(questions.id, id));
    return q;
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (!ids || ids.length === 0) return [];
    return await db.select().from(questions).where(inArray(questions.id, ids));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [created] = await db.insert(questions).values(question).returning();
    return created;
  }

  async createQuestions(insertQuestions: InsertQuestion[]): Promise<Question[]> {
    if (insertQuestions.length === 0) return [];
    return await db.insert(questions).values(insertQuestions).returning();
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return updated;
  }

  async updateQuestions(ids: string[], updates: Partial<Question>): Promise<void> {
    if (ids.length === 0) return;
    await db.update(questions).set(updates).where(inArray(questions.id, ids));
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async deleteQuestions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(questions).where(inArray(questions.id, ids));
  }

  async getExams(classLevel?: string): Promise<Exam[]> {
    if (classLevel) {
      return await db.select().from(exams).where(eq(exams.classLevel, classLevel));
    }
    return await db.select().from(exams);
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const [e] = await db.select().from(exams).where(eq(exams.id, id));
    return e;
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const [created] = await db.insert(exams).values({ totalPoints: 0, ...exam } as any).returning();
    return created;
  }

  async updateExam(id: string, data: Partial<Exam>): Promise<Exam | undefined> {
    const [updated] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    return updated;
  }

  async deleteExam(id: string): Promise<void> {
    await db.delete(exams).where(eq(exams.id, id));
  }

  async getExamSessions(): Promise<ExamSession[]> {
    return await db.select().from(examSessions);
  }

  async getExamSession(id: string): Promise<ExamSession | undefined> {
    const [s] = await db.select().from(examSessions).where(eq(examSessions.id, id));
    return s;
  }

  async createExamSession(session: InsertExamSession): Promise<ExamSession> {
    const [created] = await db.insert(examSessions).values(session).returning();
    return created;
  }

  async updateExamSession(id: string, data: Partial<ExamSession>): Promise<ExamSession | undefined> {
    const [updated] = await db.update(examSessions).set(data).where(eq(examSessions.id, id)).returning();
    return updated;
  }

  async deleteExamSession(id: string): Promise<void> {
    await db.delete(examSessions).where(eq(examSessions.id, id));
  }

  async getResults(): Promise<Result[]> {
    return await db.select().from(results);
  }

  async getResult(id: string): Promise<Result | undefined> {
    const [r] = await db.select().from(results).where(eq(results.id, id));
    return r;
  }

  async getResultBySessionId(sessionId: string): Promise<Result | undefined> {
    const [r] = await db.select().from(results).where(eq(results.sessionId, sessionId));
    return r;
  }

  async createResult(result: InsertResult): Promise<Result> {
    const [created] = await db.insert(results).values(result).returning();
    return created;
  }

  async deleteResult(id: string): Promise<void> {
    await db.delete(results).where(eq(results.id, id));
  }

  async deleteResults(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(results).where(inArray(results.id, ids));
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
    return await db.select().from(students);
  }

  async getStudentByStudentId(studentId: string): Promise<Student | undefined> {
    const cleanId = studentId.trim();
    const [s] = await db.select().from(students).where(eq(students.studentId, cleanId));
    if (s) return s;
    const all = await this.getStudents();
    return all.find(item => item.studentId.trim().toLowerCase() === cleanId.toLowerCase());
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [created] = await db.insert(students).values(student).returning();
    return created;
  }

  async createStudents(insertStudents: InsertStudent[]): Promise<Student[]> {
    if (insertStudents.length === 0) return [];
    return await db.insert(students).values(insertStudents).onConflictDoNothing().returning();
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    const [updated] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
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
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "global"));
    return (settings as unknown as SystemSettings) || defaultSystemSettings;
  }

  async saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSystemSettings();
    const updated = { ...existing, ...settings };
    await db.insert(systemSettings).values({ id: "global", ...updated } as any)
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: updated
      });
    return updated;
  }
}

export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

