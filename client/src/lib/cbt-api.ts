import { ApiRequestError, apiRequest } from "./queryClient";
import type { Exam, ExamSession, Question, Result, Student } from "@shared/schema";

const isNotFound = (error: unknown) => error instanceof ApiRequestError && error.status === 404;

export const getExams = async (classLevel?: string): Promise<Exam[]> => {
  const search = classLevel ? `?classLevel=${encodeURIComponent(classLevel)}` : "";
  return apiRequest<Exam[]>("GET", `/api/exams${search}`);
};

export const getExam = async (id: string): Promise<Exam | null> => {
  try {
    return await apiRequest<Exam>("GET", `/api/exams/${encodeURIComponent(id)}`);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export const getStudents = async (): Promise<Student[]> => apiRequest<Student[]>("GET", "/api/students");
export const getResults = async (): Promise<Result[]> => apiRequest<Result[]>("GET", "/api/results");

export const getResult = async (id: string): Promise<Result | null> => {
  try {
    return await apiRequest<Result>("GET", `/api/results/${encodeURIComponent(id)}`);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export const getQuestionsByIds = async (ids: string[]): Promise<Question[]> => {
  if (!ids.length) return [];
  return apiRequest<Question[]>("POST", "/api/questions/bulk-fetch", { ids });
};

export const getStudentQuestionsByIds = async (ids: string[], sessionId: string): Promise<Question[]> => {
  if (!ids.length) return [];
  return apiRequest<Question[]>(
    "POST",
    "/api/questions/student-bulk-fetch",
    { ids, sessionId },
    { timeoutMs: 30_000 },
  );
};

export const getExamSession = async (id: string): Promise<(ExamSession & { serverTime?: string }) | null> => {
  try {
    return await apiRequest<ExamSession & { serverTime?: string }>(
      "GET",
      `/api/exam-sessions/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export const createExamSession = async (
  session: { examId: string; studentName: string; studentId: string; [key: string]: any },
): Promise<ExamSession> =>
  apiRequest<ExamSession>("POST", "/api/exam-sessions", session, { retries: 2, timeoutMs: 30_000 });

export const updateExamSession = async (id: string, updates: Partial<ExamSession>): Promise<void> => {
  await apiRequest("PATCH", `/api/exam-sessions/${encodeURIComponent(id)}`, updates, { retries: 2, timeoutMs: 20_000 });
};

export const submitExamSession = async (
  sessionId: string,
  answers: Record<string, string>,
  submissionType: "student" | "auto" = "student",
  telemetry?: { tabSwitches: number; revisions: number; timeSpentPerQuestion: Record<string, number> },
): Promise<Result> => apiRequest<Result>(
  "POST",
  `/api/exam-sessions/${encodeURIComponent(sessionId)}/submit`,
  { answers, submissionType, telemetry },
  { timeoutMs: 30_000 },
);

export const getSubjectDepartment = (subjectName: string, questionDepartment?: string): string => {
  if (questionDepartment && questionDepartment !== "General" && questionDepartment !== "Others") {
    return questionDepartment;
  }

  const subject = (subjectName || "").toLowerCase().trim();
  if (["physics", "chemistry", "biology", "further math", "further mathematics"].some(part => subject.includes(part))) return "Science";
  if (["government", "literature", "history", "crs", "irs", "christian religious", "islamic religious", "fine art", "music"].some(part => subject.includes(part))) return "Art";
  if (["accounting", "commerce", "office practice", "bookkeeping", "store management", "financial accounting"].some(part => subject.includes(part))) return "Commercial";
  return "General";
};

export const sendSessionHeartbeat = async (
  sessionId: string,
  telemetry?: {
    tabSwitches?: number;
    windowBlurs?: number;
    isFlagged?: boolean;
    timeRemaining?: number;
    currentQuestionIndex?: number;
  },
): Promise<void> => {
  await updateExamSession(sessionId, {
    tabSwitches: telemetry?.tabSwitches,
    windowBlurs: telemetry?.windowBlurs,
    isFlagged: telemetry?.isFlagged,
    timeRemaining: telemetry?.timeRemaining,
    currentQuestionIndex: telemetry?.currentQuestionIndex,
  });
};
