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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Flag, CheckCircle, AlertTriangle, Sparkles, BookOpen, ChevronLeft, ChevronRight, Send, HelpCircle, ShieldAlert, Award, Wifi, WifiOff, Volume2, Calculator, FileCode } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExamSession, Question, Exam, Result } from "@shared/schema";
import {
  getExamSession,
  getExam,
  getQuestionsByIds,
  getStudentQuestionsByIds,
  updateExamSession,
  submitExamSession,
  sendSessionHeartbeat
} from "@/lib/firebase-api";
import { cn } from "@/lib/utils";

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
  const [viewedQuestionIndices, setViewedQuestionIndices] = useState<Set<number>>(new Set([0]));
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Tools & Accessibility state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showFormulaSheet, setShowFormulaSheet] = useState<boolean>(false);
  const [calcInput, setCalcInput] = useState<string>("");
  const [calcResult, setCalcResult] = useState<string>("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCalcClick = (val: string) => {
    if (val === "C") {
      setCalcInput("");
      setCalcResult("");
    } else if (val === "=") {
      try {
        const sanitized = calcInput.replace(/[^0-9+\-*/().]/g, "");
        if (!sanitized) return;
        const res = Function(`"use strict"; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch (e) {
        setCalcResult("Error");
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setViewedQuestionIndices((prev) => {
      const next = new Set(prev);
      next.add(currentQuestionIndex);
      return next;
    });
  }, [currentQuestionIndex]);

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

  const { data: exam } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      const data = await getExam(examId);
      if (!data) throw new Error("Exam not found");
      return data;
    },
    enabled: !!examId,
  });

  const studentUser = useMemo(() => {
    const studentUserStr = localStorage.getItem("student_user");
    if (studentUserStr) {
      try {
        return JSON.parse(studentUserStr);
      } catch (e) {
        console.error("Failed to parse student_user", e);
      }
    }
    // Fallback if not found in localStorage (use session fields)
    return {
      name: session?.studentName || "Student",
      studentId: session?.studentId || "",
      classLevel: exam?.classLevel || "",
      department: exam?.department || "",
      sex: "M" // default
    };
  }, [session, exam]);

  useEffect(() => {
    if (!sessionId || sessionId === "undefined") {
      setLocation("/");
    }
  }, [sessionId, setLocation]);



  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["sessionQuestions", session?.id, exam?.id],
    queryFn: async () => {
      let idsToFetch = session?.sessionQuestionIds || [];
      const displayLimit = exam?.numberOfQuestionsToDisplay;

      if (exam?.questionIds && exam.questionIds.length > 0) {
        if (!displayLimit || displayLimit <= 0) {
          idsToFetch = exam.questionIds;
        } else if (idsToFetch.length > displayLimit) {
          idsToFetch = idsToFetch.slice(0, displayLimit);
        } else if (idsToFetch.length < displayLimit && idsToFetch.length < exam.questionIds.length) {
          const limit = Math.min(displayLimit, exam.questionIds.length);
          idsToFetch = exam.questionIds.slice(0, limit);
        }
      }

      if (!idsToFetch || idsToFetch.length === 0) {
        return [];
      }
      return getStudentQuestionsByIds(idsToFetch);
    },
    enabled: !!session && !!exam,
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

  const activeSubjectLocalIndex = useMemo(() => {
    if (!questions) return 0;
    if (exam?.examType === "Theory") return currentQuestionIndex;
    const idxInSubject = activeSubjectQuestions.findIndex(({ idx }) => idx === currentQuestionIndex);
    return idxInSubject !== -1 ? idxInSubject : currentQuestionIndex;
  }, [activeSubjectQuestions, currentQuestionIndex, questions, exam]);

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
        // Ping telemetry immediately on tab switch
        if (sessionId) {
          sendSessionHeartbeat(sessionId, {
            tabSwitches: tabSwitchesRef.current,
            isFlagged: true,
          }).catch(console.error);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session, sessionId, toast]);

  // Periodic 10-Second Heartbeat Ping
  useEffect(() => {
    if (!sessionId || !session || session.isCompleted) return;
    const sendPing = () => {
      if (navigator.onLine) {
        sendSessionHeartbeat(sessionId, {
          tabSwitches: tabSwitchesRef.current,
          isFlagged: tabSwitchesRef.current > 0,
          currentQuestionIndex,
        }).catch((err) => console.warn("Heartbeat ping error:", err));
      }
    };

    sendPing(); // initial ping
    const interval = setInterval(sendPing, 45000); // 45s periodic heartbeat (quota optimized)
    return () => clearInterval(interval);
  }, [sessionId, session?.isCompleted, currentQuestionIndex]);

  // Invigilator & Broadcast Message Notifications
  const lastBroadcastRef = useRef<string | null>(null);
  const lastDirectMsgRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;

    if (session.broadcastMessage && session.broadcastMessage !== lastBroadcastRef.current) {
      lastBroadcastRef.current = session.broadcastMessage;
      toast({
        title: "📢 Invigilator Announcement",
        description: session.broadcastMessage,
        duration: 10000,
      });
    }

    if (session.invigilatorMessage && session.invigilatorMessage !== lastDirectMsgRef.current) {
      lastDirectMsgRef.current = session.invigilatorMessage;
      toast({
        title: "✉️ Message from Invigilator",
        description: session.invigilatorMessage,
        duration: 10000,
      });
    }
  }, [session?.broadcastMessage, session?.invigilatorMessage, toast]);

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
    // Calculate end time with individual invigilator extended time
    if (endTimeRef.current === null || session?.extendedMinutes) {
      const baseDurationSeconds = (exam.duration + (session?.extendedMinutes || 0)) * 60;
      const startedAt = new Date(session.startedAt).getTime();
      endTimeRef.current = startedAt + (baseDurationSeconds * 1000);
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
  }, [session?.startedAt, session?.extendedMinutes, exam?.duration, handleAutoSubmit]);

  // Offline Answer Cache Auto-Flush on Reconnection
  useEffect(() => {
    const handleReconnect = async () => {
      if (!sessionId) return;
      const cachedAnswersStr = localStorage.getItem(`fia_session_answers_${sessionId}`);
      if (cachedAnswersStr) {
        try {
          const cachedAnswers = JSON.parse(cachedAnswersStr);
          await updateExamSession(sessionId, {
            answers: cachedAnswers,
            currentQuestionIndex,
          });
          toast({
            title: "Network Reconnected",
            description: "Your offline cached answers have been synced to the server.",
          });
        } catch (err) {
          console.warn("Failed to flush cached answers on reconnect:", err);
        }
      }
    };

    window.addEventListener("online", handleReconnect);
    return () => window.removeEventListener("online", handleReconnect);
  }, [sessionId, currentQuestionIndex, toast]);

  const debouncedSaveProgress = useCallback(
    (newAnswers: Record<string, string>, qIndex: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (navigator.onLine) {
          saveProgressMutation.mutate({
            answers: newAnswers,
            currentQuestionIndex: qIndex,
          });
        }
      }, 1200);
    },
    [saveProgressMutation]
  );

  const handleAnswerChange = useCallback(
    (questionId: string, answer: string) => {
      const prevAnswer = answers[questionId];
      if (prevAnswer && prevAnswer !== answer) {
        revisionsRef.current += 1;
      }
      const newAnswers = { ...answers, [questionId]: answer };
      setAnswers(newAnswers);

      // Instant local caching (zero loss under network outage)
      if (sessionId) {
        try {
          localStorage.setItem(`fia_session_answers_${sessionId}`, JSON.stringify(newAnswers));
        } catch (e) {
          console.error("Failed to write answer to localStorage", e);
        }
      }

      debouncedSaveProgress(newAnswers, currentQuestionIndex);
    },
    [answers, sessionId, currentQuestionIndex, debouncedSaveProgress]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      debouncedSaveProgress(answers, index);
      setCurrentQuestionIndex(index);
    },
    [answers, debouncedSaveProgress]
  );

  const toggleFlag = useCallback(
    (index: number) => {
      setFlaggedQuestions((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    []
  );

  // Keyboard Shortcuts Listener (A, B, C, D / 1, 2, 3, 4, N, P, ArrowLeft, ArrowRight, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (!questions || questions.length === 0) return;

      const key = e.key.toUpperCase();

      if (e.key === "ArrowRight" || key === "N") {
        if (currentQuestionIndex < questions.length - 1) {
          handleNavigate(currentQuestionIndex + 1);
        }
      } else if (e.key === "ArrowLeft" || key === "P") {
        if (currentQuestionIndex > 0) {
          handleNavigate(currentQuestionIndex - 1);
        }
      } else if (key === "F") {
        toggleFlag(currentQuestionIndex);
      } else if (["A", "B", "C", "D", "1", "2", "3", "4"].includes(key)) {
        const q = questions[currentQuestionIndex];
        if (q && q.options && q.options.length > 0) {
          let optionIdx = -1;
          if (["A", "B", "C", "D"].includes(key)) {
            optionIdx = key.charCodeAt(0) - 65;
          } else if (["1", "2", "3", "4"].includes(key)) {
            optionIdx = parseInt(key, 10) - 1;
          }

          if (optionIdx >= 0 && optionIdx < q.options.length) {
            handleAnswerChange(q.id, q.options[optionIdx]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestionIndex, questions, handleNavigate, handleAnswerChange, toggleFlag]);

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-16 font-sans">
      {/* Top Header Bar */}
      <div className="bg-[#1e293b] text-white px-6 py-3.5 flex items-center justify-between shadow-md border-b border-slate-700">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full border-2 border-amber-400/80 bg-slate-900 flex items-center justify-center font-serif text-amber-300 text-xs font-black shadow-inner">
            FIA
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              Fia (Faith Immaculate Academy)
            </h1>
            <p className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">
              COMPUTER-BASED TEST PORTAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-white shadow-inner">
            <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
              {studentUser.name ? studentUser.name.charAt(0).toUpperCase() : "S"}
            </div>
            <span>Student: <strong className="font-extrabold">{studentUser.name}</strong></span>
          </div>
        </div>
      </div>

      {/* Exam Info Sub-Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm font-black text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Exam: {exam.title}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
              isOnline 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Online (Auto-Sync)</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                  <span>Offline (Saved Locally)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Subject Selection Tabs (For Multi-Subject Exams) */}
      {subjects.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
          <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-slate-850 p-1.5 rounded-2xl w-fit border border-slate-300/70 dark:border-slate-750 shadow-inner">
            <span className="text-[10px] font-black uppercase text-slate-500 px-2">Subjects:</span>
            {subjects.map((subj) => {
              const isActive = subj === activeSubject;
              const stats = getSubjectStats(subj);
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    const firstIdx = questions.findIndex((q) => (q.subject || "General") === subj);
                    if (firstIdx !== -1) handleNavigate(firstIdx);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                    isActive
                      ? "bg-indigo-650 text-white shadow-md"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{subj}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-bold", isActive ? "bg-white/20 text-white" : "bg-slate-300 text-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                    {stats.answered}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Two-Column CBT Layout Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Question Area (~7 cols out of 12) */}
          <div className="lg:col-span-7">
            <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
              {/* Question Area Blue Header */}
              <div className={`px-6 py-3.5 text-white flex items-center justify-between font-bold text-sm transition-colors ${
                isTimerWarning ? "bg-rose-700" : "bg-[#475569] dark:bg-slate-800"
              }`}>
                <span className="font-black tracking-wide text-base">Question Area</span>
                <div className="flex items-center gap-2 font-mono font-black text-base">
                  <Clock className="h-4.5 w-4.5 text-amber-300" />
                  <span>Time Remaining: {formatTime(timeRemaining)}</span>
                </div>
              </div>

              {/* Question Details Body */}
              <div className="p-6 space-y-5">
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
                    {/* Question Header Metadata */}
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        Question {activeSubjectLocalIndex + 1} of {activeSubjectQuestions.length || totalSteps}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Subject: {(currentQuestion as Question)?.subject || activeSubject || "General"}
                      </p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Question Type: {(currentQuestion as Question)?.questionType === "true-false" ? "True / False" : (currentQuestion as Question)?.questionType === "short-answer" ? "Short Answer" : "Multiple Choice"}
                      </p>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-800 my-4" />

                    {/* Question Text */}
                    <h2
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed"
                      data-testid={`text-question-${currentQuestionIndex}`}
                    >
                      {(currentQuestion as Question)?.questionText}
                    </h2>

                    {/* Optional Image Diagram */}
                    {(currentQuestion as Question)?.imageUrl && (
                      <div className="my-4 flex justify-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200">
                        <img
                          src={(currentQuestion as Question).imageUrl!}
                          alt="Question Diagram"
                          className="max-h-[300px] w-auto max-w-full rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {/* Input Select Options */}
                    <div className="pt-2 space-y-3">
                      {(currentQuestion as Question)?.questionType === "multiple-choice" && (currentQuestion as Question).options && (
                        <RadioGroup
                          value={answers[(currentQuestion as Question).id] || ""}
                          onValueChange={(value) => handleAnswerChange((currentQuestion as Question).id, value)}
                          className="grid gap-3"
                        >
                          {(currentQuestion as Question).options!.map((option, idx) => {
                            const optionLetter = String.fromCharCode(65 + idx);
                            const isSelected = answers[(currentQuestion as Question).id] === option;
                            return (
                              <div
                                key={idx}
                                onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                                className={`flex items-start space-x-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                                  isSelected 
                                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 ring-1 ring-indigo-500" 
                                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                                }`}
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`option-${idx}`}
                                  className="mt-0.5 border-slate-400 text-indigo-600 shrink-0"
                                  data-testid={`radio-option-${idx}`}
                                  checked={isSelected}
                                />
                                <Label
                                  htmlFor={`option-${idx}`}
                                  className="flex-1 cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug"
                                >
                                  <strong className="font-extrabold mr-1.5">{optionLetter})</strong> {option}
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
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          {["True", "False"].map((option, idx) => {
                            const optionLetter = String.fromCharCode(65 + idx);
                            const isSelected = answers[(currentQuestion as Question).id] === option;
                            return (
                              <div
                                key={option}
                                onClick={() => handleAnswerChange((currentQuestion as Question).id, option)}
                                className={`flex items-center space-x-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                                  isSelected 
                                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 ring-1 ring-indigo-500" 
                                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                                }`}
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`option-${option}`}
                                  className="border-slate-400 text-indigo-600 shrink-0"
                                  data-testid={`radio-${option.toLowerCase()}`}
                                  checked={isSelected}
                                />
                                <Label
                                  htmlFor={`option-${option}`}
                                  className="flex-1 cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200"
                                >
                                  <strong className="font-extrabold mr-1.5">{optionLetter})</strong> {option}
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      )}

                      {(currentQuestion as Question)?.questionType === "short-answer" && (
                        <Textarea
                          placeholder="Type your answer response here..."
                          value={answers[(currentQuestion as Question).id] || ""}
                          onChange={(e) => handleAnswerChange((currentQuestion as Question).id, e.target.value)}
                          className="min-h-32 text-sm rounded-xl border-slate-300 dark:border-slate-800 font-medium p-4"
                          data-testid="textarea-answer"
                        />
                      )}
                    </div>

                    {/* Tools Toolbar (TTS, Calculator, Formula) */}
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
                          if (isSpeaking) {
                            window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                            return;
                          }
                          const q = currentQuestion as Question;
                          if (!q || !q.questionText) return;

                          let textToSpeak = `Question ${activeSubjectLocalIndex + 1}: ${q.questionText}. `;
                          if (q.options && q.options.length > 0) {
                            textToSpeak += "Options are: " + q.options.map((opt, idx) => `Option ${String.fromCharCode(65 + idx)}: ${opt}`).join(". ");
                          }

                          const utterance = new SpeechSynthesisUtterance(textToSpeak);
                          utterance.onend = () => setIsSpeaking(false);
                          utterance.onerror = () => setIsSpeaking(false);
                          setIsSpeaking(true);
                          window.speechSynthesis.speak(utterance);
                        }}
                        className={`rounded-lg h-8 px-2.5 text-xs font-bold ${
                          isSpeaking ? "bg-indigo-50 border-indigo-300 text-indigo-650" : "text-slate-600"
                        }`}
                      >
                        <Volume2 className="h-3.5 w-3.5 mr-1" />
                        {isSpeaking ? "Stop" : "Read Aloud"}
                      </Button>

                      {exam.enableCalculator && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCalculator((prev) => !prev)}
                          className="rounded-lg h-8 px-2.5 text-xs font-bold text-slate-600"
                        >
                          <Calculator className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                          Calc
                        </Button>
                      )}

                      {exam.enableFormulaSheet && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFormulaSheet((prev) => !prev)}
                          className="rounded-lg h-8 px-2.5 text-xs font-bold text-slate-600"
                        >
                          <FileCode className="h-3.5 w-3.5 mr-1 text-pink-500" />
                          Formulas
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Question Area Action Buttons */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <Button
                  onClick={() => {
                    if (currentQuestionIndex < totalSteps - 1) {
                      handleNavigate(currentQuestionIndex + 1);
                    }
                  }}
                  disabled={currentQuestionIndex === totalSteps - 1}
                  className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-extrabold px-6 h-10 rounded-xl shadow-md text-xs"
                >
                  Save and Next
                </Button>

                <Button
                  variant="outline"
                  onClick={() => toggleFlag(currentQuestionIndex)}
                  className={`rounded-xl h-10 px-4 text-xs font-bold border transition-all ${
                    flaggedQuestions.has(currentQuestionIndex)
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Flag className={`h-4 w-4 mr-1.5 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-amber-500 text-amber-500" : ""}`} />
                  Flag Question
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Test Navigator (~5 cols out of 12) */}
          <div className="lg:col-span-5">
            <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
              {/* Test Navigator Header */}
              <div className="bg-[#475569] dark:bg-slate-800 text-white px-6 py-3.5 font-black text-base">
                Test Navigator
              </div>

              {/* Navigator Buttons Grid (7 per row) */}
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2">
                  {(exam.examType === "Theory" ? (exam.theoryConfig?.structure || []) : activeSubjectQuestions.length > 0 ? activeSubjectQuestions : questions.map((q, idx) => ({ q, idx }))).map(({ q, idx }: any, localIdx: number) => {
                    const isCurrent = idx === currentQuestionIndex;
                    const isAnswered = exam.examType === "Theory"
                      ? (exam.theoryConfig?.structure?.[idx]?.questionId && answers[exam.theoryConfig.structure[idx].questionId!])
                      : answers[q.id];
                    const isFlagged = flaggedQuestions.has(idx);

                    return (
                      <Button
                        key={idx}
                        type="button"
                        size="sm"
                        onClick={() => handleNavigate(idx)}
                        className={cn(
                          "relative h-10 w-full p-0 font-extrabold rounded-lg text-sm transition-all border",
                          isCurrent
                            ? "bg-[#2563eb] text-white border-[#1d4ed8] ring-2 ring-blue-400 font-black shadow-md scale-105"
                            : isFlagged
                            ? "bg-[#f59e0b] text-white border-[#d97706]"
                            : isAnswered
                            ? "bg-[#2e7d32] text-white border-[#1b5e20]"
                            : "bg-[#cbd5e1] text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 hover:bg-slate-300"
                        )}
                        data-testid={`button-nav-${idx}`}
                      >
                        {localIdx + 1}
                        {isFlagged && (
                          <div className="absolute -right-1 -top-1">
                            <Flag className="h-3 w-3 fill-amber-300 text-amber-400" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Test Navigator Navigation Controls */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex-1 rounded-xl border-slate-300 font-extrabold text-xs h-10"
                    data-testid="button-previous"
                  >
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleNavigate(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === totalSteps - 1}
                    className="flex-1 rounded-xl border-slate-300 font-extrabold text-xs h-10"
                    data-testid="button-next"
                  >
                    Next
                  </Button>
                </div>

                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-black rounded-xl h-11 shadow-md text-xs tracking-wide uppercase"
                  data-testid="button-review-submit"
                >
                  Review and Submit
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Scientific Calculator Modal */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="sm:max-w-xs rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-500" />
              Scientific Calculator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="bg-slate-900 text-white p-3 rounded-2xl text-right font-mono min-h-[60px] flex flex-col justify-between">
              <span className="text-xs text-slate-400 truncate">{calcInput || "0"}</span>
              <span className="text-lg font-bold text-emerald-400">{calcResult}</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["C", "(", ")", "/", "7", "8", "9", "*", "4", "5", "6", "-", "1", "2", "3", "+", "0", ".", "="].map((btn) => (
                <Button
                  key={btn}
                  variant={btn === "=" ? "default" : btn === "C" ? "destructive" : "outline"}
                  onClick={() => handleCalcClick(btn)}
                  className={`h-10 text-sm font-black rounded-xl ${btn === "=" ? "col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
                >
                  {btn}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Formula Sheet Reference Modal */}
      <Dialog open={showFormulaSheet} onOpenChange={setShowFormulaSheet}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <FileCode className="h-4.5 w-4.5 text-pink-500" />
              Subject Formula & Constants Sheet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3 max-h-[400px] overflow-y-auto pr-1 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150/70 dark:border-slate-800">
              <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider mb-1.5">Physics Constants & Equations</h4>
              <p className="font-mono text-slate-700 dark:text-slate-300">g = 9.81 m/s² | c = 3.0 × 10⁸ m/s</p>
              <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">F = m · a | E = m · c² | v = u + a · t</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150/70 dark:border-slate-800">
              <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider mb-1.5">Chemistry & Gas Laws</h4>
              <p className="font-mono text-slate-700 dark:text-slate-300">P · V = n · R · T (R = 8.314 J/mol·K)</p>
              <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">pH = -log[H⁺] | Mol = Mass / Molar Mass</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150/70 dark:border-slate-800">
              <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider mb-1.5">Mathematics & Geometry</h4>
              <p className="font-mono text-slate-700 dark:text-slate-300">Quadratic: x = (-b ± √(b² - 4ac)) / (2a)</p>
              <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">Circle Area = π · r² | Volume = ⁴⁄₃ · π · r³</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
