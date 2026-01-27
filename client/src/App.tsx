import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminLayout } from "@/components/admin-layout";
import AdminExamDetails from "@/pages/admin-exam-details";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import StudentPortal from "@/pages/student-portal";
import StudentLogin from "@/pages/student-login";
import ExamStart from "@/pages/exam-start";
import ExamSession from "@/pages/exam-session";
import ExamResult from "@/pages/exam-result";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminExams from "@/pages/admin-exams";
import AdminQuestions from "@/pages/admin-questions";
import AdminResults from "@/pages/admin-results";
import AdminStudents from "@/pages/admin-students";
import AdminStudentProfile from "@/pages/admin-student-profile";
// import AdminLoginPage from "@/pages/admin-login";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/student-portal" component={StudentPortal} />
      <Route path="/student-login" component={StudentLogin} />
      <Route path="/exam/:id/start" component={ExamStart} />
      <Route path="/exam/:examId/session/:sessionId" component={ExamSession} />
      <Route path="/exam/result/:resultId" component={ExamResult} />

      {/* Admin Routes */}
      {/* <Route path="/admin/login" component={AdminLoginPage} /> */}
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
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
