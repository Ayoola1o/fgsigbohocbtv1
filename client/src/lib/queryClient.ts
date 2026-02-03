import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as fb from "./firebase-api";

// Helper to match paths
const matchPath = (pattern: string, path: string) => {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
};

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: any,
): Promise<T> {
  console.log(`API Request: ${method} ${url}`, data);

  // Admin Auth
  if (method === "POST" && url === "/api/admin/login") {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error + (errorData.details ? `: ${errorData.details}` : "") || "Invalid credentials");
    }
    const user = await res.json();
    localStorage.setItem("admin_user", JSON.stringify(user));
    return user as T;
  }
  if (method === "POST" && url === "/api/admin/logout") {
    await fetch(url, { method });
    localStorage.removeItem("admin_user");
    return { ok: true } as T;
  }

  // Student Auth
  if (method === "POST" && url === "/api/students/login") {
    const student = await fb.studentLogin(data.username || data.studentName || data.name, data.password || data.studentId);
    if (!student) throw new Error("Invalid credentials");
    localStorage.setItem("student_user", JSON.stringify(student));
    return student as T;
  }

  // Questions
  if (method === "POST" && url === "/api/questions") {
    return fb.createQuestion(data) as T;
  }
  if (method === "POST" && url === "/api/questions/bulk") {
    // data is array of questions
    return fb.createQuestionsBulk(data) as T;
  }
  if (method === "DELETE" && url === "/api/questions") {
    return fb.deleteQuestionsBulk(data.ids) as T;
  }
  if (method === "POST" && url === "/api/questions/bulk-fetch") {
    return fb.getQuestionsByIds(data.ids) as T;
  }
  let match = matchPath("/api/questions/:id", url);
  if (match && method === "PATCH") {
    return fb.updateQuestion(match.id, data) as T;
  }
  if (match && method === "DELETE") {
    return fb.deleteQuestion(match.id) as T;
  }
  if (method === "PATCH" && url === "/api/questions/bulk") {
    return fb.updateQuestionsBulk(data.ids, data.updates) as T;
  }

  // Exams
  if (method === "POST" && url === "/api/exams") {
    return fb.createExam(data) as T;
  }
  match = matchPath("/api/exams/:id", url);
  if (match && method === "PATCH") {
    return fb.updateExam(match.id, data) as T;
  }
  if (match && method === "DELETE") {
    return fb.deleteExam(match.id) as T;
  }

  // Exam Sessions
  if (method === "POST" && url === "/api/exam-sessions") {
    return fb.createExamSession(data) as T;
  }
  match = matchPath("/api/exam-sessions/:id", url);
  if (match && method === "PATCH") {
    return fb.updateExamSession(match.id, data) as T;
  }
  match = matchPath("/api/exam-sessions/:id/submit", url);
  if (match && method === "POST") {
    return fb.submitExamSession(match.id, data.answers || {}, data.submissionType) as T;
  }

  // Students (handled mostly in api.ts but some might leak here)
  if (method === "POST" && url === "/api/students") {
    if (Array.isArray(data)) return fb.createStudentsBulk(data) as T;
    return fb.createStudent(data) as T;
  }
  match = matchPath("/api/students/:id", url);
  if (match && method === "PATCH") {
    return fb.updateStudent(match.id, data) as T;
  }
  if (match && method === "DELETE") {
    return fb.deleteStudent(match.id) as T;
  }

  throw new Error(`Unhandled API request: ${method} ${url}`);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>({ on401: unauthorizedBehavior }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const url = queryKey.join("/");
    console.log(`Query: ${url}`);

    // Admin Me
    if (url === "/api/admin/me") {
      const userStr = localStorage.getItem("admin_user");
      if (!userStr) {
        if (unauthorizedBehavior === "returnNull") return null as T;
        throw new Error("Not authenticated");
      }
      return JSON.parse(userStr) as T;
    }

    // Questions
    if (url === "/api/questions") {
      return fb.getQuestions() as T;
    }
    let match = matchPath("/api/questions/:id", url);
    if (match) {
      return fb.getQuestion(match.id) as T;
    }

    // Exams
    match = matchPath("/api/exams/:id", url);
    if (match) {
      return fb.getExam(match.id) as T;
    }
    match = matchPath("/api/exams/:id/questions", url);
    if (match) {
      const exam = await fb.getExam(match.id);
      if (!exam) throw new Error("Exam not found");
      const allQuestions = await fb.getQuestions();
      return allQuestions.filter(q => exam.questionIds.includes(q.id)) as T;
    }
    if (queryKey[0] === "/api/exams") {
      const params = queryKey[1] as { classLevel?: string } | undefined;
      return fb.getExams(params?.classLevel) as T;
    }

    // Exam Sessions
    match = matchPath("/api/exam-sessions/:id", url);
    if (match) {
      return fb.getExamSession(match.id) as T;
    }

    // Results
    if (url === "/api/results") {
      return fb.getResults() as T;
    }
    match = matchPath("/api/results/:id", url);
    if (match) {
      return fb.getResult(match.id) as T;
    }

    // Students
    if (url === "/api/students") {
      return fb.getStudents() as T;
    }

    throw new Error(`Unhandled Query: ${url}`);
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
