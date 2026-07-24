import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle, LogOut, Lock, Sparkles, Award, ShieldAlert, User, ArrowRight } from "lucide-react";
import type { Exam, Student, Result } from "@shared/schema";
import { getExams, getSubjectDepartment } from "@/lib/firebase-api";

export default function StudentPortal() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<Student | null>(null);

  // Custom settings states
  const [showResultButton, setShowResultButton] = useState<boolean>(true);
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setShowResultButton(localStorage.getItem("fia_cbt_settings_show_result_button") !== "false");
      setHideCompleted(localStorage.getItem("fia_cbt_settings_hide_completed") === "true");
    };

    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("student_user");
    if (!userStr) {
      setLocation("/student-login");
      return;
    }
    try {
      setStudent(JSON.parse(userStr));
    } catch (e) {
      console.error("Invalid student session", e);
      localStorage.removeItem("student_user");
      setLocation("/student-login");
      return;
    }
  }, [setLocation]);

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams", { classLevel: student?.classLevel }],
    queryFn: async () => {
      return getExams(student?.classLevel);
    },
    enabled: !!student,
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: !!student,
  });

  const freshestStudent = useMemo(() => {
    if (!student) return null;
    const match = students.find(s =>
      s.studentId?.trim().toLowerCase() === student.studentId?.trim().toLowerCase() ||
      s.id?.trim().toLowerCase() === student.id?.trim().toLowerCase()
    );
    return match || student;
  }, [student, students]);

  const { data: results = [] } = useQuery<Result[]>({
    queryKey: ["/api/results"],
    enabled: !!student,
  });

  const getStudentResult = (examId: string) => {
    return results.find(r => 
      r.examId === examId && 
      (r.studentId?.trim().toLowerCase() === currentStudent?.studentId?.trim().toLowerCase() ||
       r.studentId?.trim().toLowerCase() === currentStudent?.id?.trim().toLowerCase())
    );
  };

  const isExamCompleted = (examId: string) => {
    const hasResult = !!getStudentResult(examId);
    if (hasResult) return true;
    
    // Check local storage intent lock
    const studentIdKey = currentStudent?.studentId?.trim().toLowerCase();
    const idKey = currentStudent?.id?.trim().toLowerCase();
    if (studentIdKey && localStorage.getItem(`fia_submitted_exam_${studentIdKey}_${examId}`) === "true") {
      return true;
    }
    if (idKey && localStorage.getItem(`fia_submitted_exam_${idKey}_${examId}`) === "true") {
      return true;
    }
    return false;
  };

  const isExamBlocked = (examId: string) => {
    return currentStudent?.blockedExams?.includes(examId) || false;
  };

  const handleLogout = () => {
    localStorage.removeItem("student_user");
    setLocation("/student-login");
  };

  if (!student) return null;
  const currentStudent = freshestStudent || student;

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat pb-16 font-sans relative"
      style={{ backgroundImage: 'url("/login-bg.jpg")' }}
    >
      {/* Overlay layer for better contrast and readability */}
      <div className="absolute inset-0 bg-slate-900/15 dark:bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />

      {/* Top Banner and Navigation */}
      <div className="relative z-10 bg-white/95 dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-805/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500/10 text-white dark:text-indigo-400 flex items-center justify-center font-black shadow-lg shadow-indigo-650/15 dark:shadow-none animate-pulse">
              FIA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Portal active</span>
              </div>
              <h2 className="text-base font-black text-slate-850 dark:text-white leading-tight mt-0.5">
                Faith Immaculate Academy
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">{currentStudent.name}</span>
              <span className="text-[10px] text-slate-455 font-mono tracking-wider">{currentStudent.studentId}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-355 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-455 font-bold h-9 px-4.5 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-10 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-550">
        <Card className="border border-slate-200/50 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-2xl rounded-[32px] p-6 sm:p-8 md:p-10">
        {/* Welcome Dashboard Profile Panel */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-indigo-900 dark:from-indigo-955 dark:via-indigo-965 dark:to-indigo-955 text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-indigo-950/10 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none">
            <Sparkles className="h-40 w-40 text-white" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/10 dark:bg-indigo-950/60 text-indigo-200 border-none font-bold py-0.5 px-2.5 rounded-full text-[10px] tracking-wider uppercase">
                  Candidate Profile
                </Badge>
                <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-semibold">
                  <Sparkles className="h-3 w-3 text-yellow-400" />
                  <span>CBT Hub</span>
                </div>
              </div>
              <h1 className="text-2.5xl sm:text-3.5xl font-black tracking-tight mt-2.5 leading-tight">
                Welcome back, {currentStudent.name}
              </h1>
              <p className="text-indigo-200 text-sm mt-1.5 font-medium">
                Access your scheduled subject examinations, view grading result sheets, and track performance scores.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 bg-white/5 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center px-4 py-1 border-r border-white/10">
                <span className="block text-[10px] text-indigo-200 uppercase font-black tracking-wider">Class Level</span>
                <span className="block text-lg font-black text-white mt-0.5">{currentStudent.classLevel || '-'}</span>
              </div>
              <div className="text-center px-4 py-1">
                <span className="block text-[10px] text-indigo-200 uppercase font-black tracking-wider">Department</span>
                <span className="block text-lg font-black text-emerald-400 mt-0.5">{currentStudent.department || 'General'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exams Deck */}
        <div>
          <div className="flex items-center gap-2.5 mb-6.5">
            <div className="h-7.5 w-7.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-200">Available Examination Sessions</h2>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-slate-100 dark:border-slate-805 rounded-2xl bg-white dark:bg-slate-900 p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-md" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </Card>
              ))}
            </div>
          ) : exams && exams.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {exams
                .filter((exam) => {
                  if (!exam.isActive) return false;
                  // If hideCompleted setting is active, filter out completed exams
                  if (hideCompleted && isExamCompleted(exam.id)) return false;

                  const candidateDept = currentStudent?.department?.trim();

                  // 1. If exam has explicit department set, check department match
                  if (exam.department && exam.department !== "General" && exam.department !== "Others") {
                    if (candidateDept && candidateDept !== "General" && candidateDept !== "Others") {
                      if (exam.department.toLowerCase() !== candidateDept.toLowerCase()) {
                        return false;
                      }
                    }
                  }

                  // 2. If single subject exam (no comma in subject name), check subject stream department
                  if (exam.subject && !exam.subject.includes(",")) {
                    const subjDept = getSubjectDepartment(exam.subject, exam.department || undefined);
                    if (subjDept !== "General" && candidateDept && candidateDept !== "General" && candidateDept !== "Others") {
                      if (subjDept.toLowerCase() !== candidateDept.toLowerCase()) {
                        return false;
                      }
                    }
                  }

                  // 3. For multi-subject composite exams, if candidate has a specific department, ensure at least one subject matches candidate stream or is General
                  if (exam.subject && exam.subject.includes(",")) {
                    if (candidateDept && candidateDept !== "General" && candidateDept !== "Others") {
                      const subjects = exam.subject.split(",").map(s => s.trim()).filter(Boolean);
                      const hasMatchingSubject = subjects.some(s => {
                        const sDept = getSubjectDepartment(s);
                        return sDept === "General" || sDept.toLowerCase() === candidateDept.toLowerCase();
                      });
                      if (!hasMatchingSubject) return false;
                    }
                  }

                  return true;
                })
                .map((exam) => {
                  const examResult = getStudentResult(exam.id);
                  const isBlocked = isExamBlocked(exam.id);
                  const hasTaken = isExamCompleted(exam.id);
                  return (
                    <Card
                      key={exam.id}
                      className={`relative overflow-hidden border group transition-all duration-300 rounded-2.5xl flex flex-col justify-between hover:shadow-xl hover:scale-[1.01] ${
                        isBlocked
                          ? "border-rose-100 bg-rose-50/75 dark:border-rose-955/20 dark:bg-rose-955/5 shadow-sm"
                          : hasTaken
                          ? "border-emerald-100 bg-emerald-50/75 dark:border-emerald-955/20 dark:bg-emerald-955/5 shadow-sm"
                          : exam.term === "First Term"
                          ? "border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10 shadow-md"
                          : exam.term === "Second Term"
                          ? "border-sky-100 bg-sky-50/40 dark:border-sky-900/30 dark:bg-sky-950/10 shadow-md"
                          : exam.term === "Third Term"
                          ? "border-amber-100 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10 shadow-md"
                          : "border-rose-100 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/10 shadow-md"
                      }`}
                      data-testid={`card-exam-${exam.id}`}
                    >
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        isBlocked
                          ? "bg-rose-500"
                          : hasTaken
                          ? "bg-emerald-500"
                          : exam.term === "First Term"
                          ? "bg-emerald-500"
                          : exam.term === "Second Term"
                          ? "bg-sky-500"
                          : exam.term === "Third Term"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`} />
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <Badge 
                            variant="secondary" 
                            className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold uppercase tracking-wider text-[10px] py-0.5 px-2 rounded-lg border border-indigo-100/30 dark:border-indigo-900/30"
                            data-testid={`badge-subject-${exam.id}`}
                          >
                            {exam.subject}
                          </Badge>

                          {hasTaken && (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30 font-bold py-0.5 px-2 text-[9px] uppercase rounded-lg">
                              Completed
                            </Badge>
                          )}

                          {isBlocked && (
                            <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-450 border border-rose-100/30 dark:border-rose-900/30 font-bold py-0.5 px-2 text-[9px] uppercase rounded-lg">
                              Blocked
                            </Badge>
                          )}
                        </div>

                        <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-150 leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                          {exam.title}
                        </CardTitle>
                        
                        {exam.description && (
                          <CardDescription className="text-slate-455 dark:text-slate-400 text-xs font-medium leading-relaxed mt-1">
                            {exam.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        {!(exam.subject.includes(",") || exam.subject.includes(";")) ? (
                          <>
                            <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-805/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                                <span>{exam.duration} Minutes</span>
                              </div>
                              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>{exam.numberOfQuestionsToDisplay || exam.questionIds?.length || 0} Questions</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs font-semibold px-1">
                              <span className="text-slate-455">Grading Passing Score</span>
                              <span className="font-extrabold text-slate-700 dark:text-slate-300">{exam.passingScore}%</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2.5 bg-slate-50/50 dark:bg-slate-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-805/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <div className="flex items-start gap-2">
                              <BookOpen className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider text-slate-405 dark:text-slate-500 font-bold">Subjects</span>
                                <span className="text-slate-750 dark:text-slate-200 font-extrabold leading-tight">{exam.subject}</span>
                              </div>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-850" />
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div>
                                <span className="block text-[9px] uppercase tracking-wider text-slate-405 dark:text-slate-500 font-bold">Total Questions to Answer</span>
                                <span className="text-slate-750 dark:text-slate-200 font-extrabold">{exam.numberOfQuestionsToDisplay || exam.questionIds?.length || 0} Questions</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status Action Buttons */}
                        {isBlocked ? (
                          <div className="space-y-2 pt-2 border-t border-rose-100/40 dark:border-rose-900/20">
                            <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-455 font-bold text-xs">
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span>Requires Administrator Permission</span>
                            </div>
                            <Button disabled className="w-full bg-rose-100 text-rose-400 dark:bg-rose-955/20 dark:text-rose-600 font-bold border-none cursor-not-allowed rounded-xl h-10">
                              Locked / Blocked
                            </Button>
                          </div>
                        ) : hasTaken ? (
                          <div className="space-y-2 pt-2 border-t border-emerald-100/40 dark:border-emerald-900/20">
                            <div className="flex items-center justify-between text-xs font-extrabold text-emerald-600 dark:text-emerald-455">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                {showResultButton ? "Completed Score" : "Submission Status"}
                              </span>
                              {showResultButton && examResult ? (
                                <span className="text-base font-black">{examResult.percentage}%</span>
                              ) : (
                                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400">Submitted</span>
                              )}
                            </div>
                            {showResultButton && examResult ? (
                              <Link href={`/exam/result/${examResult.id}`}>
                                <Button variant="outline" className="w-full border-emerald-150 bg-emerald-50/50 hover:bg-emerald-100/40 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 font-bold rounded-xl h-10 transition-colors">
                                  View Performance Sheet
                                </Button>
                              </Link>
                            ) : !showResultButton ? (
                              <Button disabled className="w-full bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold rounded-xl h-10 border border-emerald-100/30 dark:border-emerald-900/30 cursor-not-allowed">
                                Results Closed
                              </Button>
                            ) : (
                              <Button disabled className="w-full bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-650 font-bold rounded-xl h-10 cursor-not-allowed">
                                Syncing Scorecard...
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-805/40">
                            <Link href={`/exam/${exam.id}/start?studentName=${encodeURIComponent(currentStudent.name)}&studentId=${encodeURIComponent(currentStudent.studentId)}`}>
                              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-lg shadow-indigo-500/10 hover:scale-[1.01] transition-all rounded-xl h-10 flex items-center justify-center gap-1.5 group-hover:bg-indigo-650" data-testid={`button-start-exam-${exam.id}`}>
                                Start CBT Exam <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-900 rounded-2.5xl shadow-xl">
              <CardContent className="flex flex-col items-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center mb-4 text-indigo-500">
                  <ShieldAlert className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h3 className="mb-2 text-xl font-black text-slate-800 dark:text-slate-200">No Examinations Found</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-sm font-medium leading-relaxed">
                  There are currently no active exams configured for your class level ({currentStudent.classLevel || 'General'}). Please verify with your examiner or check back soon.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        </Card>
      </div>
    </div>
  );
}
