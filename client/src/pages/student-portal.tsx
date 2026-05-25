import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle, LogOut, Lock } from "lucide-react";
import type { Exam, Student, Result } from "@shared/schema";
import { getExams } from "@/lib/firebase-api";

export default function StudentPortal() {
  const [, setLocation] = useLocation();
  const [student, setStudent] = useState<Student | null>(null);

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

  const freshestStudent = students.find(s => s.studentId === student?.studentId) || student;

  const { data: results = [] } = useQuery<Result[]>({
    queryKey: ["/api/results"],
    enabled: !!student,
  });

  const getStudentResult = (examId: string) => {
    return results.find(r => r.examId === examId && r.studentId === student?.studentId);
  };

  const isExamBlocked = (examId: string) => {
    return freshestStudent?.blockedExams?.includes(examId) || false;
  };

  const handleLogout = () => {
    localStorage.removeItem("student_user");
    setLocation("/student-login");
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {student.name}</h1>
            <p className="text-muted-foreground">Student ID: {student.studentId}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-semibold">Available Exams</h2>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : exams && exams.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {exams
                .filter((exam) => {
                  if (!exam.isActive) return false;
                  // If exam is general (no department or "General"), allow it for all
                  if (!exam.department || exam.department === "General") return true;
                  // If exam is specific to a department, student must match it
                  return exam.department === student.department;
                })
                .map((exam) => {
                  const examResult = getStudentResult(exam.id);
                  const isBlocked = isExamBlocked(exam.id);
                  const hasTaken = !!examResult;
                  return (
                    <Card
                      key={exam.id}
                      className={`hover-elevate overflow-hidden border ${
                        isBlocked
                          ? "border-rose-100 bg-rose-50/10 shadow-sm"
                          : hasTaken
                          ? "border-emerald-100 bg-emerald-50/10 shadow-sm"
                          : "border-slate-100 shadow-md"
                      }`}
                      data-testid={`card-exam-${exam.id}`}
                    >
                      <CardHeader>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <CardTitle className="text-xl font-bold text-slate-800">{exam.title}</CardTitle>
                          <Badge variant="secondary" className="font-bold uppercase tracking-wider" data-testid={`badge-subject-${exam.id}`}>
                            {exam.subject}
                          </Badge>
                        </div>
                        {exam.description && (
                          <CardDescription className="text-xs">{exam.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span>{exam.duration} mins</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-slate-400" />
                            <span>{exam.questionIds?.length || 0} questions</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <CheckCircle className="h-4 w-4 text-slate-400" />
                          <span className="text-muted-foreground">
                            Passing Score: {exam.passingScore}%
                          </span>
                        </div>

                        {/* Status Badges & Buttons */}
                        {isBlocked ? (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                              <Lock className="h-4 w-4 shrink-0" />
                              <span>Access Blocked by Administrator</span>
                            </div>
                            <Button disabled className="w-full bg-rose-50 text-rose-400 font-bold border-none cursor-not-allowed">
                              Blocked
                            </Button>
                          </div>
                        ) : hasTaken ? (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                <span>Completed Successfully</span>
                              </div>
                              <span className="text-sm font-extrabold">{examResult.percentage}%</span>
                            </div>
                            <Link href={`/exam/result/${examResult.id}`}>
                              <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 font-bold">
                                View Result Sheet
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/exam/${exam.id}/start?studentName=${encodeURIComponent(freshestStudent.name)}&studentId=${encodeURIComponent(freshestStudent.studentId)}`}>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md hover:scale-[1.01] transition-transform" data-testid={`button-start-exam-${exam.id}`}>
                              Start CBT Exam
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Exams Available</h3>
                <p className="text-sm text-muted-foreground">
                  There are currently no active exams. Please check back later.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
