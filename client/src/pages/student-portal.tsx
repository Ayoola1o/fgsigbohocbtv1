import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle, LogOut } from "lucide-react";
import type { Exam, Student } from "@shared/schema";
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
    }
  }, [setLocation]);

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams", { classLevel: student?.classLevel }],
    queryFn: async () => {
      // Fetch exams directly from Firebase
      return getExams(student?.classLevel);
    },
    enabled: !!student,
  });

  const handleLogout = () => {
    localStorage.removeItem("student_user");
    setLocation("/student-login");
  };

  if (!student) return null; // Or a loading spinner while redirecting

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
                .filter((exam) => exam.isActive)
                .map((exam) => (
                  <Card
                    key={exam.id}
                    className="hover-elevate"
                    data-testid={`card-exam-${exam.id}`}
                  >
                    <CardHeader>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{exam.title}</CardTitle>
                        <Badge variant="secondary" data-testid={`badge-subject-${exam.id}`}>
                          {exam.subject}
                        </Badge>
                      </div>
                      {exam.description && (
                        <CardDescription>{exam.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{exam.duration} mins</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{exam.questionIds.length} questions</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Passing: {exam.passingScore}%
                        </span>
                      </div>
                      <Link href={`/exam/${exam.id}/start?studentName=${encodeURIComponent(student.name)}&studentId=${encodeURIComponent(student.studentId)}`}>
                        <Button className="w-full" data-testid={`button-start-exam-${exam.id}`}>
                          Start Exam
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
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
