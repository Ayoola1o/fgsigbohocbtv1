import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getFirestoreResults, getFirestoreQuestions, getFirestoreExams } from "./firebase";
import {
  insertQuestionSchema,
  insertExamSchema,
  insertExamSessionSchema,
  type Question,
} from "../shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";
import fs from "fs";
import { extractTextFromFile } from "./docx-reader";
import { GoogleGenAI } from "@google/genai";

// Configure multer for local storage
// Configure multer for local storage
const upload = multer({
  storage: process.env.VERCEL
    ? multer.memoryStorage()
    : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}-${file.originalname}`);
      }
    }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin auth routes

  // Serve uploaded files statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      // Return relative path that can be served by the static middleware, or base64 Data URI if using memory storage
      const url = req.file.filename
        ? `/uploads/${req.file.filename}`
        : `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      res.json({ url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
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

      // store minimal session info
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session = (req as any).session || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session.userId = user.id;
      } catch (e) {
        // ignore session set failure
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

  app.post("/api/admin/logout", async (req, res) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (req as any).session;
      if (s && typeof s.destroy === "function") {
        s.destroy(() => {
          res.json({ ok: true });
        });
      } else {
        // clear userId if possible
        if (s) s.userId = undefined;
        res.json({ ok: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/admin/me", async (req, res) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (req as any).session;
      const uid = s && s.userId;
      if (!uid) return res.status(401).json({ error: "Not authenticated" });
      const user = await storage.getUserByUsername((await storage.getUserByUsername("Admin"))?.username || "");
      // return minimal info
      res.json({ id: uid, username: user?.username || "Admin" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  // Questions API
  app.get("/api/questions", async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.get("/api/questions/:id", async (req, res) => {
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

  app.post("/api/questions", async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  // Bulk questions import (accepts JSON array of questions)
  app.post("/api/questions/bulk", async (req, res) => {
    try {
      const payload = req.body;
      if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Expected an array of questions" });
      }

      const successes: any[] = [];
      const errors: { row: number; reason: string }[] = [];
      for (let i = 0; i < payload.length; i++) {
        const raw = payload[i];

        // Normalize options: allow JSON string or pipe-separated
        if (raw && typeof raw.options === "string") {
          try {
            raw.options = JSON.parse(raw.options);
          } catch (e) {
            // try splitting by pipe
            raw.options = raw.options.split("|").map((p: string) => p.trim()).filter(Boolean);
          }
        }

        const parsed = insertQuestionSchema.safeParse(raw);
        if (!parsed.success) {
          errors.push({ row: i, reason: JSON.stringify(parsed.error.errors) });
          continue;
        }

        successes.push(parsed.data);
      }

      // Insert valid rows in chunks to avoid huge single inserts
      const created: any[] = [];
      const chunkSize = 200;
      for (let i = 0; i < successes.length; i += chunkSize) {
        const chunk = successes.slice(i, i + chunkSize);
        const createdChunk = await storage.createQuestions(chunk as any);
        created.push(...createdChunk);
      }

      res.json({ insertedCount: created.length, inserted: created, errors });
    } catch (error) {
      res.status(500).json({ error: "Failed to import questions" });
    }
  });

  // Smart AI Question Importer Route
  app.post("/api/questions/import-ai", upload.single("file"), async (req, res) => {
    try {
      // Metadata fallback from query / body
      const defaultMeta = {
        classLevel: req.query.classLevel || req.body.classLevel || "SS3",
        term: req.query.term || req.body.term || "First Term",
        examType: req.query.examType || req.body.examType || "Objectives",
        subject: req.query.subject || req.body.subject || "Biology",
        department: req.query.department || req.body.department || "General",
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

      console.log(`AI Importer: Sending raw text to Gemini AI using ${isObjectives ? 'Objectives' : 'Theory'} schema...`);
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
5. questionType: Must be strictly 'multiple_choice'.
6. examType: Must be strictly 'Objectives'.
7. difficulty: Must be strictly 'Easy', 'Medium', or 'Hard'. Capitalize first letter. Default to 'Medium'.
8. points: Must be a valid integer, defaulting to 1 if unknown.

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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}\n\nDocument Content to Parse:\n---\n${rawText}\n---`,
        config: {
          responseMimeType: "application/json",
          responseSchema: isObjectives ? objectivesSchema : theorySchema,
          temperature: 0.1
        }
      });

      console.log("AI Importer: Received successful structured response from Gemini AI.");
      const parsedData = JSON.parse(response.text || '{}');
      res.json(parsedData);
    } catch (error) {
      console.error("AI Importer Error:", error);
      res.status(500).json({ 
        error: "Failed to parse questions with AI", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Local Smart Regex Fallback Parser
  function fallbackParseQuestions(text: string, defaultMeta: any) {
    const questions: any[] = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    let currentQuestion: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match "1. What is...", "Q2: ...", "3) ..."
      const questionMatch = line.match(/^(\d+)[\.\):]?\s*(.*)/);
      
      if (questionMatch) {
        if (currentQuestion) {
          questions.push(currentQuestion);
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
        // Match "A. Option", "b) Option", "[C] Option"
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
      questions.push(currentQuestion);
    }
    
    // Clean up answers and options
    questions.forEach(q => {
      if (q.options.length === 0) {
        q.questionType = "fill_in_the_blank";
        q.correctAnswer = q.correctAnswer || "Answer";
      } else {
        if (!q.correctAnswer) {
          q.correctAnswer = q.options[0];
        }
      }
    });
    
    return { questions };
  }


  app.delete("/api/questions/:id", async (req, res) => {
    try {
      await storage.deleteQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  app.delete("/api/questions", async (req, res) => {
    try {
      const { ids } = req.body as { ids?: string[] };
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      await storage.deleteQuestions(ids);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete questions" });
    }
  });

  // Bulk fetch questions by IDs
  app.post("/api/questions/bulk-fetch", async (req, res) => {
    try {
      const { ids } = req.body as { ids?: string[] };
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request body: 'ids' array is required." });
      }
      const questions = await storage.getQuestionsByIds(ids);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions by IDs" });
    }
  });

  // Exams API
  app.get("/api/exams", async (req, res) => {
    try {
      const { classLevel } = req.query;
      // If a student is logged in, force filter to student's class level
      let effectiveClassLevel = classLevel as string | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = (req as any).session;
        if (s && s.studentId) {
          const student = await storage.getStudentById(s.studentId);
          if (student && (student as any).classLevel) {
            effectiveClassLevel = (student as any).classLevel;
          }
        }
      } catch (e) {
        // ignore session errors
      }
      const exams = await storage.getExams(effectiveClassLevel);
      res.json(exams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });

  app.get("/api/exams/:id", async (req, res) => {
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

  app.get("/api/exams/:id/questions", async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      const questions: Question[] = [];
      for (const questionId of exam.questionIds) {
        const question = await storage.getQuestion(questionId);
        if (question) {
          questions.push(question);
        }
      }

      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam questions" });
    }
  });

  app.post("/api/exams", async (req, res) => {
    try {
      const validatedData = insertExamSchema.parse(req.body);

      // If numberOfQuestionsToDisplay is provided but questionIds not provided,
      // randomly select questions from the questions bank filtered by class level (and subject when present)
      let questionIds = validatedData.questionIds ?? [];
      if ((!questionIds || questionIds.length === 0) && validatedData.numberOfQuestionsToDisplay && validatedData.numberOfQuestionsToDisplay > 0) {
        const pool = (await storage.getQuestions()).filter(q => q.classLevel === validatedData.classLevel && (!validatedData.subject || q.subject === validatedData.subject));
        if (pool.length < validatedData.numberOfQuestionsToDisplay) {
          return res.status(400).json({ error: `Not enough questions in bank for class level ${validatedData.classLevel}` });
        }
        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        questionIds = pool.slice(0, validatedData.numberOfQuestionsToDisplay).map(q => q.id);
      }

      const examData = { ...validatedData, questionIds } as any;
      const exam = await storage.createExam(examData);
      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create exam" });
    }
  });

  // Student login (Student Name as username, Student ID as password)
  app.post("/api/students/login", async (req, res) => {
    try {
      const { username, password, studentName, studentId, name: bodyName } = req.body as any;
      const name = username || studentName || bodyName;
      const sid = password || studentId;

      if (!name || !sid) {
        return res.status(400).json({ error: "Student name and ID are required" });
      }

      // Get all students and perform case-insensitive search
      const allStudents = await storage.getStudents();
      const student = allStudents.find(s =>
        s.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        s.studentId.toLowerCase().trim() === sid.toLowerCase().trim()
      );

      if (!student) {
        console.log(`Login failed for name: "${name}", ID: "${sid}"`);
        console.log(`Available students:`, allStudents.map(s => ({ name: s.name, id: s.studentId })));
        return res.status(401).json({ error: "Invalid student name or ID. Please check your credentials." });
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session = (req as any).session || {};
        // store student internal id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).session.studentId = student.id;
      } catch (e) {
        // ignore session set failure
      }

      res.json({
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        classLevel: (student as any).classLevel,
        department: (student as any).department || "General",
        sex: (student as any).sex || "M"
      });
    } catch (error) {
      console.error("Student login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.patch("/api/exams/:id", async (req, res) => {
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

  app.delete("/api/exams/:id", async (req, res) => {
    try {
      await storage.deleteExam(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exam" });
    }
  });

  // Exam Sessions API
  app.get("/api/exam-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getExamSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Exam session not found" });
      }
      res.json({ ...session, serverTime: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exam session" });
    }
  });

  app.post("/api/exam-sessions", async (req, res) => {
    try {
      const validatedData = insertExamSessionSchema.parse(req.body);
      const exam = await storage.getExam(validatedData.examId);

      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      let sessionQuestionIds = [...exam.questionIds];

      // Shuffle the array
      for (let i = sessionQuestionIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sessionQuestionIds[i], sessionQuestionIds[j]] = [sessionQuestionIds[j], sessionQuestionIds[i]];
      }

      if (exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0 && exam.numberOfQuestionsToDisplay < sessionQuestionIds.length) {
        sessionQuestionIds = sessionQuestionIds.slice(0, exam.numberOfQuestionsToDisplay);
      }

      const sessionData = {
        ...validatedData,
        sessionQuestionIds,
      }

      const session = await storage.createExamSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating exam session:", error);
      res.status(500).json({ error: "Failed to create exam session" });
    }
  });

  app.patch("/api/exam-sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateExamSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Exam session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update exam session" });
    }
  });

  app.post("/api/exam-sessions/:id/submit", async (req, res) => {
    try {
      const session = await storage.getExamSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Exam session not found" });
      }

      if (session.isCompleted) {
        const existingResult = await storage.getResultBySessionId(session.id);
        if (existingResult) {
          return res.json(existingResult);
        }
      }

      const exam = await storage.getExam(session.examId);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      const questionIdsToGrade = session.sessionQuestionIds || exam.questionIds;

      // Get all questions for this exam
      const questions: Question[] = [];
      for (const questionId of questionIdsToGrade) {
        const question = await storage.getQuestion(questionId);
        if (question) {
          questions.push(question);
        }
      }

      // Grade the exam
      const answers = req.body.answers || session.answers || {};
      const correctAnswers: Record<string, boolean> = {};
      let score = 0;
      let sessionTotalPoints = 0;

      for (const question of questions) {
        sessionTotalPoints += question.points;
        const studentAnswer = answers[question.id];
        const isCorrect =
          studentAnswer &&
          studentAnswer.trim().toLowerCase() ===
          question.correctAnswer.trim().toLowerCase();
        correctAnswers[question.id] = isCorrect;
        if (isCorrect) {
          score += question.points;
        }
      }

      const percentage = sessionTotalPoints > 0 ? Math.round((score / sessionTotalPoints) * 100) : 0;
      const passed = percentage >= exam.passingScore;

      // Mark session as completed
      await storage.updateExamSession(session.id, {
        isCompleted: true,
        endedAt: new Date(),
        answers,
      });

      const submissionType = req.body.submissionType || 'student';

      // Create result
      const result = await storage.createResult({
        sessionId: session.id,
        examId: exam.id,
        studentName: session.studentName,
        studentId: session.studentId,
        score,
        totalPoints: sessionTotalPoints,
        percentage,
        passed,
        submissionType,
        answers,
        correctAnswers,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit exam" });
    }
  });

  // Results API
  app.get("/api/results", async (req, res) => {
    try {
      const results = await storage.getResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.get("/api/results/:id", async (req, res) => {
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

  // Students API - simple in-memory student management
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const payload = req.body;

      if (Array.isArray(payload)) {
        // array of {name, studentId, classLevel, sex}
        const rows = payload as { name?: string; studentId?: string; classLevel?: string; sex?: string }[];
        const toCreate = rows
          .filter((r) => r && r.name && r.studentId && r.classLevel)
          .map((r) => ({
            name: r.name as string,
            studentId: r.studentId as string,
            classLevel: r.classLevel as any,
            sex: r.sex as any
          }));
        const created = await storage.createStudents(toCreate);
        return res.status(201).json(created);
      }

      if (payload && typeof payload === "object") {
        const { name, studentId, classLevel, sex } = payload as any;
        if (!name || !studentId || !classLevel) {
          return res.status(400).json({ error: "name, studentId, and classLevel required" });
        }
        const created = await storage.createStudent({ name, studentId, classLevel, sex });
        return res.status(201).json(created);
      }

      res.status(400).json({ error: "Invalid payload" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create students" });
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const data = req.body as { name?: string; studentId?: string };
      const updated = await storage.updateStudent(id, data as any);
      if (!updated) return res.status(404).json({ error: "Student not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteStudent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // ─── Server-Side Psychometric Analytics Engine ───
  // Moves ALL heavy computation off the browser thread to eliminate client freezing.
  app.get("/api/analytics", async (req, res) => {
    try {
      const selectedExamId = (req.query.examId as string) || "__all__";
      const termFilter = (req.query.term as string) || "__all__";
      const classFilter = (req.query.classLevel as string) || "__all__";
      const subjectFilter = (req.query.subject as string) || "__all__";
      const studentFilter = (req.query.studentId as string) || "__all__";

      let allResults: any[] = [];
      let allQuestions: any[] = [];
      let allExams: any[] = [];
      let allStudents: any[] = [];
      let allExamSessions: any[] = [];

      try {
        allResults = await getFirestoreResults();
      } catch (e) {
        console.warn("⚠️ [routes.ts] Firestore results fetch failed. Falling back to local storage:", e);
        allResults = await storage.getResults();
      }

      try {
        allQuestions = await getFirestoreQuestions();
      } catch (e) {
        console.warn("⚠️ [routes.ts] Firestore questions fetch failed. Falling back to local storage:", e);
        allQuestions = await storage.getQuestions();
      }

      try {
        allExams = await getFirestoreExams();
      } catch (e) {
        console.warn("⚠️ [routes.ts] Firestore exams fetch failed. Falling back to local storage:", e);
        allExams = await storage.getExams();
      }

      // Fetch students from Firestore or local storage
      try {
        const { db: firestoreDb } = await import("./firebase");
        if (firestoreDb) {
          const { collection, getDocs } = await import("firebase/firestore");
          const snapshot = await getDocs(collection(firestoreDb, "students"));
          allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("⚠️ Firestore students fetch failed. Falling back to local storage:", e);
      }
      if (allStudents.length === 0) {
        allStudents = await storage.getStudents();
      }

      // Fetch sessions from Firestore or local storage
      try {
        const { db: firestoreDb } = await import("./firebase");
        if (firestoreDb) {
          const { collection, getDocs } = await import("firebase/firestore");
          const snapshot = await getDocs(collection(firestoreDb, "exam_sessions"));
          allExamSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("⚠️ Firestore exam sessions fetch failed. Falling back to local storage:", e);
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
          const { calculatePsychometrics } = require(path.join(process.cwd(), "workers", "psychometricWorker.js"));
          const computedData = calculatePsychometrics(workerPayload);
          res.json(computedData);
        } catch (calcError: any) {
          console.error("Inline psychometrics computation failed:", calcError);
          res.status(500).json({
            error: "Analytics computation failed",
            details: calcError.message || String(calcError)
          });
        }
      };

      try {
        let hasFinished = false;
        const { Worker } = require("worker_threads");
        const worker = new Worker(path.join(process.cwd(), "workers", "psychometricWorker.js"), {
          workerData: workerPayload
        });

        worker.on("message", (computedData: any) => {
          hasFinished = true;
          if (computedData.error) {
            res.status(500).json({ error: computedData.error });
          } else {
            res.json(computedData);
          }
        });

        worker.on("error", (err: Error) => {
          console.error("Worker Thread error, falling back to inline calculation:", err);
          runInline();
        });

        worker.on("exit", (code: number) => {
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

  const httpServer = createServer(app);

  return httpServer;
}
