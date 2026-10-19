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
import { apiRequest } from "./queryClient";
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
    return apiRequest<Question[]>("GET", "/api/questions");
};

export const getQuestion = async (id: string): Promise<Question | null> => {
    try {
        return await apiRequest<Question>("GET", `/api/questions/${id}`);
    } catch {
        return null;
    }
};

export const getQuestionsByIds = async (ids: string[]): Promise<Question[]> => {
    if (!ids || ids.length === 0) return [];
    try {
        const results = await apiRequest<Question[]>("POST", "/api/questions/bulk-fetch", { ids });
        const map = new Map(results.map(q => [q.id, q]));
        return ids.map(id => map.get(id)).filter(Boolean) as Question[];
    } catch (e) {
        console.warn("getQuestionsByIds error:", e);
        return [];
    }
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
    return apiRequest<Question>("POST", "/api/questions", question);
};

export const createQuestionsBulk = async (questions: InsertQuestion[]): Promise<Question[]> => {
    return apiRequest<Question[]>("POST", "/api/questions/bulk", questions);
};

export const deleteQuestion = async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/questions/${id}`);
};

export const deleteQuestionsBulk = async (ids: string[]): Promise<void> => {
    await apiRequest("DELETE", "/api/questions", { ids });
};

export const updateQuestion = async (id: string, updates: Partial<Question>): Promise<void> => {
    await apiRequest("PATCH", `/api/questions/${id}`, updates);
};

export const updateQuestionsBulk = async (ids: string[], updates: Partial<Question>): Promise<void> => {
    await apiRequest("PATCH", "/api/questions/bulk", { ids, updates });
};

// --- Exams ---
export const getExams = async (classLevel?: string): Promise<Exam[]> => {
    const url = classLevel ? `/api/exams?classLevel=${encodeURIComponent(classLevel)}` : "/api/exams";
    return apiRequest<Exam[]>("GET", url);
};

export const getExam = async (id: string): Promise<Exam | null> => {
    try {
        const exam = await apiRequest<Exam>("GET", `/api/exams/${id}`);
        return { ...exam, questionIds: exam.questionIds || [] };
    } catch (error) {
        console.warn(`getExam error for ${id}:`, error);
        return null;
    }
};

export const createExam = async (exam: InsertExam): Promise<Exam> => {
    return apiRequest<Exam>("POST", "/api/exams", exam);
};

export const updateExam = async (id: string, updates: Partial<Exam>): Promise<void> => {
    await apiRequest("PATCH", `/api/exams/${id}`, updates);
};

export const deleteExam = async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/exams/${id}`);
};

// --- Students ---
export const getStudents = async (): Promise<Student[]> => {
    return apiRequest<Student[]>("GET", "/api/students");
};

export const createStudent = async (student: InsertStudent): Promise<Student> => {
    return apiRequest<Student>("POST", "/api/students", student);
};

export const createStudentsBulk = async (students: InsertStudent[]): Promise<Student[]> => {
    return apiRequest<Student[]>("POST", "/api/students", students);
};

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<void> => {
    await apiRequest("PATCH", `/api/students/${id}`, updates);
};

export const deleteStudent = async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/students/${id}`);
};

export const getStudentByStudentId = async (studentId: string): Promise<Student | null> => {
    if (!studentId) return null;
    const cleanId = studentId.trim().toLowerCase();
    try {
        const all = await getStudents();
        return all.find(s => s.studentId.trim().toLowerCase() === cleanId) || null;
    } catch (e) {
        console.warn("getStudentByStudentId error:", e);
        return null;
    }
};

export const studentLogin = async (name: string, studentId: string): Promise<Student | null> => {
    try {
        return await apiRequest<Student>("POST", "/api/students/login", {
            name: name.trim(),
            studentId: studentId.trim()
        });
    } catch (e) {
        console.warn("studentLogin error:", e);
        return null;
    }
};

// --- Admin ---
export const adminLogin = async (username: string, password: string): Promise<User | null> => {
    try {
        return await apiRequest<User>("POST", "/api/admin/login", { username, password });
    } catch {
        return null;
    }
};

// --- Exam Sessions ---
export const getExamSession = async (id: string): Promise<(ExamSession & { serverTime?: string }) | null> => {
    try {
        return await apiRequest<ExamSession & { serverTime?: string }>("GET", `/api/exam-sessions/${id}`);
    } catch {
        return null;
    }
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
    return apiRequest<ExamSession>("POST", "/api/exam-sessions", session);
};

export const updateExamSession = async (id: string, updates: Partial<ExamSession>): Promise<void> => {
    await apiRequest("PATCH", `/api/exam-sessions/${id}`, updates);
};

export const deleteExamSession = async (sessionId: string): Promise<void> => {
    await apiRequest("DELETE", `/api/exam-sessions/${sessionId}`);
};

export const submitExamSession = async (
    sessionId: string,
    answers: Record<string, string>,
    submissionType: 'student' | 'auto' = 'student',
    telemetry?: { tabSwitches: number; revisions: number; timeSpentPerQuestion: Record<string, number> }
): Promise<Result> => {
    return apiRequest<Result>("POST", `/api/exam-sessions/${sessionId}/submit`, {
        answers,
        submissionType,
        telemetry
    });
};

// --- Results ---
export const getResults = async (): Promise<Result[]> => {
    return apiRequest<Result[]>("GET", "/api/results");
};

export const getResult = async (id: string): Promise<Result | null> => {
    try {
        return await apiRequest<Result>("GET", `/api/results/${id}`);
    } catch {
        return null;
    }
};

export const deleteResult = async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/results/${id}`);
};

export const deleteResultsBulk = async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    await apiRequest("DELETE", "/api/results", { ids });
};

export const deleteExamSessionsForStudent = async (studentId: string, examId: string): Promise<void> => {
    try {
        const sessions = await apiRequest<ExamSession[]>("GET", "/api/exam-sessions");
        const matching = sessions.filter(s => s.studentId === studentId && s.examId === examId);
        for (const s of matching) {
            await apiRequest("DELETE", `/api/exam-sessions/${s.id}`);
        }
    } catch (e) {
        console.warn("deleteExamSessionsForStudent error:", e);
    }
};

export const toggleStudentExamBlock = async (studentId: string, examId: string, blockState: boolean): Promise<void> => {
    await apiRequest("POST", `/api/students/${studentId}/toggle-block`, { examId, blockState });
};

// --- System Settings ---
export const getSystemSettings = async (): Promise<SystemSettings | null> => {
    try {
        return await apiRequest<SystemSettings>("GET", "/api/settings");
    } catch {
        return null;
    }
};

export const saveSystemSettings = async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    return apiRequest<SystemSettings>("POST", "/api/settings", settings);
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
    try {
        await apiRequest("PATCH", `/api/exam-sessions/${sessionId}`, {
            tabSwitches: telemetry?.tabSwitches,
            windowBlurs: telemetry?.windowBlurs,
            isFlagged: telemetry?.isFlagged,
            timeRemaining: telemetry?.timeRemaining,
            currentQuestionIndex: telemetry?.currentQuestionIndex,
        });

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
    } catch (e) {
        console.warn("sendSessionHeartbeat error:", e);
    }
};

export const updateSessionExtraTime = async (sessionId: string, additionalMinutes: number): Promise<void> => {
    const session = await getExamSession(sessionId);
    if (!session) throw new Error("Exam session not found");
    const currentExtra = (session as any).extendedMinutes || 0;
    await apiRequest("PATCH", `/api/exam-sessions/${sessionId}`, {
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
    await apiRequest("PATCH", `/api/exam-sessions/${sessionId}`, {
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
    try {
        const sessions = await apiRequest<ExamSession[]>("GET", "/api/exam-sessions");
        const active = sessions.filter(s => !s.isCompleted && (!examId || examId === "all" || s.examId === examId));
        for (const s of active) {
            await apiRequest("PATCH", `/api/exam-sessions/${s.id}`, { broadcastMessage: message });
        }

        createAppNotification({
            category: "messages",
            severity: "urgent",
            title: "Invigilator Broadcast Announcement",
            message: `Broadcast announcement sent to ${active.length} active session(s): "${message.slice(0, 50)}..."`,
            deepLink: "/admin/invigilator"
        }).catch(() => {});

        return active.length;
    } catch (e) {
        console.warn("broadcastInvigilatorMessage error:", e);
        return 0;
    }
};

// --- QA Test Purge API ---
export const deleteTestAttemptsBulk = async (): Promise<void> => {
    await apiRequest("POST", "/api/admin/purge-test-data");
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
}): Promise<AppNotification | null> => {
    try {
        // Deduplication: Avoid notification spam if an unread notification with the same batchId exists
        if (notification.batchId) {
            const existingQuery = query(
                collection(db, "app_notifications"),
                where("batchId", "==", notification.batchId),
                where("isRead", "==", false),
                limit(1)
            );
            const snap = await getDocs(existingQuery);
            if (!snap.empty) {
                return docToData<AppNotification>(snap.docs[0]);
            }
        }

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
        return null;
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
