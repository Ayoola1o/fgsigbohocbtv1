import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminLayout } from "@/components/admin-layout";
import { Loader2 } from "lucide-react";

// Direct Eager Imports for Student Core Flow
import Home from "@/pages/home";
import StudentPortal from "@/pages/student-portal";
import StudentLogin from "@/pages/student-login";
import ExamStart from "@/pages/exam-start";
import ExamSession from "@/pages/exam-session";
import ExamResult from "@/pages/exam-result";
import NotFound from "@/pages/not-found";

// Lazy Loaded Chunks for Admin Navigation
const AdminLoginPage = lazy(() => import("@/pages/admin-login"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminExams = lazy(() => import("@/pages/admin-exams"));
const AdminExamDetails = lazy(() => import("@/pages/admin-exam-details"));
const AdminQuestions = lazy(() => import("@/pages/admin-questions"));
const AdminResults = lazy(() => import("@/pages/admin-results"));
const AdminStudents = lazy(() => import("@/pages/admin-students"));
const AdminStudentProfile = lazy(() => import("@/pages/admin-student-profile"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const AdminDocumentation = lazy(() => import("@/pages/admin-documentation"));
const AdminInvigilatorPage = lazy(() => import("@/pages/admin-invigilator"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      <span className="text-xs font-bold text-slate-400">Loading module...</span>
    </div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/student-portal" component={StudentPortal} />
      <Route path="/student-login" component={StudentLogin} />
      <Route path="/exam/:id/start" component={ExamStart} />
      <Route path="/exam/:examId/session/:sessionId" component={ExamSession} />
      <Route path="/exam/result/:resultId" component={ExamResult} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/invigilator">
        <AdminLayout>
          <AdminInvigilatorPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/analytics">
        <AdminLayout>
          <AdminAnalytics />
        </AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout>
          <AdminSettings />
        </AdminLayout>
      </Route>
      <Route path="/admin/documentation">
        <AdminLayout>
          <AdminDocumentation />
        </AdminLayout>
      </Route>
      <Route path="/admin/exams">
        <AdminLayout>
          <AdminExams />
        </AdminLayout>
      </Route>
      <Route path="/admin/exams/:id">
        <AdminLayout>
          <AdminExamDetails />
        </AdminLayout>
      </Route>
      <Route path="/admin/questions">
        <AdminLayout>
          <AdminQuestions />
        </AdminLayout>
      </Route>
      <Route path="/admin/results">
        <AdminLayout>
          <AdminResults />
        </AdminLayout>
      </Route>
      <Route path="/admin/results/student/:studentId">
        <AdminLayout>
          <AdminStudentProfile />
        </AdminLayout>
      </Route>
      <Route path="/admin/students">
        <AdminLayout>
          <AdminStudents />
        </AdminLayout>
      </Route>
      <Route path="/admin/results/:resultId">
        <AdminLayout>
          <ExamResult />
        </AdminLayout>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
