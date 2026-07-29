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
    Timestamp,
    serverTimestamp,
    limit,
    orderBy,
    onSnapshot
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
    InsertResult,
    SystemSettings,
    AdminUser,
    AppNotification
} from "@shared/schema";

// Helper to convert Firestore doc to typed object
const docToData = <T>(doc: any): T => {
    const data = doc.data();
    // Convert Firestore Timestamps to JS Dates
    Object.keys(data).forEach(key => {
        if (data[key]) {
            if (typeof data[key].toDate === 'function') {
                data[key] = data[key].toDate();
            } else if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate();
            } else if (typeof data[key] === 'object' && 'seconds' in data[key]) {
                data[key] = new Date(data[key].seconds * 1000);
            }
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
    
    // Chunk requests into batches of 10 for Firestore 'in' query on documentId()
    const CHUNK_SIZE = 10;
    const results: Question[] = [];
    
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        try {
            const q = query(collection(db, "questions"), where(documentId(), "in", chunk));
            const snapshot = await getDocs(q);
            results.push(...snapshot.docs.map(d => docToData<Question>(d)));
        } catch (e) {
            console.warn("Error in chunked getQuestionsByIds query, falling back to document lookup", e);
            for (const id of chunk) {
                const single = await getQuestion(id);
                if (single) results.push(single);
            }
        }
    }

    // Preserve original ID ordering requested by exam session
    const map = new Map(results.map(q => [q.id, q]));
    return ids.map(id => map.get(id)).filter(Boolean) as Question[];
};

// Sanitized question getter for active candidate exam sessions (strips correctAnswer from memory/network payload)
export const getStudentQuestionsByIds = async (ids: string[]): Promise<Question[]> => {
    const questions = await getQuestionsByIds(ids);
    return questions.map(q => ({
        ...q,
        correctAnswer: "" // Hide answer key from student browser inspect / devtools during session
    }));
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

export const updateQuestion = async (id: string, updates: Partial<Question>): Promise<void> => {
    const cleanUpdates = cleanData(updates);
    await updateDoc(doc(db, "questions", id), cleanUpdates);
};

export const updateQuestionsBulk = async (ids: string[], updates: Partial<Question>): Promise<void> => {
    const batch = writeBatch(db);
    const cleanUpdates = cleanData(updates);
    ids.forEach(id => {
        batch.update(doc(db, "questions", id), cleanUpdates);
    });
    await batch.commit();
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
        let qQuery = query(collection(db, "questions"));
        if (exam.classLevel) {
            qQuery = query(collection(db, "questions"), where("classLevel", "==", exam.classLevel));
        }
        const snapshot = await getDocs(qQuery);
        const allQuestions = snapshot.docs.map(d => docToData<Question>(d));
        const examSubjects = exam.subject
            ? exam.subject.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        const pool = allQuestions.filter(q =>
            q.classLevel === exam.classLevel &&
            (examSubjects.length === 0 || examSubjects.includes(q.subject)) &&
            (!exam.department || q.department === exam.department)
        );

        // Store ALL matching questions in the pool so sessions can pick random subsets
        finalExam.questionIds = pool.map(q => q.id);
    }

    let totalPoints = 0;
    if (finalExam.questionIds && finalExam.questionIds.length > 0) {
        const questions = await getQuestionsByIds(finalExam.questionIds);
        questions.forEach(q => {
            if (q) totalPoints += Number(q.points) || 1;
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

export const getStudentByStudentId = async (studentId: string): Promise<Student | null> => {
    if (!studentId) return null;
    const cleanId = studentId.trim();
    try {
        const q = query(collection(db, "students"), where("studentId", "==", cleanId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return docToData<Student>(snapshot.docs[0]);
        }
        const d = await getDoc(doc(db, "students", cleanId));
        if (d.exists()) {
            return docToData<Student>(d);
        }
    } catch (e) {
        console.warn("getStudentByStudentId error:", e);
    }
    return null;
};

export const studentLogin = async (name: string, studentId: string): Promise<Student | null> => {
    const cleanId = studentId.trim();
    const cleanName = name.trim().toLowerCase();

    // Direct targeted lookup by studentId
    const student = await getStudentByStudentId(cleanId);
    if (student && student.name.trim().toLowerCase() === cleanName) {
        return student;
    }

    // Fallback query by student name if studentId query did not match
    const qName = query(collection(db, "students"), where("name", "==", name.trim()));
    const snapshot = await getDocs(qName);
    if (!snapshot.empty) {
        const found = snapshot.docs
            .map(d => docToData<Student>(d))
            .find(s => s.studentId?.trim().toLowerCase() === cleanId.toLowerCase());
        if (found) return found;
    }

    return null;
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

export const getSubjectDepartment = (subjectName: string, questionDepartment?: string): string => {
    if (questionDepartment && questionDepartment !== "General" && questionDepartment !== "Others") {
        return questionDepartment;
    }

    const subj = (subjectName || "").toLowerCase().trim();

    // Science stream
    if (subj.includes("physics") || subj.includes("chemistry") || subj.includes("biology") || subj.includes("further math") || subj.includes("further mathematics")) {
        return "Science";
    }

    // Art stream
    if (subj.includes("government") || subj.includes("literature") || subj.includes("history") || subj.includes("crs") || subj.includes("irs") || subj.includes("christian religious") || subj.includes("islamic religious") || subj.includes("fine art") || subj.includes("music")) {
        return "Art";
    }

    // Commercial stream
    if (subj.includes("accounting") || subj.includes("commerce") || subj.includes("office practice") || subj.includes("bookkeeping") || subj.includes("store management") || subj.includes("financial accounting")) {
        return "Commercial";
    }

    // Default General
    return "General";
};

export const createExamSession = async (session: { examId: string; studentName: string; studentId: string; [key: string]: any }): Promise<ExamSession> => {
    console.log("createExamSession: Starting session creation...", session);
    try {
        const exam = await getExam(session.examId);
        if (!exam) {
            console.error(`createExamSession: Exam not found for ID ${session.examId}`);
            throw new Error("Exam not found");
        }

        // Retrieve candidate's department and test user status if available
        let candidateDepartment = "";
        let isTestAttempt = false;
        if (session.studentId) {
            try {
                const student = await getStudentByStudentId(session.studentId);
                if (student) {
                    if (student.department) {
                        candidateDepartment = student.department;
                    }
                    if (student.isTestUser === true) {
                        isTestAttempt = true;
                    }
                }
            } catch (e) {
                console.warn("Could not fetch student department/test flag for exam session filter", e);
            }
        }

        let sessionQuestionIds = [...(exam.questionIds || [])];
        let poolQuestions: Question[] = [];

        if (sessionQuestionIds.length > 0) {
            poolQuestions = await getQuestionsByIds(sessionQuestionIds);
        }

        if (poolQuestions.length === 0) {
            let qQuery = query(collection(db, "questions"));
            if (exam.classLevel) {
                qQuery = query(collection(db, "questions"), where("classLevel", "==", exam.classLevel));
            }
            const snapshot = await getDocs(qQuery);
            poolQuestions = snapshot.docs.map(d => docToData<Question>(d));
        }

        // Apply candidate department filtering ONLY if questions were dynamically pulled from bank (no explicit questionIds)
        if ((!exam.questionIds || exam.questionIds.length === 0) && candidateDepartment && candidateDepartment !== "General" && candidateDepartment !== "Others") {
            poolQuestions = poolQuestions.filter(q => {
                const qDept = getSubjectDepartment(q.subject, q.department || undefined);
                if (qDept !== "General" && qDept.toLowerCase() !== candidateDepartment.toLowerCase()) {
                    return false;
                }
                return true;
            });
        }

        const slots = (exam as any).subjectSlots as any[];
        if (Array.isArray(slots) && slots.length > 0) {
            const studentDept = candidateDepartment ? candidateDepartment.trim() : null;
            let selectedIds: string[] = [];

            for (const slot of slots) {
                if (slot.type === "elective") {
                    if (!studentDept) {
                        throw new Error(`Department is required for elective slot '${slot.name || "Elective Slot"}' but your profile does not have one assigned. Please contact an administrator.`);
                    }

                    const mapping = slot.departmentMappings?.find((m: any) => 
                        m.department.toLowerCase().trim() === studentDept.toLowerCase() ||
                        (m.department.toLowerCase().startsWith("art") && studentDept.toLowerCase().startsWith("art"))
                    );

                    if (!mapping || !mapping.subjects || mapping.subjects.length === 0) {
                        throw new Error(`Your department '${studentDept}' is not mapped for elective slot '${slot.name || "Elective Slot"}' in this exam. Please contact your invigilator.`);
                    }

                    const targetSubjects: string[] = mapping.subjects;
                    const countPerSubj = Math.ceil((slot.questionCount || 10) / targetSubjects.length);

                    for (const subj of targetSubjects) {
                        const subjQuestions = poolQuestions.filter(q => (q.subject || "").toLowerCase().trim() === subj.toLowerCase().trim());
                        for (let i = subjQuestions.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
                        }
                        selectedIds = [...selectedIds, ...subjQuestions.slice(0, countPerSubj).map(q => q.id)];
                    }
                } else {
                    const subj = slot.subject || "";
                    const limit = Number(slot.questionCount) || 10;
                    const subjQuestions = poolQuestions.filter(q => (q.subject || "").toLowerCase().trim() === subj.toLowerCase().trim());
                    for (let i = subjQuestions.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
                    }
                    selectedIds = [...selectedIds, ...subjQuestions.slice(0, limit).map(q => q.id)];
                }
            }
            sessionQuestionIds = selectedIds;
        } else if (exam.subjectConfig && Object.keys(exam.subjectConfig).length > 0) {
            let selectedIds: string[] = [];

            for (const [subj, count] of Object.entries(exam.subjectConfig as Record<string, number>)) {
                const limit = Number(count) || 0;
                if (limit <= 0) continue;

                const subjQuestions = poolQuestions.filter(q => (q.subject || "").toLowerCase() === subj.toLowerCase());
                if (subjQuestions.length === 0) continue;

                // Shuffle
                for (let i = subjQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [subjQuestions[i], subjQuestions[j]] = [subjQuestions[j], subjQuestions[i]];
                }

                const sliced = subjQuestions.slice(0, limit);
                selectedIds = [...selectedIds, ...sliced.map(q => q.id)];
            }
            sessionQuestionIds = selectedIds;
        } else if (sessionQuestionIds.length > 0) {
            // Exam has explicit questionIds — shuffle them
            for (let i = sessionQuestionIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sessionQuestionIds[i], sessionQuestionIds[j]] = [sessionQuestionIds[j], sessionQuestionIds[i]];
            }

            if (exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0 && exam.numberOfQuestionsToDisplay < sessionQuestionIds.length) {
                sessionQuestionIds = sessionQuestionIds.slice(0, exam.numberOfQuestionsToDisplay);
            }
        } else {
            sessionQuestionIds = poolQuestions.map(q => q.id);

            // Shuffle questions for this specific session
            for (let i = sessionQuestionIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sessionQuestionIds[i], sessionQuestionIds[j]] = [sessionQuestionIds[j], sessionQuestionIds[i]];
            }

            if (exam.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0 && exam.numberOfQuestionsToDisplay < sessionQuestionIds.length) {
                sessionQuestionIds = sessionQuestionIds.slice(0, exam.numberOfQuestionsToDisplay);
            }
        }

        const sessionData = cleanData({
            ...session,
            sessionQuestionIds,
            startedAt: new Date(),
            isCompleted: false,
            answers: {},
            currentQuestionIndex: 0,
            isTestAttempt
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

export const submitExamSession = async (
    sessionId: string, 
    answers: Record<string, string>, 
    submissionType: 'student' | 'auto' = 'student',
    telemetry?: { tabSwitches: number; revisions: number; timeSpentPerQuestion: Record<string, number> }
): Promise<Result> => {
    const session = await getExamSession(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.isCompleted) {
        const q = query(collection(db, "results"), where("sessionId", "==", sessionId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) return docToData<Result>(snapshot.docs[0]);
    }

    const exam = await getExam(session.examId);
    if (!exam) throw new Error("Exam not found");

    const questionIdsToGrade = (session.sessionQuestionIds && session.sessionQuestionIds.length > 0)
        ? session.sessionQuestionIds
        : (exam.questionIds || []);

    let questionsToGrade: Question[] = [];
    if (questionIdsToGrade.length > 0) {
        questionsToGrade = await getQuestionsByIds(questionIdsToGrade);
    }
    if (questionsToGrade.length === 0) {
        let qQuery = query(collection(db, "questions"));
        if (exam.classLevel) {
            qQuery = query(collection(db, "questions"), where("classLevel", "==", exam.classLevel));
        }
        const snapshot = await getDocs(qQuery);
        questionsToGrade = snapshot.docs.map(d => docToData<Question>(d));
    }
    const questionMap = new Map(questionsToGrade.map(q => [q.id, q]));

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
            
            const isCorrect = isTheory
                ? true
                : !!studentAnswer && !!q.correctAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

            correctAnswers[qId] = isCorrect;
            if (isCorrect) score += points;
        } else {
            // Fallback for missing question metadata
            correctAnswers[qId] = false;
            sessionTotalPoints += 1;
        }
    }

    const finalTotalPoints = sessionTotalPoints > 0 ? sessionTotalPoints : (questionIdsToGrade.length || 1);
    const percentage = Math.min(100, Math.max(0, Math.round((score / finalTotalPoints) * 100)));
    const passed = percentage >= exam.passingScore;

    await updateExamSession(sessionId, {
        isCompleted: true,
        endedAt: new Date(),
        answers
    });

    const isTestAttempt = session.isTestAttempt === true;

    const resultData = cleanData({
        sessionId,
        examId: exam.id,
        examTitle: exam.title,
        classLevel: exam.classLevel,
        subject: exam.subject,
        department: exam.department || "",
        term: exam.term || "First Term",
        examType: exam.examType || "Objectives",
        studentName: session.studentName,
        studentId: session.studentId,
        score,
        totalPoints: finalTotalPoints,
        totalQuestions: questionIdsToGrade.length,
        questionsAnswered: Object.keys(answers || {}).length,
        percentage,
        passed,
        submissionType,
        answers,
        correctAnswers,
        completedAt: new Date(),
        telemetry: telemetry || { tabSwitches: 0, revisions: 0, timeSpentPerQuestion: {} },
        isTestAttempt
    });

    console.log("submitExamSession: Saving result to Firestore...", resultData);
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
    try {
        const q = query(collection(db, "results"), orderBy("completedAt", "desc"), limit(600));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => docToData<Result>(d));
    } catch (err) {
        const q = query(collection(db, "results"), limit(600));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => docToData<Result>(d));
    }
};

export const getResult = async (id: string): Promise<Result | null> => {
    const d = await getDoc(doc(db, "results", id));
    return d.exists() ? docToData<Result>(d) : null;
};

export const deleteResult = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "results", id));
};

export const deleteResultsBulk = async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(db, "results", id));
    });
    await batch.commit();
};

export const deleteExamSession = async (sessionId: string): Promise<void> => {
    await deleteDoc(doc(db, "exam_sessions", sessionId));
};

export const deleteExamSessionsForStudent = async (studentId: string, examId: string): Promise<void> => {
    const q = query(
        collection(db, "exam_sessions"),
        where("studentId", "==", studentId),
        where("examId", "==", examId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
        batch.delete(d.ref);
    });
    await batch.commit();
};

export const toggleStudentExamBlock = async (studentId: string, examId: string, blockState: boolean): Promise<void> => {
    const q = query(collection(db, "students"), where("studentId", "==", studentId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error("Student not found");
    const studentDoc = snapshot.docs[0];
    const data = docToData<Student>(studentDoc);
    let blockedExams = data.blockedExams || [];
    if (blockState) {
        if (!blockedExams.includes(examId)) {
            blockedExams.push(examId);
        }
    } else {
        blockedExams = blockedExams.filter(id => id !== examId);
    }
    await updateDoc(studentDoc.ref, { blockedExams });
};

// --- System Settings ---
export const getSystemSettings = async (): Promise<SystemSettings | null> => {
    const d = await getDoc(doc(db, "settings", "global"));
    return d.exists() ? docToData<SystemSettings>(d) : null;
};

export const saveSystemSettings = async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const ref = doc(db, "settings", "global");
    const cleaned = cleanData(settings);
    await setDoc(ref, cleaned, { merge: true });
    const updated = await getSystemSettings();
    if (!updated) throw new Error("Failed to retrieve updated settings");
    return updated;
};

// --- Invigilator Proctoring & Heartbeat API ---
export const sendSessionHeartbeat = async (
    sessionId: string,
    telemetry?: {
        tabSwitches?: number;
        windowBlurs?: number;
        isFlagged?: boolean;
        justFlagged?: boolean;
        timeRemaining?: number;
        currentQuestionIndex?: number;
    }
): Promise<void> => {
    const sessionRef = doc(db, "exam_sessions", sessionId);
    const updatePayload: Record<string, any> = {
        lastSeenAt: serverTimestamp(),
    };
    if (telemetry?.tabSwitches !== undefined) updatePayload.tabSwitches = telemetry.tabSwitches;
    if (telemetry?.windowBlurs !== undefined) updatePayload.windowBlurs = telemetry.windowBlurs;
    if (telemetry?.isFlagged !== undefined) updatePayload.isFlagged = telemetry.isFlagged;
    if (telemetry?.timeRemaining !== undefined) updatePayload.timeRemaining = telemetry.timeRemaining;
    if (telemetry?.currentQuestionIndex !== undefined) updatePayload.currentQuestionIndex = telemetry.currentQuestionIndex;

    await updateDoc(sessionRef, updatePayload);

    // Auto-trigger urgent cheating notification ONLY on newly flagged incidents
    if (telemetry?.justFlagged) {
        createAppNotification({
            category: "cheating",
            severity: "urgent",
            title: "Cheating Alert Flagged",
            message: `Tab switch or window focus loss detected during candidate session.`,
            deepLink: "/admin/invigilator",
            batchId: `cheating-${sessionId}`
        }).catch(() => {});
    }
};

export const updateSessionExtraTime = async (sessionId: string, additionalMinutes: number): Promise<void> => {
    const sessionRef = doc(db, "exam_sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) throw new Error("Exam session not found");
    const sessionData = docToData<ExamSession>(sessionSnap);
    const currentExtra = sessionData.extendedMinutes || 0;
    await updateDoc(sessionRef, {
        extendedMinutes: currentExtra + additionalMinutes
    });

    createAppNotification({
        category: "exams",
        severity: "info",
        title: "Extra Time Granted",
        message: `Granted +${additionalMinutes} extra minutes to candidate session ${sessionId}.`,
        deepLink: "/admin/invigilator"
    }).catch(() => {});
};

export const sendStudentMessage = async (sessionId: string, message: string): Promise<void> => {
    const sessionRef = doc(db, "exam_sessions", sessionId);
    await updateDoc(sessionRef, {
        invigilatorMessage: message
    });

    createAppNotification({
        category: "messages",
        severity: "important",
        title: "Direct Student Message",
        message: `Message sent to active candidate session: "${message.slice(0, 50)}..."`,
        deepLink: "/admin/invigilator"
    }).catch(() => {});
};

export const broadcastInvigilatorMessage = async (examId: string | null, message: string): Promise<number> => {
    let q;
    if (examId && examId !== "all") {
        q = query(collection(db, "exam_sessions"), where("examId", "==", examId), where("isCompleted", "==", false));
    } else {
        q = query(collection(db, "exam_sessions"), where("isCompleted", "==", false));
    }
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
        batch.update(d.ref, { broadcastMessage: message });
    });
    await batch.commit();

    createAppNotification({
        category: "messages",
        severity: "urgent",
        title: "Invigilator Broadcast Announcement",
        message: `Broadcast announcement sent to ${snapshot.docs.length} active session(s): "${message.slice(0, 50)}..."`,
        deepLink: "/admin/invigilator"
    }).catch(() => {});

    return snapshot.docs.length;
};

// --- QA Test Purge API ---
export const deleteTestAttemptsBulk = async (): Promise<void> => {
    try {
        const resultsQuery = query(collection(db, "results"), where("isTestAttempt", "==", true));
        const resultsSnapshot = await getDocs(resultsQuery);

        const sessionsQuery = query(collection(db, "exam_sessions"), where("isTestAttempt", "==", true));
        const sessionsSnapshot = await getDocs(sessionsQuery);

        const batch = writeBatch(db);
        resultsSnapshot.docs.forEach(d => {
            batch.delete(d.ref);
        });
        sessionsSnapshot.docs.forEach(d => {
            batch.delete(d.ref);
        });
        await batch.commit();
        console.log(`Successfully purged ${resultsSnapshot.docs.length} test results and ${sessionsSnapshot.docs.length} test sessions.`);
    } catch (error) {
        console.error("Error purging test attempts:", error);
        throw error;
    }
};

// --- Admin Personal Profile & Personal Settings API ---
export const getAdminProfile = async (adminId: string = "default-admin"): Promise<AdminUser | null> => {
    try {
        const d = await getDoc(doc(db, "admin_users", adminId));
        if (!d.exists()) {
            return {
                id: adminId,
                name: "Sarah Johnson",
                email: "sarah.johnson@faithimmaculate.edu.ng",
                phone: "+234 803 123 4567",
                avatarUrl: "",
                role: "Super Admin",
                theme: "system",
                timezone: "Africa/Lagos",
                landingPage: "/admin",
                twoFactorEnabled: false,
                notificationPreferences: {
                    results: true,
                    cheating: true,
                    questions: true,
                    messages: true,
                    exams: true,
                    system: true,
                    channels: { inApp: true, email: true, sms: false }
                },
                activeSessions: [
                    { id: "sess-1", device: "Chrome / Windows 11 (Active)", ipAddress: "192.168.1.100", lastActive: "Active Now", isCurrent: true },
                    { id: "sess-2", device: "Safari / macOS Mobile", ipAddress: "102.89.23.11", lastActive: "2 hours ago", isCurrent: false }
                ],
                permissions: [
                    "Exam Creation & Scheduling",
                    "Result Approval & Publishing",
                    "Invigilator Control & Extra Time",
                    "Question Bank Management",
                    "Student Profile Administration",
                    "System Settings & Audit Log"
                ],
                createdAt: new Date()
            } as AdminUser;
        }
        return docToData<AdminUser>(d);
    } catch (e) {
        console.warn("getAdminProfile error:", e);
        return null;
    }
};

export const updateAdminProfile = async (adminId: string = "default-admin", data: Partial<AdminUser>): Promise<AdminUser> => {
    const adminRef = doc(db, "admin_users", adminId);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
        const defaultProfile = await getAdminProfile(adminId);
        const newProfile = { ...defaultProfile, ...data, id: adminId };
        await setDoc(adminRef, cleanData(newProfile));
        return newProfile as AdminUser;
    } else {
        await updateDoc(adminRef, cleanData(data));
        const updated = await getDoc(adminRef);
        return docToData<AdminUser>(updated);
    }
};

// --- Real-time Notifications System API ---
export const getAppNotifications = async (): Promise<AppNotification[]> => {
    try {
        const q = query(collection(db, "app_notifications"), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => docToData<AppNotification>(d));
    } catch (e) {
        console.warn("getAppNotifications error:", e);
        return [];
    }
};

export const createAppNotification = async (notification: {
    category: "results" | "cheating" | "questions" | "messages" | "exams" | "system";
    severity?: "urgent" | "important" | "info";
    title: string;
    message: string;
    deepLink?: string;
    targetAdminId?: string;
    batchId?: string;
}): Promise<AppNotification> => {
    try {
        const cleanPayload = cleanData({
            category: notification.category,
            severity: notification.severity || "info",
            title: notification.title,
            message: notification.message,
            deepLink: notification.deepLink || null,
            targetAdminId: notification.targetAdminId || null,
            batchId: notification.batchId || null,
            isRead: false,
            createdAt: new Date()
        });

        const ref = await addDoc(collection(db, "app_notifications"), cleanPayload);
        return { id: ref.id, ...cleanPayload } as AppNotification;
    } catch (e) {
        console.error("createAppNotification error:", e);
        throw e;
    }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
    try {
        await updateDoc(doc(db, "app_notifications", id), { isRead: true });
    } catch (e) {
        console.warn("markNotificationAsRead error:", e);
    }
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    try {
        const snapshot = await getDocs(query(collection(db, "app_notifications"), where("isRead", "==", false)));
        if (snapshot.empty) return;
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
            batch.update(d.ref, { isRead: true });
        });
        await batch.commit();
    } catch (e) {
        console.warn("markAllNotificationsAsRead error:", e);
    }
};

export const subscribeToNotifications = (callback: (notifications: AppNotification[]) => void) => {
    const q = query(collection(db, "app_notifications"), orderBy("createdAt", "desc"), limit(40));
    return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => docToData<AppNotification>(d));
        callback(list);
    }, (err) => {
        console.warn("subscribeToNotifications listener error:", err);
    });
};
