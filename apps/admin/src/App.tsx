import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminLayout } from "@/components/admin-layout";
import { Loader2 } from "lucide-react";

// Admin Lazy Chunk Pages
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
const AdminProfilePage = lazy(() => import("@/pages/admin-profile"));
const AdminNotificationsPage = lazy(() => import("@/pages/admin-notifications"));
const AdminPrintoutPage = lazy(() => import("@/pages/admin-printout"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      <span className="text-xs font-bold text-slate-400">Loading module...</span>
    </div>
  </div>
);

export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              {/* Admin Auth Route */}
              <Route path="/admin/login" component={AdminLoginPage} />

              {/* Admin Pages Wrapper */}
              <Route path="/admin">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </Route>
              <Route path="/admin/profile">
                <AdminLayout>
                  <AdminProfilePage />
                </AdminLayout>
              </Route>
              <Route path="/admin/notifications">
                <AdminLayout>
                  <AdminNotificationsPage />
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
              <Route path="/admin/students">
                <AdminLayout>
                  <AdminStudents />
                </AdminLayout>
              </Route>
              <Route path="/admin/students/:studentId">
                <AdminLayout>
                  <AdminStudentProfile />
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
              <Route path="/admin/printout">
                <AdminLayout>
                  <AdminPrintoutPage />
                </AdminLayout>
              </Route>

              {/* Default Redirect — always require login first */}
              <Route path="/">
                <Redirect to="/admin/login" />
              </Route>
              <Route>
                <Redirect to="/admin/login" />
              </Route>
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
