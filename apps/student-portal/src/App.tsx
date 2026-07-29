import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Loader2 } from "lucide-react";

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

const StudentPortal = lazy(() => import("@/pages/student-portal"));
const StudentLogin = lazy(() => import("@/pages/student-login"));
const ExamStart = lazy(() => import("@/pages/exam-start"));
const ExamSession = lazy(() => import("@/pages/exam-session"));
const ExamResult = lazy(() => import("@/pages/exam-result"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] w-full items-center justify-center bg-slate-900">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      <span className="text-xs font-bold text-slate-400">Loading Student Portal...</span>
    </div>
  </div>
);

export default function StudentApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              {/* Public & Student Routes */}
              <Route path="/" component={Home} />
              <Route path="/student-login" component={StudentLogin} />
              <Route path="/student-portal" component={StudentPortal} />
              <Route path="/exam/:id/start" component={ExamStart} />
              <Route path="/exam/:examId/session/:sessionId" component={ExamSession} />
              <Route path="/exam/result/:resultId" component={ExamResult} />

              {/* Catch-all redirect to student login */}
              <Route>
                <Redirect to="/student-login" />
              </Route>
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
