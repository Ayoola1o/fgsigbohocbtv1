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
import type { Exam, ExamSession } from "@shared/schema";
import { createExamSession, getExam } from "@/lib/firebase-api";

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
                    <h3 className="font-medium">Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      This exam contains {exam.questionIds?.length || 0} questions worth a
                      total of {exam.totalPoints} points.
                    </p>
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
                  Once you start the exam, you cannot pause or restart it. Make sure
                  you have a stable internet connection and enough time to complete
                  it.
                </AlertDescription>
              </Alert>

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
                    startExamMutation.mutate();
                  }}
                  disabled={startExamMutation.isPending}
                  className="flex-1"
                  data-testid="button-begin-exam"
                >
                  {startExamMutation.isPending ? "Starting..." : "Begin Exam"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
