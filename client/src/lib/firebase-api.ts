import { db } from "./firebase";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDoc,
    setDoc,
    writeBatch,
    documentId,
    Timestamp
} from "firebase/firestore";
import type {
    Question,
    InsertQuestion,
    Exam,
    InsertExam,
    Student,
    InsertStudent,
    User,
    ExamSession,
    InsertExamSession,
    Result,
    InsertResult
} from "@shared/schema";

// Helper to convert Firestore doc to typed object
const docToData = <T>(doc: any): T => {
    const data = doc.data();
    // Convert Firestore Timestamps to JS Dates
    Object.keys(data).forEach(key => {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate();
        }
    });
    return { id: doc.id, ...data } as T;
};

// Helper to remove undefined values from objects (Firestore doesn't like them)
const cleanData = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (obj instanceof Timestamp) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => cleanData(item));
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = cleanData(obj[key]);
        }
    });
    return newObj;
};

// --- Questions ---
export const getQuestions = async (): Promise<Question[]> => {
    const snapshot = await getDocs(collection(db, "questions"));
    return snapshot.docs.map(d => docToData<Question>(d));
};

export const getQuestion = async (id: string): Promise<Question | null> => {
    const d = await getDoc(doc(db, "questions", id));
    return d.exists() ? docToData<Question>(d) : null;
};

export const getQuestionsByIds = async (ids: string[]): Promise<Question[]> => {
    if (!ids || ids.length === 0) return [];
    // Firestore 'in' query supports up to 10 items.
    // If more, we need multiple queries or just fetch all and filter (for offline/small scale).
    // Given "offline" requirement and likely small dataset, fetching all is safest/easiest.
    // Or we can fetch individually.

    // Optimization: Fetch all questions (cached) and filter.
    const all = await getQuestions();
    return all.filter(q => ids.includes(q.id));
};

export const createQuestion = async (question: InsertQuestion): Promise<Question> => {
    const data = cleanData(question);
    const ref = await addDoc(collection(db, "questions"), data);
    return { id: ref.id, ...data } as Question;
};

export const createQuestionsBulk = async (questions: InsertQuestion[]): Promise<Question[]> => {
    const batch = writeBatch(db);
    const created: Question[] = [];

    questions.forEach(q => {
        const ref = doc(collection(db, "questions"));
        const data = cleanData(q);
        batch.set(ref, data);
        created.push({ id: ref.id, ...data } as Question);
    });

    await batch.commit();
    return created;
};

export const deleteQuestion = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "questions", id));
};

export const deleteQuestionsBulk = async (ids: string[]): Promise<void> => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(db, "questions", id));
    });
    await batch.commit();
};

// --- Exams ---
export const getExams = async (classLevel?: string): Promise<Exam[]> => {
    let q = query(collection(db, "exams"));
    if (classLevel) {
        q = query(collection(db, "exams"), where("classLevel", "==", classLevel));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => docToData<Exam>(d));
};

export const getExam = async (id: string): Promise<Exam | null> => {
    console.log(`getExam: Fetching exam ${id}...`);
    try {
        const d = await getDoc(doc(db, "exams", id));
        if (!d.exists()) {
            console.warn(`getExam: Exam ${id} not found.`);
            return null;
        }
        const data = docToData<Exam>(d);
        console.log(`getExam: Successfully fetched exam ${id}.`);
        return { ...data, questionIds: data.questionIds || [] };
    } catch (error) {
        console.error(`getExam: Error fetching exam ${id}:`, error);
        throw error;
    }
};

export const createExam = async (exam: InsertExam): Promise<Exam> => {
    let finalExam = { ...exam } as any;

    if ((!exam.questionIds || exam.questionIds.length === 0) && exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0) {
        const allQuestions = await getQuestions();
        const pool = allQuestions.filter(q => q.classLevel === exam.classLevel && (!exam.subject || q.subject === exam.subject));

        // Store ALL matching questions in the pool so sessions can pick random subsets
        finalExam.questionIds = pool.map(q => q.id);
    }

    let totalPoints = 0;
    if (finalExam.questionIds && finalExam.questionIds.length > 0) {
        const allQuestions = await getQuestions();
        const questionMap = new Map(allQuestions.map(q => [q.id, q]));

        finalExam.questionIds.forEach((qid: string) => {
            const q = questionMap.get(qid);
            if (q) totalPoints += q.points;
        });
    }

    const examData = cleanData({
        ...finalExam,
        totalPoints,
        createdAt: new Date(),
        isActive: true
    });

    const ref = await addDoc(collection(db, "exams"), examData);
    return { id: ref.id, ...examData } as Exam;
};

export const updateExam = async (id: string, updates: Partial<Exam>): Promise<void> => {
    await updateDoc(doc(db, "exams", id), cleanData(updates));
};

export const deleteExam = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "exams", id));
};

// --- Students ---
export const getStudents = async (): Promise<Student[]> => {
    const snapshot = await getDocs(collection(db, "students"));
    return snapshot.docs.map(d => docToData<Student>(d));
};

export const createStudent = async (student: InsertStudent): Promise<Student> => {
    const data = cleanData(student);
    const ref = await addDoc(collection(db, "students"), data);
    return { id: ref.id, ...data } as Student;
};

export const createStudentsBulk = async (students: InsertStudent[]): Promise<Student[]> => {
    const batch = writeBatch(db);
    const created: Student[] = [];

    students.forEach(s => {
        const ref = doc(collection(db, "students"));
        const data = cleanData(s);
        batch.set(ref, data);
        created.push({ id: ref.id, ...data } as Student);
    });

    await batch.commit();
    return created;
};

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<void> => {
    await updateDoc(doc(db, "students", id), cleanData(updates));
};

export const deleteStudent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "students", id));
};

export const studentLogin = async (name: string, studentId: string): Promise<Student | null> => {
    const students = await getStudents();
    return students.find(s =>
        s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase()
    ) || null;
};

// --- Admin ---
export const adminLogin = async (username: string, password: string): Promise<User | null> => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const user = docToData<User>(snapshot.docs[0]);
    if (user.password !== password) return null;

    return user;
};

// --- Exam Sessions ---
export const getExamSession = async (id: string): Promise<(ExamSession & { serverTime?: string }) | null> => {
    const d = await getDoc(doc(db, "exam_sessions", id));
    return d.exists() ? { ...docToData<ExamSession>(d), serverTime: new Date().toISOString() } : null;
};

export const createExamSession = async (session: InsertExamSession): Promise<ExamSession> => {
    try {
        const exam = await getExam(session.examId);
        if (!exam) {
            console.error(`createExamSession: Exam not found for ID ${session.examId}`);
            throw new Error("Exam not found");
        }

        let sessionQuestionIds = [...exam.questionIds];
        // Shuffle questions for this specific session
        // This ensures that if the exam pool (exam.questionIds) is larger than numberOfQuestionsToDisplay,
        // each student will get a different random subset of questions.
        for (let i = sessionQuestionIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sessionQuestionIds[i], sessionQuestionIds[j]] = [sessionQuestionIds[j], sessionQuestionIds[i]];
        }

        if (exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0 && exam.numberOfQuestionsToDisplay < sessionQuestionIds.length) {
            sessionQuestionIds = sessionQuestionIds.slice(0, exam.numberOfQuestionsToDisplay);
        }

        const sessionData = cleanData({
            ...session,
            sessionQuestionIds,
            startedAt: new Date(),
            isCompleted: false,
            answers: {},
            currentQuestionIndex: 0
        });

        console.log("createExamSession: Preparing document reference...");
        const sessionRef = doc(collection(db, "exam_sessions"));
        const sessionId = sessionRef.id;
        console.log("createExamSession: Generated session ID:", sessionId);

        console.log("createExamSession: Saving session to Firestore (setDoc)...");
        const savePromise = setDoc(sessionRef, sessionData);

        // In offline-first mode with persistence, we don't want to wait indefinitely for server ACK
        // if the connection is flaky. We'll give it a 2s window to resolve (which it will if local save is fast),
        // then proceed regardless.
        await Promise.race([
            savePromise,
            new Promise(resolve => setTimeout(resolve, 2000))
        ]);

        console.log(`createExamSession: Proceeding with session ${sessionId} (local write initiated/saved).`);

        return { id: sessionId, ...sessionData } as unknown as ExamSession;
    } catch (error) {
        console.error("Error in createExamSession:", error);
        // Clean up error message for UI
        if (error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
            throw new Error("Permission denied. You may not be authorized to start an exam.");
        }
        throw error;
    }
};

export const updateExamSession = async (id: string, updates: Partial<ExamSession>): Promise<void> => {
    await updateDoc(doc(db, "exam_sessions", id), updates);
};

export const submitExamSession = async (sessionId: string, answers: Record<string, string>, submissionType: 'student' | 'auto' = 'student'): Promise<Result> => {
    const session = await getExamSession(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.isCompleted) {
        const q = query(collection(db, "results"), where("sessionId", "==", sessionId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return docToData<Result>(snapshot.docs[0]);
    }

    const exam = await getExam(session.examId);
    if (!exam) throw new Error("Exam not found");

    const questionIdsToGrade = session.sessionQuestionIds || exam.questionIds;
    const allQuestions = await getQuestions();
    const questionMap = new Map(allQuestions.map(q => [q.id, q]));

    const correctAnswers: Record<string, boolean> = {};
    let score = 0;
    let sessionTotalPoints = 0;

    for (const qId of questionIdsToGrade) {
        const q = questionMap.get(qId);
        if (q) {
            // Ensure points is treated as a number
            const points = Number(q.points) || 1;
            sessionTotalPoints += points;
            const studentAnswer = answers[qId];
            const isTheory = q.questionType === "theory" || exam.examType === "Theory";
            // Theory questions are now display-only, so we treat them as "completed/correct" by default if they are part of the session
            const isCorrect = isTheory
                ? true
                : !!studentAnswer && !!q.correctAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

            correctAnswers[qId] = isCorrect;
            if (isCorrect) score += points;
        }
    }

    const percentage = sessionTotalPoints > 0 ? Math.round((score / sessionTotalPoints) * 100) : 0;
    const passed = percentage >= exam.passingScore;

    await updateExamSession(sessionId, {
        isCompleted: true,
        endedAt: new Date(),
        answers
    });

    const resultData = cleanData({
        sessionId,
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
        completedAt: new Date()
    });

    console.log("submitExamSession: Saving result to Firestore...");
    const resultRef = doc(collection(db, "results"));
    const resultId = resultRef.id;
    const savePromise = setDoc(resultRef, cleanData(resultData));

    // Proceed after 3s even if server hasn't acknowledged, to allow user to see result screen
    await Promise.race([
        savePromise,
        new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    console.log(`submitExamSession: Result ${resultId} saved locally/initiated.`);
    return { id: resultId, ...resultData } as unknown as Result;
};

// --- Results ---
export const getResults = async (): Promise<Result[]> => {
    const snapshot = await getDocs(collection(db, "results"));
    return snapshot.docs.map(d => docToData<Result>(d));
};

export const getResult = async (id: string): Promise<Result | null> => {
    const d = await getDoc(doc(db, "results", id));
    return d.exists() ? docToData<Result>(d) : null;
};
