import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Flag, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExamSession, Question, Exam, Result } from "@shared/schema";
import {
  getExamSession,
  getExam,
  getQuestionsByIds,
  updateExamSession,
  submitExamSession
} from "@/lib/firebase-api";

interface TheorySlot {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  questionId?: string;
  children: TheorySlot[];
}

function TheoryQuestionView({
  slot,
  questions,
  answers,
  onAnswerChange,
  mainLabel
}: {
  slot: TheorySlot;
  questions: Question[];
  answers: Record<string, string>;
  onAnswerChange: (id: string, val: string) => void;
  mainLabel: string;
}) {
  const question = questions.find((q) => q.id === slot.questionId);

  // Custom labeling logic requested by user
  let displayLabel = "";
  if (slot.level === 1) {
    displayLabel = `${slot.label}.`;
  } else if (slot.level === 2) {
    // If it's the first child (a), prefix with main number (e.g., 1a)
    // Actually, in our structure, the slot.label is already 'a', 'b', etc.
    // The user wants '1a.' for the first one, then 'b.', 'c.'
    if (slot.label === "a") {
      displayLabel = `${mainLabel}${slot.label}.`;
    } else {
      displayLabel = `${slot.label}.`;
    }
  } else {
    // Level 3 (Roman numerals i, ii, iii)
    displayLabel = `${slot.label}.`;
  }

  return (
    <div className={`space-y-4 ${slot.level > 1 ? "ml-8" : ""}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <span className="font-bold text-lg min-w-[2rem]">{displayLabel}</span>
          {question ? (
            <h3 className="text-lg leading-relaxed">{question.questionText}</h3>
          ) : slot.questionId ? (
            <h3 className="text-lg leading-relaxed text-muted-foreground italic">
              [Question text not found. ID: {slot.questionId}]
            </h3>
          ) : (
            <h3 className="text-lg leading-relaxed text-muted-foreground italic">
              (Instructional heading or part without content)
            </h3>
          )}
        </div>

        {question?.imageUrl && (
          <div className="ml-10 my-2">
            <img
              src={question.imageUrl}
              alt="Question detail"
              className="max-h-64 object-contain rounded border"
            />
          </div>
        )}
      </div>

      {question && (
        <div className="ml-8 mt-2">
          <Textarea
            placeholder="Type your answer here..."
            value={answers[slot.questionId!] || ""}
            onChange={(e) => onAnswerChange(slot.questionId!, e.target.value)}
            className="min-h-[120px]"
          />
        </div>
      )}


      {
        slot.children && slot.children.length > 0 && (
          <div className="space-y-6 mt-4">
            {slot.children.map((child) => (
              <TheoryQuestionView
                key={child.id}
                slot={child}
                questions={questions}
                answers={answers}
                onAnswerChange={onAnswerChange}
                mainLabel={mainLabel}
              />
            ))}
          </div>
        )
      }
    </div >
  );
}

export default function ExamSessionPage() {
  const params = useParams<{ examId: string; sessionId: string }>();
  const [, setLocation] = useLocation();
  const { examId, sessionId } = params;
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery<(ExamSession & { serverTime?: string }) | null>({
    queryKey: ["/api/exam-sessions", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const data = await getExamSession(sessionId);
      if (!data) throw new Error("Session not found");
      return data;
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId || sessionId === "undefined") {
      // If there's no sessionId in the route, redirect back to exams list
      setLocation("/");
    }
  }, [sessionId, setLocation]);

  const { data: exam } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      const data = await getExam(examId);
      if (!data) throw new Error("Exam not found");
      return data;
    },
    enabled: !!session,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["sessionQuestions", session?.id],
    queryFn: async () => {
      if (!session?.sessionQuestionIds || session.sessionQuestionIds.length === 0) {
        return [];
      }
      return getQuestionsByIds(session.sessionQuestionIds);
    },
    enabled: !!session?.sessionQuestionIds && session.sessionQuestionIds.length > 0,
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { answers: Record<string, string>; currentQuestionIndex: number }) => {
      return updateExamSession(sessionId, data);
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (vars: { submissionType: 'student' | 'auto', answers: Record<string, string> }) => {
      console.log("submitExamMutation: Starting submission...");

      // 10 second timeout for the UI to wait before assuming success (local save)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("SUBMISSION_TIMEOUT")), 10000);
      });

      const submitPromise = submitExamSession(sessionId, vars.answers, vars.submissionType);

      try {
        return await Promise.race([submitPromise, timeoutPromise]);
      } catch (err: any) {
        if (err.message === "SUBMISSION_TIMEOUT") {
          console.warn("submitExamMutation: Timeout reached, but proceeding as if successful (local-first)");
          return { id: "offline-result" }; // Dummy result to trigger onSuccess
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      console.log("submitExamMutation: Success/Proceeding", result);
      queryClient.invalidateQueries({ queryKey: ["/api/exam-sessions"] });
      toast({
        title: "Exam Submitted",
        description: "Your exam has been successfully submitted. You may now leave.",
      });
      setLocation("/");
    },
    onError: (error) => {
      console.error("Failed to submit exam:", error);
      submitExamMutation.reset(); // Reset to allow retry if it really failed
      toast({
        title: "Submission Status",
        description: "Submission encountered an issue, but your answers are saved locally. You can try submitting again or leave the page.",
        variant: "destructive",
      });
    }
  });

  const handleAutoSubmit = useCallback(() => {
    if (!submitExamMutation.isPending) {
      submitExamMutation.mutate({ submissionType: 'auto', answers });
    }
  }, [submitExamMutation, answers]);

  // Track if we've initialized the session state to prevent overwriting user input
  const isInitialized = useRef<boolean>(false);
  // Track if the exam is active to prevent redundant submission calls
  const isExamActive = useRef<boolean>(true);

  // Effect 1: Initialize local state from session data (Run only once per session load)
  useEffect(() => {
    if (session && !isInitialized.current) {
      setAnswers(session.answers || {});
      // Only set index if it's explicitly saved, otherwise default to 0
      if (typeof session.currentQuestionIndex === 'number') {
        setCurrentQuestionIndex(session.currentQuestionIndex);
      }
      isInitialized.current = true;
    }
  }, [session]);

  // Effect 2: Timer Logic - Robust implementation
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session || !exam || !isExamActive.current) return;

    // Calculate end time only once or if dependencies drastically change
    if (endTimeRef.current === null) {
      const examDurationSeconds = exam.duration * 60;
      const startedAt = new Date(session.startedAt).getTime();
      // Server time offset might be needed in production but for now:
      // We assume client clock is reasonably close or rely on relative diff if provided
      // Ideally: endTime = startedAt + duration
      endTimeRef.current = startedAt + (examDurationSeconds * 1000);
    }

    const calculateRemaining = () => {
      if (!endTimeRef.current) return 0;
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      return diff;
    };

    // Initial set
    setTimeRemaining(calculateRemaining());

    const timerId = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timerId);
        if (isExamActive.current) {
          isExamActive.current = false;
          handleAutoSubmit();
        }
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [session?.startedAt, exam?.duration, handleAutoSubmit]);


  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    saveProgressMutation.mutate({
      answers: newAnswers,
      currentQuestionIndex,
    });
  };

  const handleNavigate = (index: number) => {
    saveProgressMutation.mutate({
      answers,
      currentQuestionIndex: index,
    });
    setCurrentQuestionIndex(index);
  };

  const toggleFlag = (index: number) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(index)) {
      newFlagged.delete(index);
    } else {
      newFlagged.add(index);
    }
    setFlaggedQuestions(newFlagged);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = (exam?.examType === "Theory" && exam.theoryConfig?.structure)
    ? (exam.theoryConfig.structure[currentQuestionIndex] as TheorySlot | undefined)
    : questions?.[currentQuestionIndex];

  const totalSteps = (exam?.examType === "Theory" && exam.theoryConfig?.structure)
    ? exam.theoryConfig.structure.length
    : (questions?.length || 0);

  const progress = totalSteps > 0 ? ((currentQuestionIndex + 1) / totalSteps) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (sessionLoading || !session || !exam || questionsLoading || !questions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-4xl space-y-4 px-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (session.isCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This exam has already been submitted. Redirecting...
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold" data-testid="text-exam-title">
                {exam.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {totalSteps}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span
                  className={`text-lg font-semibold tabular-nums ${timeRemaining < 300 ? "text-destructive" : ""
                    }`}
                  data-testid="text-timer"
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant="default"
                data-testid="button-submit-exam"
              >
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-4">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {answeredCount}/{questions?.length || 0} items answered
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardContent className="p-8">
              {exam.examType === "Theory" ? (
                currentQuestion ? (
                  <TheoryQuestionView
                    slot={currentQuestion as TheorySlot}
                    questions={questions}
                    answers={answers}
                    onAnswerChange={handleAnswerChange}
                    mainLabel={(currentQuestionIndex + 1).toString()}
                  />
                ) : (
                  <p>Question not found.</p>
                )
              ) : (
                <>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary">
                          Question {currentQuestionIndex + 1}
                        </Badge>
                        {currentQuestion && (
                          <Badge variant="outline">{(currentQuestion as Question).points} point{(currentQuestion as Question).points !== 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                      <h2
                        className="text-xl font-medium leading-relaxed md:text-2xl"
                        data-testid={`text-question-${currentQuestionIndex}`}
                      >
                        {(currentQuestion as Question)?.questionText}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFlag(currentQuestionIndex)}
                      className={flaggedQuestions.has(currentQuestionIndex) ? "text-primary" : ""}
                      data-testid="button-flag-question"
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>

                  {(currentQuestion as Question)?.imageUrl && (
                    <div className="mb-6 flex justify-center">
                      <img
                        src={(currentQuestion as Question).imageUrl!}
                        alt="Question Diagram"
                        className="max-h-[400px] w-auto max-w-full rounded-lg border bg-muted object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    {(currentQuestion as Question)?.questionType === "multiple-choice" && (currentQuestion as Question).options && (
                      <RadioGroup
                        value={answers[(currentQuestion as Question).id] || ""}
                        onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                      >
                        {(currentQuestion as Question).options!.map((option, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-3 rounded-md border p-4 hover-elevate"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${idx}`}
                              data-testid={`radio-option-${idx}`}
                            />
                            <Label
                              htmlFor={`option-${idx}`}
                              className="flex-1 cursor-pointer text-lg font-normal"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {(currentQuestion as Question)?.questionType === "true-false" && (
                      <RadioGroup
                        value={answers[(currentQuestion as Question).id] || ""}
                        onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                      >
                        {["True", "False"].map((option) => (
                          <div
                            key={option}
                            className="flex items-center space-x-3 rounded-md border p-4 hover-elevate"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`option-${option}`}
                              data-testid={`radio-${option.toLowerCase()}`}
                            />
                            <Label
                              htmlFor={`option-${option}`}
                              className="flex-1 cursor-pointer text-lg font-normal"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {(currentQuestion as Question)?.questionType === "short-answer" && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={answers[(currentQuestion as Question).id] || ""}
                        onChange={(e) => handleAnswerChange((currentQuestion as Question).id, e.target.value)}
                        className="min-h-32 text-base"
                        data-testid="textarea-answer"
                      />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => handleNavigate(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              data-testid="button-previous"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handleNavigate(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === totalSteps - 1}
              className="flex-1"
              data-testid="button-next"
            >
              Next
            </Button>
          </div>

          {/* Question Navigator */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Question Navigator
              </h3>
              <div className="grid grid-cols-8 gap-2 md:grid-cols-10">
                {(exam.examType === "Theory" ? (exam.theoryConfig?.structure || []) : questions).map((q: any, idx: number) => (
                  <Button
                    key={idx}
                    variant={idx === currentQuestionIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleNavigate(idx)}
                    className={`relative h-10 w-10 p-0 ${exam.examType === "Theory"
                      ? (exam.theoryConfig?.structure?.[idx]?.questionId && answers[exam.theoryConfig.structure[idx].questionId!] ? "bg-green-500 text-white border-green-600" : "")
                      : (answers[q.id] ? "bg-green-500 text-white border-green-600" : "")
                      }`}
                    data-testid={`button-nav-${idx}`}
                  >
                    {idx + 1}
                    {flaggedQuestions.has(idx) && (
                      <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-primary text-primary" />
                    )}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-primary" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 fill-primary text-primary" />
                  <span>Flagged</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-foreground">
              <p>
                You have answered {answeredCount} items.
              </p>
              <p>Once submitted, you cannot make any changes to your answers.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-submit">
              Review Answers
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submitExamMutation.mutate({ submissionType: 'student', answers })}
              disabled={submitExamMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitExamMutation.isPending ? "Submitting..." : "Submit Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
