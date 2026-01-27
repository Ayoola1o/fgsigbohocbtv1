import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Question Types
export const questionTypes = ["multiple-choice", "true-false", "short-answer", "theory"] as const;
export const difficultyLevels = ["easy", "medium", "hard"] as const;
export const termOptions = ["First Term", "Second Term", "Third Term", "Others"] as const;
export const examTypeOptions = ["Objectives", "Theory"] as const;


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
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

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
  isActive: boolean("is_active").notNull().default(true),
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
  theoryConfig: z.any().optional(),
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
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  completedAt: true,
}).extend({
  submissionType: z.enum(['student', 'auto']).optional(),
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
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
}).extend({
  classLevel: z.enum(classLevels),
  sex: z.enum(["M", "F"]).optional(),
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
