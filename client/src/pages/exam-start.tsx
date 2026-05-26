import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, BookOpen, AlertTriangle, CheckCircle, Sparkles, ArrowRight, ChevronLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Exam, ExamSession, Student, Result } from "@shared/schema";
import { createExamSession, getExam } from "@/lib/firebase-api";
import { Badge } from "@/components/ui/badge";

export default function ExamStart() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { id: examId } = params;
  const { toast } = useToast();

  // Robust query param extraction handling both standard and hash-based queries
  const getSearchParams = () => {
    const search = window.location.search;
    if (search) return new URLSearchParams(search);

    // Fallback: check if query is attached to hash (e.g. /#/route?query)
    if (window.location.hash.includes('?')) {
      const query = window.location.hash.split('?')[1];
      return new URLSearchParams(query);
    }
    return new URLSearchParams();
  };

  const searchParams = getSearchParams();
  const studentName = searchParams.get("studentName") || "";
  const studentId = searchParams.get("studentId") || "";

  const { data: exam, isLoading, error } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      const data = await getExam(examId);
      if (!data) throw new Error("Exam not found");
      return data;
    }
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });
  const currentStudent = students.find(s => s.studentId === studentId);

  const { data: results = [] } = useQuery<Result[]>({
    queryKey: ["/api/results"],
  });
  const hasTaken = results.some(r => r.examId === examId && r.studentId === studentId);
  const isBlocked = currentStudent?.blockedExams?.includes(examId!) || false;

  const startExamMutation = useMutation({
    mutationFn: async () => {
      console.log("startExamMutation: Starting creation of session...");

      // Create a promise that rejects after 15 seconds to prevent indefinite hang
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), 15000);
      });

      const createPromise = createExamSession({
        examId: examId!,
        studentName,
        studentId,
        answers: {},
        currentQuestionIndex: 0,
      });

      try {
        return await Promise.race([createPromise, timeoutPromise]) as ExamSession;
      } catch (err: any) {
        if (err.message.includes("timed out")) {
          console.warn("startExamMutation: Timeout reached, but proceeding as if successful (local-first)");
          // The creation is likely queued in Firestore's local cache. 
          // We can't return a dummy here because we need a real session ID to redirect.
          // However, the createExamSession in firebase-api.ts now returns the ID early.
        }
        throw err;
      }
    },
    onSuccess: (session) => {
      console.log("startExamMutation: Success", session);
      if (!session || !session.id) {
        console.error("Failed to start session: Server did not return a valid session id.");
        toast({ title: "Error", description: "Invalid session ID returned", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/exam-sessions"] });
      console.log("Redirecting to session:", session.id);
      setLocation(`/exam/${examId}/session/${session.id}`);
    },
    onError: (error) => {
      console.error("Failed to start exam session:", error);
      startExamMutation.reset(); // Allow retrying immediately

      const isTimeout = error instanceof Error && error.message.includes("timed out");

      toast({
        title: isTimeout ? "Network is Slow" : "Failed to Start Exam",
        description: isTimeout
          ? "Your connection is weak. If you continue to see this, try refreshing. However, we'll try to start anyway if possible."
          : (error instanceof Error ? error.message : "There was an error starting your exam. Please try again."),
        variant: isTimeout ? "default" : "destructive",
      });
    },
  });

  useEffect(() => {
    if (!studentName || !studentId) {
      setLocation("/student-portal");
    }
  }, [studentName, studentId, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mb-8 h-12 w-3/4" />
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load exam. Please try again later.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setLocation("/student-portal")}
              className="mt-4"
              data-testid="button-back-to-exams"
            >
              Back to Exams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans">
      <div className="container mx-auto px-4 py-12 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Simple Header back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/student-portal")}
            className="rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 h-9 px-3 flex items-center gap-1.5"
            data-testid="button-cancel"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
            Back to Portal
          </Button>
        </div>

        {/* Pre-Exam Identification Header */}
        <div className="mb-10 bg-gradient-to-r from-indigo-900 via-indigo-950 to-indigo-900 dark:from-indigo-955 dark:via-indigo-965 dark:to-indigo-955 text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-indigo-950/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none">
            <Sparkles className="h-40 w-40 text-white" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/10 text-indigo-200 border-none font-bold py-0.5 px-2.5 rounded-full text-[10px] uppercase tracking-wider">
                Exam Gateway
              </Badge>
              <span className="text-emerald-400 font-extrabold text-[11px] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Session Ready
              </span>
            </div>
            <h1 className="text-2xl sm:text-3.5xl font-black tracking-tight mt-3 leading-tight" data-testid="text-exam-title">
              {exam.title}
            </h1>
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:items-center text-xs text-indigo-200 font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Student Name:</span>
                <span className="text-white font-bold">{studentName}</span>
              </div>
              <div className="hidden sm:block h-3 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Access ID:</span>
                <span className="text-white font-mono">{studentId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Guidelines and Parameters Card */}
        <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-slate-50/50 dark:bg-slate-950/40 px-6 py-4.5 border-b border-slate-100 dark:border-slate-850">
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-205 flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-indigo-500" />
              Academic Examination Parameters
            </h2>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="bg-slate-50/70 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-805/40 text-center">
                <Clock className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Limit</span>
                <span className="block text-lg font-black text-slate-850 dark:text-slate-200 mt-1">{exam.duration} Minutes</span>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-805/40 text-center">
                <BookOpen className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions Count</span>
                <span className="block text-lg font-black text-slate-850 dark:text-slate-200 mt-1">{exam.questionIds?.length || 0} Items</span>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-805/40 text-center">
                <CheckCircle className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passing score</span>
                <span className="block text-lg font-black text-slate-850 dark:text-slate-200 mt-1">{exam.passingScore}%</span>
              </div>
            </div>

            {/* Custom Theory Config */}
            {exam.examType === "Theory" && exam.theoryInstructions && (
              <div className="rounded-2xl bg-indigo-50/35 border border-indigo-100/40 p-5 text-sm dark:bg-indigo-950/15 dark:border-indigo-900/20">
                <h3 className="font-extrabold text-indigo-950 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" /> Additional Theory Instructions:
                </h3>
                <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-wrap">{exam.theoryInstructions}</p>
              </div>
            )}

            {/* Alerts & Critical Status */}
            {isBlocked ? (
              <Alert variant="destructive" className="border-rose-100 bg-rose-50/50 dark:border-rose-955/20 dark:bg-rose-955/10 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <AlertDescription className="font-semibold text-rose-700 dark:text-rose-450 ml-2 leading-relaxed">
                  Attention: Access to this exam has been locked/blocked by the administrator. Please contact the coordinator to request activation.
                </AlertDescription>
              </Alert>
            ) : hasTaken ? (
              <Alert className="border-emerald-100 bg-emerald-50/50 dark:border-emerald-955/20 dark:bg-emerald-955/10 rounded-2xl p-4">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <AlertDescription className="font-semibold text-emerald-700 dark:text-emerald-450 ml-2 leading-relaxed">
                  Session Completed: You have already completed this examination. Re-attempts are not permitted unless reset by the administrator.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-100 bg-amber-50/50 dark:border-amber-955/20 dark:bg-amber-955/10 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <AlertDescription className="font-semibold text-amber-700 dark:text-amber-450 ml-2 leading-relaxed">
                  Important: Once you begin, you cannot pause or restart the session. Verify that you have a stable network and ample time to complete the test.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions Bar */}
            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-805/45">
              <Button
                variant="outline"
                onClick={() => setLocation("/student-portal")}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-150 font-bold h-11 px-6"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  console.log("Begin Exam Clicked. Mutation status:", startExamMutation.status);
                  startExamMutation.mutate();
                }}
                disabled={startExamMutation.isPending || isBlocked || hasTaken}
                className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold shadow-lg shadow-indigo-600/10 hover:scale-[1.01] transition-all rounded-xl h-11 px-8 flex items-center justify-center gap-1.5"
                data-testid="button-begin-exam"
              >
                {startExamMutation.isPending ? (
                  "Initiating Exam..."
                ) : isBlocked ? (
                  "Blocked by Admin"
                ) : hasTaken ? (
                  "Exam Already Taken"
                ) : (
                  <>
                    Begin Exam <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
