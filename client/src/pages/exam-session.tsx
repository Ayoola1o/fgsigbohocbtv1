import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { Clock, Flag, CheckCircle, AlertTriangle, Sparkles, BookOpen, ChevronLeft, ChevronRight, Send, HelpCircle, ShieldAlert, Award } from "lucide-react";
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

  // Forensic & integrity telemetry refs
  const tabSwitchesRef = useRef<number>(0);
  const revisionsRef = useRef<number>(0);
  const timeSpentPerQuestionRef = useRef<Record<string, number>>({});
  const lastQuestionTimeRef = useRef<number>(Date.now());
  const prevIndexRef = useRef<number>(0);

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

  // Extract unique subjects from the loaded questions list
  const subjects = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    const list: string[] = [];
    questions.forEach((q) => {
      const sub = q.subject || "General";
      if (!list.includes(sub)) {
        list.push(sub);
      }
    });
    return list;
  }, [questions]);

  // Determine active subject based on active question
  const currentQuestionObj = questions?.[currentQuestionIndex];
  const activeSubject = currentQuestionObj?.subject || "General";

  // Filter navigator question list by active subject
  const activeSubjectQuestions = useMemo(() => {
    if (!questions) return [];
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter((item) => (item.q.subject || "General") === activeSubject);
  }, [questions, activeSubject]);

  // Helper to calculate answered count per subject
  const getSubjectStats = useCallback((subjName: string) => {
    if (!questions) return { answered: 0, total: 0 };
    const subjectQ = questions.filter((q) => (q.subject || "General") === subjName);
    const answered = subjectQ.filter((q) => !!answers[q.id]).length;
    return { answered, total: subjectQ.length };
  }, [questions, answers]);

  // Track pacing and duration per question
  useEffect(() => {
    if (!session || !questions || questions.length === 0) return;
    const now = Date.now();
    const prevQ = questions[prevIndexRef.current];
    if (prevQ) {
      const elapsed = Math.max(0, Math.round((now - lastQuestionTimeRef.current) / 1000));
      timeSpentPerQuestionRef.current[prevQ.id] = (timeSpentPerQuestionRef.current[prevQ.id] || 0) + elapsed;
    }
    lastQuestionTimeRef.current = now;
    prevIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex, questions, session]);

  // Tab switch warning listener
  useEffect(() => {
    if (!session || session.isCompleted) return;
    const handleVisibility = () => {
      const isCheatProtectionEnabled = localStorage.getItem("fia_cbt_settings_cheat_protection") !== "false";
      if (document.hidden && isCheatProtectionEnabled) {
        tabSwitchesRef.current += 1;
        toast({
          title: "Warning: Malpractice Flagged",
          description: `Window focus lost. This incident (Lost Focus #${tabSwitchesRef.current}) has been logged to the forensic database. Please remain within the examination screen.`,
          variant: "destructive",
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session, toast]);

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { answers: Record<string, string>; currentQuestionIndex: number }) => {
      return updateExamSession(sessionId, data);
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async (vars: { 
      submissionType: 'student' | 'auto', 
      answers: Record<string, string>,
      telemetry?: { tabSwitches: number; revisions: number; timeSpentPerQuestion: Record<string, number> }
    }) => {
      console.log("submitExamMutation: Starting submission...");

      // Save localized submission intent immediately to block re-entry
      if (session?.studentId && session?.examId) {
        const key = `fia_submitted_exam_${session.studentId.trim().toLowerCase()}_${session.examId}`;
        localStorage.setItem(key, "true");
        console.log(`Saved local submission intent: ${key}`);
      }

      // 10 second timeout for the UI to wait before assuming success (local save)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("SUBMISSION_TIMEOUT")), 10000);
      });

      const submitPromise = submitExamSession(sessionId, vars.answers, vars.submissionType, vars.telemetry);

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
      // Finalize the last question's time
      const now = Date.now();
      const currentQ = questions?.[currentQuestionIndex];
      if (currentQ) {
        const elapsed = Math.max(0, Math.round((now - lastQuestionTimeRef.current) / 1000));
        timeSpentPerQuestionRef.current[currentQ.id] = (timeSpentPerQuestionRef.current[currentQ.id] || 0) + elapsed;
      }
      const telemetryObj = {
        tabSwitches: tabSwitchesRef.current,
        revisions: revisionsRef.current,
        timeSpentPerQuestion: timeSpentPerQuestionRef.current
      };
      submitExamMutation.mutate({ submissionType: 'auto', answers, telemetry: telemetryObj });
    }
  }, [submitExamMutation, answers, questions, currentQuestionIndex]);

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
    const prevAnswer = answers[questionId];
    if (prevAnswer && prevAnswer !== answer) {
      revisionsRef.current += 1;
    }
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

  const warningMinutes = Number(localStorage.getItem("fia_cbt_settings_timer_warning") || "5");
  const isTimerWarning = timeRemaining < (warningMinutes * 60);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 font-sans">
      {/* Premium Top Sticky Progress Navbar */}
      <div className="sticky top-0 z-40 border-b border-slate-150/70 bg-white/90 dark:bg-slate-900/90 dark:border-slate-805/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
              <Sparkles className="h-3 w-3" /> Live Exam Session
            </span>
            <h1 className="text-base sm:text-lg font-black text-slate-850 dark:text-slate-100 leading-tight" data-testid="text-exam-title">
              {exam.title}
            </h1>
          </div>

          <div className="flex items-center gap-5 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-2.5 bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-805/40 py-1.5 px-4.5 rounded-2xl">
              <Clock className={`h-4.5 w-4.5 shrink-0 ${isTimerWarning ? "text-rose-500 animate-pulse" : "text-indigo-500"}`} />
              <span
                className={`text-base font-extrabold tabular-nums ${
                  isTimerWarning ? "text-rose-500 font-black" : "text-slate-700 dark:text-slate-350"
                }`}
                data-testid="text-timer"
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
            
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md hover:scale-[1.01] transition-transform rounded-xl px-5.5 h-10 flex items-center gap-1.5"
              data-testid="button-submit-exam"
            >
              <Send className="h-4 w-4" />
              Submit CBT
            </Button>
          </div>
        </div>

        {/* Real-time progress indicator */}
        <div className="bg-slate-50/50 dark:bg-slate-950/30 px-4 py-2 border-t border-slate-100 dark:border-slate-805/30">
          <div className="container mx-auto max-w-4xl flex items-center justify-between gap-4">
            <Progress value={progress} className="h-1.5 flex-1 rounded-full bg-slate-150 dark:bg-slate-800" />
            <span className="text-[11px] font-bold text-slate-455 shrink-0">
              {answeredCount} of {totalSteps} Completed
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-10">
        {exam.examType === "Objectives" && subjects.length > 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Subject Sidebar */}
            <div className="lg:col-span-3 space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 rounded-3xl shadow-lg shadow-slate-100/30 dark:shadow-none overflow-hidden">
                <div className="bg-slate-50/50 dark:bg-slate-950/40 px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-205 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    Subject Sections
                  </h3>
                </div>
                <CardContent className="p-3 space-y-1.5">
                  {subjects.map((subj) => {
                    const isActive = subj === activeSubject;
                    const stats = getSubjectStats(subj);
                    const isDone = stats.answered === stats.total;

                    return (
                      <button
                        key={subj}
                        onClick={() => {
                          const firstIdx = questions.findIndex((q) => (q.subject || "General") === subj);
                          if (firstIdx !== -1) {
                            handleNavigate(firstIdx);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold shadow-md shadow-indigo-650/10"
                            : "text-slate-650 dark:text-slate-350 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-semibold"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isDone ? (
                            <CheckCircle className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-emerald-500"}`} />
                          ) : (
                            <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-indigo-500"}`} />
                          )}
                          <span className="truncate text-sm">{subj}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isActive
                              ? "bg-white/10 text-white border-white/20"
                              : "bg-slate-100 dark:bg-slate-950 border-slate-250 dark:border-slate-800 text-slate-500"
                          }`}
                        >
                          {stats.answered}/{stats.total}
                        </Badge>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Main Area */}
            <div className="lg:col-span-9 space-y-8 animate-in fade-in duration-300">
              {/* Active Question Display Card */}
              <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden relative">
                <CardContent className="p-6 sm:p-10">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3.5 flex items-center gap-2">
                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold uppercase py-0.5 px-2.5 rounded-lg border border-indigo-100/20 dark:border-indigo-900/20 text-[10px]">
                          Item No. {currentQuestionIndex + 1}
                        </Badge>
                        {currentQuestion && (
                          <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-455 py-0.5 px-2.5 rounded-lg">
                            {(currentQuestion as Question).points} Point{(currentQuestion as Question).points !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      <h2
                        className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-150 leading-relaxed max-w-3xl"
                        data-testid={`text-question-${currentQuestionIndex}`}
                      >
                        {(currentQuestion as Question)?.questionText}
                      </h2>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFlag(currentQuestionIndex)}
                      className={`rounded-xl h-10 w-10 shrink-0 border transition-all ${
                        flaggedQuestions.has(currentQuestionIndex) 
                          ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-955/20 dark:border-rose-900/30" 
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-400"
                      }`}
                      data-testid="button-flag-question"
                    >
                      <Flag className={`h-4.5 w-4.5 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-rose-500 text-rose-500" : ""}`} />
                    </Button>
                  </div>

                  {/* Optional Image Diagram */}
                  {(currentQuestion as Question)?.imageUrl && (
                    <div className="mb-8 flex justify-center bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-805/40">
                      <img
                        src={(currentQuestion as Question).imageUrl!}
                        alt="Question Diagram"
                        className="max-h-[350px] w-auto max-w-full rounded-xl object-contain shadow-sm border border-slate-200/50"
                      />
                    </div>
                  )}

                  {/* Input Select Options */}
                  <div className="space-y-4.5">
                    {(currentQuestion as Question)?.questionType === "multiple-choice" && (currentQuestion as Question).options && (
                      <RadioGroup
                        value={answers[(currentQuestion as Question).id] || ""}
                        onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                        className="grid gap-3.5"
                      >
                        {(currentQuestion as Question).options!.map((option, idx) => {
                          const isSelected = answers[(currentQuestion as Question).id] === option;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                              className={`flex items-center space-x-3.5 rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? "border-indigo-650 bg-indigo-50/15 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm" 
                                  : "border-slate-150/70 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-805 dark:hover:bg-slate-850/50"
                              }`}
                            >
                              <RadioGroupItem
                                value={option}
                                id={`option-${idx}`}
                                className="border-slate-350 dark:border-slate-700 text-indigo-600 dark:text-indigo-500 shrink-0"
                                data-testid={`radio-option-${idx}`}
                                checked={isSelected}
                              />
                              <Label
                                htmlFor={`option-${idx}`}
                                className="flex-1 cursor-pointer text-[15px] font-semibold text-slate-750 dark:text-slate-250 leading-snug"
                              >
                                {option}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    )}

                    {(currentQuestion as Question)?.questionType === "true-false" && (
                      <RadioGroup
                        value={answers[(currentQuestion as Question).id] || ""}
                        onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                        className="grid gap-3.5 sm:grid-cols-2"
                      >
                        {["True", "False"].map((option) => {
                          const isSelected = answers[(currentQuestion as Question).id] === option;
                          return (
                            <div
                              key={option}
                              onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                              className={`flex items-center space-x-3.5 rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? "border-indigo-650 bg-indigo-50/15 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm" 
                                  : "border-slate-150/70 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-805 dark:hover:bg-slate-850/50"
                              }`}
                            >
                              <RadioGroupItem
                                value={option}
                                id={`option-${option}`}
                                className="border-slate-350 dark:border-slate-700 text-indigo-600 dark:text-indigo-500 shrink-0"
                                data-testid={`radio-${option.toLowerCase()}`}
                                checked={isSelected}
                              />
                              <Label
                                htmlFor={`option-${option}`}
                                className="flex-1 cursor-pointer text-base font-extrabold text-slate-750 dark:text-slate-250"
                              >
                                {option}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    )}

                    {(currentQuestion as Question)?.questionType === "short-answer" && (
                      <Textarea
                        placeholder="Type your structured descriptive response here..."
                        value={answers[(currentQuestion as Question).id] || ""}
                        onChange={(e) => handleAnswerChange((currentQuestion as Question).id, e.target.value)}
                        className="min-h-32 text-base rounded-2xl border-slate-150/70 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-900/20 focus:border-indigo-500 font-semibold p-4"
                        data-testid="textarea-answer"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Core Controls Navigation */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleNavigate(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-bold h-11 px-6 transition-all"
                  data-testid="button-previous"
                >
                  <ChevronLeft className="mr-1.5 h-5 w-5" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleNavigate(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === totalSteps - 1}
                  className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-extrabold h-11 px-6 max-w-xs transition-all flex items-center justify-center gap-1.5"
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Matrix Grid Navigator Panel (Filtered by active subject) */}
              <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-500" /> {activeSubject} Index Map Navigator
                  </h3>
                  
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5">
                    {activeSubjectQuestions.map(({ q, idx }) => {
                      const isCurrent = idx === currentQuestionIndex;
                      const isAnswered = !!answers[q.id];
                      
                      return (
                        <Button
                          key={idx}
                          variant={isCurrent ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleNavigate(idx)}
                          className={`relative h-10 w-10 p-0 font-extrabold rounded-xl transition-all ${
                            isCurrent
                              ? "bg-indigo-650 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 scale-105"
                              : isAnswered
                              ? "bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                              : "border-slate-150/70 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350"
                          }`}
                          data-testid={`button-nav-${idx}`}
                        >
                          {idx + 1}
                          {flaggedQuestions.has(idx) && (
                            <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center border border-white dark:border-slate-900">
                              <Flag className="h-2 w-2 fill-white" />
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Navigator Legend */}
                  <div className="mt-5.5 pt-4.5 border-t border-slate-100 dark:border-slate-805/45 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded-md bg-emerald-50 border border-emerald-250 dark:bg-emerald-950/30 dark:border-emerald-900/30" />
                      <span>Answered Logs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded-md border border-slate-200 dark:border-slate-800" />
                      <span>Remaining</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded-md bg-rose-500 flex items-center justify-center text-white">
                        <Flag className="h-2 w-2 fill-white" />
                      </div>
                      <span>Flagged items</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {/* Active Question Display Card */}
            <Card className="mb-8 border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden relative">
              <CardContent className="p-6 sm:p-10">
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
                    <div className="py-12 text-center text-slate-400">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                      <span>Question configuration not resolved.</span>
                    </div>
                  )
                ) : (
                  <>
                    <div className="mb-8 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-3.5 flex items-center gap-2">
                          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold uppercase py-0.5 px-2.5 rounded-lg border border-indigo-100/20 dark:border-indigo-900/20 text-[10px]">
                            Item No. {currentQuestionIndex + 1}
                          </Badge>
                          {currentQuestion && (
                            <Badge variant="outline" className="border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-455 py-0.5 px-2.5 rounded-lg">
                              {(currentQuestion as Question).points} Point{(currentQuestion as Question).points !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        
                        <h2
                          className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-150 leading-relaxed max-w-3xl"
                          data-testid={`text-question-${currentQuestionIndex}`}
                        >
                          {(currentQuestion as Question)?.questionText}
                        </h2>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFlag(currentQuestionIndex)}
                        className={`rounded-xl h-10 w-10 shrink-0 border transition-all ${
                          flaggedQuestions.has(currentQuestionIndex) 
                            ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-955/20 dark:border-rose-900/30" 
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-400"
                        }`}
                        data-testid="button-flag-question"
                      >
                        <Flag className={`h-4.5 w-4.5 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-rose-500 text-rose-500" : ""}`} />
                      </Button>
                    </div>

                    {/* Optional Image Diagram */}
                    {(currentQuestion as Question)?.imageUrl && (
                      <div className="mb-8 flex justify-center bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-805/40">
                        <img
                          src={(currentQuestion as Question).imageUrl!}
                          alt="Question Diagram"
                          className="max-h-[350px] w-auto max-w-full rounded-xl object-contain shadow-sm border border-slate-200/50"
                        />
                      </div>
                    )}

                    {/* Input Select Options */}
                    <div className="space-y-4.5">
                      {(currentQuestion as Question)?.questionType === "multiple-choice" && (currentQuestion as Question).options && (
                        <RadioGroup
                          value={answers[(currentQuestion as Question).id] || ""}
                          onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                          className="grid gap-3.5"
                        >
                          {(currentQuestion as Question).options!.map((option, idx) => {
                            const isSelected = answers[(currentQuestion as Question).id] === option;
                            return (
                              <div
                                key={idx}
                                onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                                className={`flex items-center space-x-3.5 rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? "border-indigo-650 bg-indigo-50/15 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm" 
                                    : "border-slate-150/70 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-805 dark:hover:bg-slate-850/50"
                                }`}
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`option-${idx}`}
                                  className="border-slate-350 dark:border-slate-700 text-indigo-600 dark:text-indigo-500 shrink-0"
                                  data-testid={`radio-option-${idx}`}
                                  checked={isSelected}
                                />
                                <Label
                                  htmlFor={`option-${idx}`}
                                  className="flex-1 cursor-pointer text-[15px] font-semibold text-slate-750 dark:text-slate-250 leading-snug"
                                >
                                  {option}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      )}

                      {(currentQuestion as Question)?.questionType === "true-false" && (
                        <RadioGroup
                          value={answers[(currentQuestion as Question).id] || ""}
                          onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                          className="grid gap-3.5 sm:grid-cols-2"
                        >
                          {["True", "False"].map((option) => {
                            const isSelected = answers[(currentQuestion as Question).id] === option;
                            return (
                              <div
                                key={option}
                                onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                                className={`flex items-center space-x-3.5 rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? "border-indigo-650 bg-indigo-50/15 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-sm" 
                                    : "border-slate-150/70 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-805 dark:hover:bg-slate-850/50"
                                }`}
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`option-${option}`}
                                  className="border-slate-350 dark:border-slate-700 text-indigo-600 dark:text-indigo-500 shrink-0"
                                  data-testid={`radio-${option.toLowerCase()}`}
                                  checked={isSelected}
                                />
                                <Label
                                  htmlFor={`option-${option}`}
                                  className="flex-1 cursor-pointer text-base font-extrabold text-slate-750 dark:text-slate-250"
                                >
                                  {option}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      )}

                      {(currentQuestion as Question)?.questionType === "short-answer" && (
                        <Textarea
                          placeholder="Type your structured descriptive response here..."
                          value={answers[(currentQuestion as Question).id] || ""}
                          onChange={(e) => handleAnswerChange((currentQuestion as Question).id, e.target.value)}
                          className="min-h-32 text-base rounded-2xl border-slate-150/70 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-900/20 focus:border-indigo-500 font-semibold p-4"
                          data-testid="textarea-answer"
                        />
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Core Controls Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => handleNavigate(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-bold h-11 px-6 transition-all"
                data-testid="button-previous"
              >
                <ChevronLeft className="mr-1.5 h-5 w-5" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleNavigate(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === totalSteps - 1}
                className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-extrabold h-11 px-6 max-w-xs transition-all flex items-center justify-center gap-1.5"
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Matrix Grid Navigator Panel */}
            <Card className="mt-10 border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-500" /> CBT Index Map Navigator
                </h3>
                
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5">
                  {(exam.examType === "Theory" ? (exam.theoryConfig?.structure || []) : questions).map((q: any, idx: number) => {
                    const isCurrent = idx === currentQuestionIndex;
                    const isAnswered = exam.examType === "Theory"
                      ? (exam.theoryConfig?.structure?.[idx]?.questionId && answers[exam.theoryConfig.structure[idx].questionId!])
                      : answers[q.id];
                    
                    return (
                      <Button
                        key={idx}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleNavigate(idx)}
                        className={`relative h-10 w-10 p-0 font-extrabold rounded-xl transition-all ${
                          isCurrent
                            ? "bg-indigo-650 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 scale-105"
                            : isAnswered
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400"
                            : "border-slate-150/70 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350"
                        }`}
                        data-testid={`button-nav-${idx}`}
                      >
                        {idx + 1}
                        {flaggedQuestions.has(idx) && (
                          <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center border border-white dark:border-slate-900">
                            <Flag className="h-2 w-2 fill-white" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Navigator Legend */}
                <div className="mt-5.5 pt-4.5 border-t border-slate-100 dark:border-slate-805/45 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md bg-emerald-50 border border-emerald-250 dark:bg-emerald-950/30 dark:border-emerald-900/30" />
                    <span>Answered Logs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md border border-slate-200 dark:border-slate-800" />
                    <span>Remaining</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-md bg-rose-500 flex items-center justify-center text-white">
                      <Flag className="h-2 w-2 fill-white" />
                    </div>
                    <span>Flagged items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Confirmation Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-3xl border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-2xl p-6">
          <AlertDialogHeader className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-slate-850 dark:text-white">Submit CBT Exam?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mt-2 space-y-2">
              <p>
                You have resolved and answered <span className="font-extrabold text-slate-700 dark:text-slate-350">{answeredCount}</span> items out of <span className="font-extrabold text-slate-700 dark:text-slate-350">{totalSteps}</span> total questions.
              </p>
              <p>Once submitted, your final examination answers will be locked for grading and cannot be altered.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3.5 mt-6">
            <AlertDialogCancel 
              className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold h-11 px-5 hover:bg-slate-50/70"
              data-testid="button-cancel-submit"
            >
              Continue Solving
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const now = Date.now();
                const currentQ = questions?.[currentQuestionIndex];
                if (currentQ) {
                  const elapsed = Math.max(0, Math.round((now - lastQuestionTimeRef.current) / 1000));
                  timeSpentPerQuestionRef.current[currentQ.id] = (timeSpentPerQuestionRef.current[currentQ.id] || 0) + elapsed;
                }
                const telemetryObj = {
                  tabSwitches: tabSwitchesRef.current,
                  revisions: revisionsRef.current,
                  timeSpentPerQuestion: timeSpentPerQuestionRef.current
                };
                submitExamMutation.mutate({ submissionType: 'student', answers, telemetry: telemetryObj });
              }}
              disabled={submitExamMutation.isPending}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl h-11 px-6 shadow-md transition-all shrink-0"
              data-testid="button-confirm-submit"
            >
              {submitExamMutation.isPending ? "Grading..." : "Yes, Submit Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
