import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useRoute } from "wouter";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, XCircle, Award, TrendingUp, Sparkles, BookOpen, Clock, Calendar, ArrowLeft, Target, HelpCircle, GraduationCap, ChevronLeft, Printer, AlertTriangle } from "lucide-react";
import { createRoot } from "react-dom/client";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import type { Result, Question, Exam, Student } from "@shared/schema";
import { getResult, getExam, getQuestionsByIds, getStudents } from "@/lib/firebase-api";


export default function ExamResult() {
  const params = useParams<{ resultId: string }>();
  const [isAdminResult] = useRoute("/admin/results/:resultId");
  const resultId = params.resultId;

  const { data: result, isLoading: resultLoading } = useQuery<Result>({
    queryKey: ["/api/results", resultId],
    queryFn: async () => {
      if (!resultId) throw new Error("Result ID required");
      const data = await getResult(resultId);
      if (!data) throw new Error("Result not found");
      return data;
    },
  });

  const { data: exam } = useQuery<Exam>({
    queryKey: ["/api/exams", result?.examId],
    queryFn: async () => {
      const data = await getExam(result!.examId);
      if (!data) throw new Error("Exam not found");
      return data;
    },
    enabled: !!result?.examId,
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/exams", result?.examId, "questions"],
    queryFn: async () => {
      // Prioritize questions from result.correctAnswers as it reflects the actual questions graded
      const gradedQuestionIds = result?.correctAnswers ? Object.keys(result.correctAnswers) : [];
      // Fallback to result.answers if correctAnswers is empty (e.g. legacy or not graded yet)
      const answeredQuestionIds = result?.answers ? Object.keys(result.answers) : [];

      const targetIds = gradedQuestionIds.length > 0 ? gradedQuestionIds : answeredQuestionIds;

      if (targetIds.length === 0) {
        // Absolute fallback if result has no question info (rare/legacy) - fetch default exam questions
        if (exam?.questionIds) return getQuestionsByIds(exam.questionIds);
        return [];
      }
      return getQuestionsByIds(targetIds);
    },
    enabled: !!result,
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    queryFn: getStudents,
  });

  const student = students?.find(s => s.studentId === result?.studentId);

  // Calculate subject breakdown for diagnostics and printing
  const subjectBreakdown = useMemo(() => {
    if (!questions || !result) return [];
    const subjects = Array.from(new Set(questions.map(q => q.subject || "General")));
    return subjects.map(subject => {
      const subjectQuestions = questions.filter(q => (q.subject || "General") === subject);
      let correct = 0;
      subjectQuestions.forEach(q => {
        if (result.correctAnswers[q.id]) correct++;
      });
      const pct = subjectQuestions.length > 0 ? (correct / subjectQuestions.length) * 150 : 0; // scaled logic or exact percent
      const actualPct = subjectQuestions.length > 0 ? (correct / subjectQuestions.length) * 100 : 0;
      return {
        subject,
        questions: subjectQuestions.length,
        correct,
        percentage: actualPct
      };
    });
  }, [questions, result]);

  const strengths = useMemo(() => subjectBreakdown.filter(b => b.percentage >= 70).map(b => b.subject), [subjectBreakdown]);
  const weaknesses = useMemo(() => subjectBreakdown.filter(b => b.percentage < 55).map(b => b.subject), [subjectBreakdown]);

  const recommendations = useMemo(() => {
    if (weaknesses.length === 0) {
      return "Superb performance! You have mastered all topics. Keep studying to maintain your outstanding score.";
    }
    return `Focus your practice on ${weaknesses.join(", ")} to boost your performance. Review standard textbooks and complete mock exercises on these topics.`;
  }, [weaknesses]);

  if (resultLoading || !result) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const correctCount = Object.values(result.correctAnswers).filter(Boolean).length;
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Scorecard</title>
  </head>
  <body>
    <div id="print-root"></div>
  </body>
</html>`);
    printWindow.document.close();

    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(s => {
      try {
        printWindow.document.head.appendChild(s.cloneNode(true));
      } catch {}
    });

    setTimeout(() => {
      const container = printWindow.document.getElementById("print-root");
      if (container) {
        const root = createRoot(container);
        root.render(
          <PrintReportTemplate
            reportType="result-report"
            schoolInfo={{
              name: "FAITH IMMACULATE ACADEMY",
              address: "IGBOHO, OYO STATE",
              motto: "KNOWLEDGE AND GODLINESS",
              logoText: "FIA",
              logoUrl: "/logo.png"
            }}
            metadata={{
              class: student?.classLevel || "General",
              exam: exam?.title || "Exam Result",
              date: new Date(result.completedAt).toLocaleDateString(),
              session: "2025/2026 ACADEMIC SESSION"
            }}
            results={subjectBreakdown.map(b => ({
              id: b.questions.toString(),
              name: b.subject,
              class: student?.classLevel || "General",
              subject: b.correct.toString(),
              score: b.percentage
            }))}
            onPrint={() => printWindow.print()}
          />
        );
      }
    }, 600);
  };
  const totalQuestions = Object.keys(result.correctAnswers).length;
  const backLink = isAdminResult ? "/admin/results" : "/student-portal";
  const backText = isAdminResult ? "Back to Results" : "Back to Exams";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 font-sans">
      <div className="container mx-auto px-4 py-10 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Back Link Nav */}
        <div className="mb-6 flex justify-start">
          <Link href={backLink}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 h-9 px-3 flex items-center gap-1.5"
              data-testid={isAdminResult ? "button-back-to-results" : "button-back-to-exams"}
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              {backText}
            </Button>
          </Link>
        </div>

        {/* Breathtaking Glowing Header */}
        <div className="text-center mb-10 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-150/70 dark:border-slate-805 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none">
            <Sparkles className="h-32 w-32 text-indigo-650" />
          </div>

          <div className="mb-4 flex justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105 duration-300 ${
                result.passed 
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 shadow-emerald-500/5" 
                  : "bg-amber-50 text-amber-600 dark:bg-amber-955/20 dark:text-amber-400 shadow-amber-500/5"
              }`}
            >
              {result.passed ? (
                <Award className="h-10 w-10 animate-bounce" />
              ) : (
                <Target className="h-10 w-10" />
              )}
            </div>
          </div>
          
          <h1 className="text-2.5xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent leading-none">
            {result.passed ? "Congratulations!" : "Examination Finished"}
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 mt-2.5 text-sm sm:text-base font-semibold max-w-md mx-auto leading-relaxed">
            {result.passed
              ? "Outstanding performance. You have successfully met and exceeded the academic passing score required for this test."
              : "Session completed successfully. Keep practicing and reviewing subject criteria to boost your scores."}
          </p>
        </div>

        {/* Score Cards Deck */}
        <div className="mb-8 grid gap-6 sm:grid-cols-3">
          
          {/* Card 1: Score percentage */}
          <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aggregate Score</span>
              <Badge 
                className={`font-black tracking-wider text-[9px] uppercase rounded-lg border px-2 py-0.5 ${
                  result.passed 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 hover:bg-emerald-50" 
                    : "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-955/20 dark:text-rose-450 hover:bg-rose-50"
                }`}
              >
                {result.passed ? "PASSED" : "FAILED"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-3.5xl font-black text-slate-800 dark:text-white leading-none" data-testid="text-score">
                {result.percentage}%
              </div>
              <p className="text-[11px] font-semibold text-slate-455 mt-1.5">
                Obtained {result.score} / {result.totalPoints} total points
              </p>
              <Progress value={result.percentage} className="mt-3.5 h-1.5 rounded-full" />
            </CardContent>
          </Card>

          {/* Card 2: Correct count */}
          <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Accuracy Ratio</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3.5xl font-black text-emerald-650 dark:text-emerald-455 leading-none" data-testid="text-correct">
                {correctCount}
              </div>
              <p className="text-[11px] font-semibold text-slate-455 mt-1.5">
                Answered correctly out of {totalQuestions} questions
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Passing requirement */}
          <Card className="border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-350 dark:bg-slate-700" />
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Required Grade</span>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3.5xl font-black text-slate-800 dark:text-white leading-none" data-testid="text-passing">
                {exam?.passingScore || 50}%
              </div>
              <p className="text-[11px] font-semibold text-slate-455 mt-1.5">
                Standard criteria threshold to pass
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Student and Exam Details Docket */}
        <Card className="mb-8 border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl overflow-hidden">
          <div className="bg-slate-50/50 dark:bg-slate-950/40 px-6 py-4.5 border-b border-slate-100 dark:border-slate-805/85">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-205 flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
              Examination Metadata docket
            </h3>
          </div>
          <CardContent className="p-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Name</span>
              <span className="block text-sm font-black text-slate-800 dark:text-slate-200 mt-1" data-testid="text-student-name">{result.studentName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID (Passcode)</span>
              <span className="block text-sm font-mono text-slate-850 dark:text-slate-300 mt-1" data-testid="text-student-id">{result.studentId}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Code</span>
              <span className="block text-sm font-black text-slate-850 dark:text-slate-350 mt-1">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-extrabold uppercase py-0 px-2 text-[10px]">
                  {exam?.subject || 'CBT'}
                </Badge>
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Level</span>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{student?.classLevel || '-'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{student?.department || 'General'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed At</span>
              <div className="inline-flex flex-col text-xs font-semibold text-slate-750 dark:text-slate-350 mt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {new Date(result.completedAt).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                  {new Date(result.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card className="mb-8 border border-slate-150/70 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-md rounded-2xl overflow-hidden">
          <div className="bg-slate-50/50 dark:bg-slate-950/40 px-6 py-4.5 border-b border-slate-100 dark:border-slate-805/85">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-205 flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
              Examination Session review log
            </h3>
          </div>
          <CardContent className="p-6">
            {questions && questions.length > 0 ? (
              <Accordion type="single" collapsible className="w-full divide-y divide-slate-100 dark:divide-slate-805/45">
                {questions.map((question, idx) => {
                  const isCorrect = result.correctAnswers[question.id];
                  const studentAnswer = result.answers[question.id];

                  return (
                    <AccordionItem key={question.id} value={question.id} className="border-none py-1 group">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left">
                          <div className="flex-shrink-0">
                            {isCorrect ? (
                              <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle className="h-4.5 w-4.5" />
                              </div>
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-955/30 dark:text-rose-450 flex items-center justify-center">
                                <XCircle className="h-4.5 w-4.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                              Question {idx + 1}
                            </span>
                            <span className="ml-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {question.points} point{question.points !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-1 pb-4 pl-10 border-t border-dashed border-slate-100 dark:border-slate-805/30 mt-1">
                        <div>
                          <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl bg-slate-50/40 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100/50">
                            {question.questionText}
                          </p>
                        </div>

                        {question.questionType !== "theory" && exam?.examType !== "Theory" && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-805/40">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Response:</span>
                              <span 
                                className={`block text-xs font-black mt-1 flex items-center gap-1.5 ${
                                  isCorrect 
                                    ? "text-emerald-600 dark:text-emerald-450" 
                                    : "text-rose-650 dark:text-rose-450"
                                }`}
                              >
                                {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                {studentAnswer || "No Response Registered"}
                              </span>
                            </div>

                            {!isCorrect && (
                              <div className="bg-emerald-50/10 dark:bg-emerald-950/5 p-3 rounded-xl border border-emerald-100/30 dark:border-emerald-900/30">
                                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Correct Resolution:</span>
                                <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                                  <CheckCircle className="h-4 w-4" />
                                  {question.correctAnswer}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {(question.questionType === "theory" || exam?.examType === "Theory") && (
                          <div className="text-xs italic text-slate-455 font-medium bg-slate-50/40 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100/60 max-w-lg">
                            This is an open theory question format, evaluated based on descriptive subject metrics.
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center py-8 text-center text-slate-400">
                <HelpCircle className="h-8 w-8 text-slate-200 dark:text-slate-800 mb-2" />
                <span>No statistical review questions loaded for this result sheet.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clean Center Action Bar */}
        <div className="flex justify-center mt-10">
          <Link href={backLink}>
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-lg shadow-indigo-500/10 hover:scale-[1.01] transition-all rounded-xl h-11 px-8 flex items-center gap-2 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {backText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
