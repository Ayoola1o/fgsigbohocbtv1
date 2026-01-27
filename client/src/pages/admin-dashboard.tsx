import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, HelpCircle, Users, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Exam, Question, Result } from "@shared/schema";

export default function AdminDashboard() {
  const { data: exams, isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<Result[]>({
    queryKey: ["/api/results"],
  });

  const isLoading = examsLoading || questionsLoading || resultsLoading;



  const stats = {
    totalExams: exams?.length || 0,
    activeExams: exams?.filter((e) => e.isActive).length || 0,
    totalQuestions: questions?.length || 0,
    totalStudents: new Set(results?.map((r) => r.studentId)).size || 0,
  };

  const passRate = results && results.length > 0
    ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
    : 0;

  const recentResults = results
    ?.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  const subjectStats = exams?.reduce((acc, exam) => {
    const subjectResults = results?.filter((r) => r.examId === exam.id) || [];
    const avgScore = subjectResults.length > 0
      ? Math.round(
        subjectResults.reduce((sum, r) => sum + r.percentage, 0) /
        subjectResults.length
      )
      : 0;

    acc.push({
      subject: exam.subject,
      avgScore,
      students: subjectResults.length,
    });
    return acc;
  }, [] as { subject: string; avgScore: number; students: number }[]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of Faith Immaculate Academy CBT performance and statistics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-exams">
                  {stats.totalExams}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.activeExams} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Questions Bank</CardTitle>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-questions">
                  {stats.totalQuestions}
                </div>
                <p className="text-sm text-muted-foreground">
                  Available questions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-students">
                  {stats.totalStudents}
                </div>
                <p className="text-sm text-muted-foreground">
                  Unique students
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-pass-rate">
                  {passRate}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Overall success rate
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance by Subject */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : subjectStats && subjectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="subject" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgScore" fill="hsl(var(--primary))" name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentResults && recentResults.length > 0 ? (
              <div className="space-y-4">
                {recentResults.map((result) => (
                  <Link key={result.id} href={`/admin/results/${result.id}`}>
                    <div className="flex items-center justify-between rounded-md border p-4 hover-elevate">
                      <div className="flex-1">
                        <p className="font-medium">{result.studentName}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.studentId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${result.passed ? "text-green-600" : "text-red-600"
                            }`}
                        >
                          {result.percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(result.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No results yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
