import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useRoute } from "wouter";
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
import { CheckCircle, XCircle, Award, TrendingUp } from "lucide-react";
import type { Result, Question, Exam } from "@shared/schema";
import { getResult, getExam, getQuestionsByIds } from "@/lib/firebase-api";

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
  const totalQuestions = Object.keys(result.correctAnswers).length;
  const backLink = isAdminResult ? "/admin/results" : "/student-portal";
  const backText = isAdminResult ? "Back to Results" : "Back to Exams";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full ${result.passed ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  }`}
              >
                {result.passed ? (
                  <Award className="h-12 w-12" />
                ) : (
                  <TrendingUp className="h-12 w-12" />
                )}
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-bold">
              {result.passed ? "Congratulations!" : "Exam Completed"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {result.passed
                ? "You have successfully passed the exam."
                : "Keep practicing and try again."}
            </p>
          </div>

          {/* Score Cards */}
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Score</CardTitle>
                <Badge variant={result.passed ? "default" : "destructive"}>
                  {result.passed ? "PASSED" : "FAILED"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-score">
                  {result.percentage}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.score} out of {result.totalPoints} points
                </p>
                <Progress value={result.percentage} className="mt-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" data-testid="text-correct">
                  {correctCount}
                </div>
                <p className="text-sm text-muted-foreground">
                  out of {totalQuestions} questions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passing Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-passing">
                  {exam?.passingScore}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Required to pass
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Student Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-medium" data-testid="text-student-name">{result.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium" data-testid="text-student-id">{result.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exam Title</p>
                <p className="font-medium">{exam?.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed At</p>
                <p className="font-medium">
                  {new Date(result.completedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
            </CardHeader>
            <CardContent>
              {questions && (
                <Accordion type="single" collapsible className="w-full">
                  {questions.map((question, idx) => {
                    const isCorrect = result.correctAnswers[question.id];
                    const studentAnswer = result.answers[question.id];

                    return (
                      <AccordionItem key={question.id} value={question.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                            )}
                            <div className="flex-1">
                              <span className="font-medium">Question {idx + 1}</span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({question.points} point{question.points !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <div>
                            <p className="mb-4 text-base font-medium leading-relaxed">
                              {question.questionText}
                            </p>
                          </div>

                          {question.questionType !== "theory" && exam?.examType !== "Theory" && (
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                  Your Answer:
                                </p>
                                <p className={`text-base ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                                  {studentAnswer || "Not answered"}
                                </p>
                              </div>

                              {!isCorrect && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">
                                    Correct Answer:
                                  </p>
                                  <p className="text-base text-green-600">
                                    {question.correctAnswer}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {(question.questionType === "theory" || exam?.examType === "Theory") && (
                            <div className="mt-2 text-sm italic text-muted-foreground">
                              This is a theory question/part. Content displayed for reference.
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center">
            <Link href={backLink}>
              <Button size="lg" data-testid={isAdminResult ? "button-back-to-results" : "button-back-to-exams"}>
                {backText}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
