import {
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
  type InsertStudent
} from "../shared/schema";
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
  deleteQuestion(id: string): Promise<void>;
  deleteQuestions(ids: string[]): Promise<void>;

  // Exams
  getExams(classLevel?: string): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, data: Partial<Exam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<void>;

  // Exam Sessions
  getExamSession(id: string): Promise<ExamSession | undefined>;
  createExamSession(session: InsertExamSession): Promise<ExamSession>;
  updateExamSession(
    id: string,
    data: Partial<ExamSession>
  ): Promise<ExamSession | undefined>;

  // Results
  getResults(): Promise<Result[]>;
  getResult(id: string): Promise<Result | undefined>;
  getResultBySessionId(sessionId: string): Promise<Result | undefined>;
  createResult(result: InsertResult): Promise<Result>;

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
}

export class MemStorage implements IStorage {
  private questions: Map<string, Question>;
  private exams: Map<string, Exam>;
  private examSessions: Map<string, ExamSession>;
  private results: Map<string, Result>;
  private users: Map<string, User>;
  private students: Map<string, Student>;

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
      imageUrl: insertQuestion.imageUrl ?? null
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
      isActive: true,
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
    };
    this.results.set(id, result);
    return result;
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
      sex: insertStudent.sex || null
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
}

export const storage = new MemStorage();

