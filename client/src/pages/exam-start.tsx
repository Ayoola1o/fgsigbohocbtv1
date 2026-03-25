import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Exam, ExamSession, Result } from "@shared/schema";
import { createExamSession, getExam, getResults } from "@/lib/firebase-api";

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
  const multiExamId = searchParams.get("multiExamId") || "";
  const subIndex = Number(searchParams.get("subIndex") || "0");

  const { data: exam, isLoading, error } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      const data = await getExam(examId);
      if (!data) throw new Error("Exam not found");
      return data;
    }
  });

  const { data: parentExam } = useQuery<Exam | null>({
    queryKey: ["/api/exams", multiExamId],
    queryFn: async () => {
      if (!multiExamId) return null;
      const data = await getExam(multiExamId);
      return data;
    },
    enabled: !!multiExamId,
  });

  const { data: subExams } = useQuery<Exam[]>({
    queryKey: ["/api/exams", exam?.id, "sub-exams"],
    queryFn: async () => {
      if (!exam?.subExamIds || exam.subExamIds.length === 0) return [];
      const subs = await Promise.all(exam.subExamIds.map(id => getExam(id)));
      return subs.filter((x): x is Exam => !!x);
    },
    enabled: !!exam?.subExamIds && exam.subExamIds.length > 0,
  });

  const { data: results } = useQuery<Result[]>({
    queryKey: ["/api/results"],
    queryFn: async () => {
      return getResults();
    },
    enabled: !!studentId,
  });

  const startExamMutation = useMutation({
    mutationFn: async (vars: { examToStartId: string; subIndex?: number; parentExamId?: string }) => {
      const { examToStartId } = vars;
      console.log("startExamMutation: Starting creation of session for", examToStartId);

      if (!examToStartId) {
        throw new Error("Exam ID is required to start session");
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), 15000);
      });

      const createPromise = createExamSession({
        examId: examToStartId,
        studentName,
        studentId,
        answers: {},
        currentQuestionIndex: 0,
      });

      try {
        return (await Promise.race([createPromise, timeoutPromise])) as ExamSession;
      } catch (err: any) {
        if (err?.message?.includes("timed out")) {
          console.warn("startExamMutation: Timeout reached, but proceeding as if successful (local-first)");
        }
        throw err;
      }
    },
    onSuccess: (session, variables) => {
      console.log("startExamMutation: Success", session, variables);
      if (!session || !session.id) {
        console.error("Failed to start session: Server did not return a valid session id.");
        toast({ title: "Error", description: "Invalid session ID returned", variant: "destructive" });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/exam-sessions"] });

      const nextParams = new URLSearchParams({
        studentName,
        studentId,
      });

      const parentId = variables?.parentExamId || multiExamId;
      if (parentId) {
        nextParams.set("multiExamId", parentId);
      }

      if (typeof variables?.subIndex === "number") {
        nextParams.set("subIndex", String(variables.subIndex));
      }

      const destination = `/exam/${variables?.examToStartId || examId}/session/${session.id}?${nextParams.toString()}`;
      console.log("Redirecting to session:", session.id, "dest:", destination);
      setLocation(destination);
    },
    onError: (error) => {
      console.error("Failed to start exam session:", error);
      startExamMutation.reset();

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

  const compositeSubExamStatus = (subExams || []).map((sub, idx) => {
    const completed = results?.some((r) => r.examId === sub.id && r.studentId === studentId) || false;
    return { sub, idx, completed };
  });

  const allCompositeCompleted = exam?.subExamIds && exam?.subExamIds.length > 0
    ? compositeSubExamStatus.filter((entry) => entry.completed).length >= exam.subExamIds.length
    : false;

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">{exam.title}</h1>
            <p className="text-muted-foreground">
              Student: {studentName} ({studentId})
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Exam Instructions</CardTitle>
              <CardDescription>
                Please read the following instructions carefully before starting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {parentExam && !exam?.subExamIds?.length ? (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-semibold text-primary-foreground">
                      {`Multi-exam progress: Subject ${subIndex + 1} of ${parentExam.subExamIds?.length || 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current subject: {exam.title}. Remaining subjects will follow automatically after submission.
                    </p>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Time Limit</h3>
                    <p className="text-sm text-muted-foreground">
                      You have {exam.duration} minutes to complete this exam. The
                      timer will start when you begin.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Questions / Sub-exams</h3>
                    {exam.subExamIds && exam.subExamIds.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          This is a composite exam containing {exam.subExamIds.length} subjects.
                        </p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          {(subExams && subExams.length > 0 ? subExams : []).map((se) => (
                            <li key={se.id}>{se.title} - {se.duration} mins, {se.questionIds?.length || 0} questions</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This exam contains {exam.questionIds?.length || 0} questions worth a
                        total of {exam.totalPoints} points.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">Passing Score</h3>
                    <p className="text-sm text-muted-foreground">
                      You need to score at least {exam.passingScore}% to pass this
                      exam.
                    </p>
                  </div>
                </div>

                {exam.examType === "Theory" && exam.theoryInstructions && (
                  <div className="rounded-md bg-secondary/20 p-4 border border-secondary/30">
                    <h3 className="font-semibold text-secondary-foreground mb-1">Additional Theory Instructions</h3>
                    <p className="text-sm whitespace-pre-wrap">{exam.theoryInstructions}</p>
                  </div>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Once you start a subject exam, you cannot pause or restart it. Make sure
                  you have a stable internet connection and enough time to complete
                  it.
                </AlertDescription>
              </Alert>

              {exam.subExamIds && exam.subExamIds.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-primary-foreground">Composite Exam Hub</p>
                    <p className="text-xs text-muted-foreground">Select a subject to begin. Completed subjects are locked.</p>
                  </div>

                  {compositeSubExamStatus.map(({ sub, idx, completed }) => (
                    <div key={sub.id} className="flex items-center justify-between gap-3 rounded border p-3">
                      <div>
                        <p className="font-medium">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{sub.questionIds?.length || 0} questions, {sub.duration} mins</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                          {completed ? 'Completed' : 'Pending'}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => startExamMutation.mutate({ examToStartId: sub.id, parentExamId: exam.id, subIndex: idx })}
                          disabled={completed || startExamMutation.isPending}
                          data-testid={`button-start-subject-${sub.id}`}
                        >
                          {completed ? 'Done' : 'Start'}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {allCompositeCompleted && (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
                      <p className="text-sm font-medium text-emerald-700">All subjects completed.</p>
                      <p className="text-xs text-emerald-600">You will be redirected to login and logged out after completing the entire composite exam.</p>
                      <Button
                        onClick={() => {
                          localStorage.removeItem("student_user");
                          setLocation("/student-login");
                        }}
                        className="mt-2"
                      >
                        Logout
                      </Button>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setLocation("/student-portal")} data-testid="button-back-to-dashboard">
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/student-portal")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("Begin Exam Clicked. Mutation status:", startExamMutation.status);
                      startExamMutation.mutate({ examToStartId: exam.id });
                    }}
                    disabled={startExamMutation.isPending}
                    className="flex-1"
                    data-testid="button-begin-exam"
                  >
                    {startExamMutation.isPending ? "Starting..." : (multiExamId ? `Begin Subject ${subIndex + 1}` : "Begin Exam")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
