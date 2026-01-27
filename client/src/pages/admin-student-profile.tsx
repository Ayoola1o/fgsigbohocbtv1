import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronLeft, GraduationCap, FileText, TrendingUp, Calendar, Printer, Eye } from "lucide-react";
import type { Result, Exam, Student } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createRoot } from "react-dom/client";
import { ResultTemplate } from "@/components/ResultTemplate";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";

export default function AdminStudentProfile() {
    const { studentId } = useParams<{ studentId: string }>();
    const { toast } = useToast();

    const { data: students } = useQuery<Student[]>({
        queryKey: ["/api/students"],
    });

    const { data: results, isLoading: resultsLoading } = useQuery<Result[]>({
        queryKey: ["/api/results"],
    });

    const { data: exams } = useQuery<Exam[]>({
        queryKey: ["/api/exams"],
    });

    const { data: questions } = useQuery<any[]>({ queryKey: ["/api/questions"] });

    const student = students?.find((s) => s.studentId === studentId);
    const studentResults = results?.filter((r) => r.studentId === studentId) || [];

    const averageScore = studentResults.length > 0
        ? (studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length).toFixed(1)
        : 0;

    const getExamTitle = (examId: string) => {
        return exams?.find((e) => e.id === examId)?.title || "Unknown Exam";
    };

    const getGradeRemark = (percentage: number) => {
        if (percentage >= 75) return { label: "Excellent", color: "text-green-600 bg-green-50" };
        if (percentage >= 60) return { label: "Very Good", color: "text-blue-600 bg-blue-50" };
        if (percentage >= 50) return { label: "Credit", color: "text-yellow-600 bg-yellow-50" };
        if (percentage >= 40) return { label: "Pass", color: "text-orange-600 bg-orange-50" };
        return { label: "Fail", color: "text-red-600 bg-red-50" };
    };

    const handlePrintSingle = (result: Result) => {
        const exam = exams?.find(e => e.id === result.examId);

        // Calculate breakdown
        const breakdown: any[] = [];
        if (questions && exam) {
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            const subjects = Array.from(new Set(examQuestions.map(q => q.subject)));

            subjects.forEach(subject => {
                const subjectQuestions = examQuestions.filter(q => q.subject === subject);
                let correctCount = 0;

                subjectQuestions.forEach(q => {
                    if (result.correctAnswers && result.correctAnswers[q.id]) {
                        correctCount++;
                    }
                });

                breakdown.push({
                    subject,
                    questions: subjectQuestions.length,
                    correct: correctCount,
                    percentage: subjectQuestions.length > 0 ? (correctCount / subjectQuestions.length) * 100 : 0
                });
            });
        }

        const printData = {
            schoolName: "Faith Immaculate Academy",
            schoolLogoUrl: "/logo.png",
            examTitle: exam?.title || "Exam Result",
            candidate: {
                name: result.studentName,
                studentId: result.studentId,
                gradeLevel: student?.classLevel || "-",
                date: format(new Date(result.completedAt), "PPP"),
            },
            overallResult: {
                score: result.score,
                total: result.totalPoints,
                percentage: result.percentage,
                timeTakenMinutes: 60,
                status: result.passed ? 'PASS' : 'FAIL',
            },
            subjectBreakdown: breakdown
        };

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Result</title>');
            const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
            styles.forEach(style => {
                printWindow.document.head.appendChild(style.cloneNode(true));
            });
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
            printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
            printWindow.document.close();

            printWindow.onload = () => {
                setTimeout(() => {
                    const container = printWindow.document.getElementById('print-root');
                    if (container) {
                        const root = createRoot(container);
                        root.render(<PrintReportTemplate
                            reportType="result-report"
                            schoolInfo={{
                                name: "FAITH IMMACULATE ACADEMY",
                                address: "IGBOHO, OYO STATE",
                                motto: "KNOWLEDGE AND GODLINESS",
                                logoText: "FIA"
                            }}
                            metadata={{
                                class: printData.candidate.gradeLevel,
                                exam: printData.examTitle,
                                date: printData.candidate.date,
                                session: "2025/2026 ACADEMIC SESSION"
                            }}
                            results={printData.subjectBreakdown.map((b: any) => ({
                                id: b.questions.toString(),
                                name: b.subject,
                                class: printData.candidate.gradeLevel,
                                subject: b.correct.toString(),
                                score: b.percentage
                            }))}
                            onPrint={() => printWindow.print()}
                        />);
                    }
                }, 500);
            };
        }
    };

    if (resultsLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h2 className="text-2xl font-bold">Student Not Found</h2>
                <p className="text-muted-foreground mt-2">The student with ID {studentId} could not be located.</p>
                <Link href="/admin/results">
                    <Button variant="outline" className="mt-6">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Results
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/results">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{student.studentId}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="font-medium text-sm">{student.classLevel}</span>
                        </p>
                    </div>
                </div>
                <Button onClick={() => window.print()} variant="outline" className="hidden md:flex gap-2">
                    <Printer className="h-4 w-4" /> Print Profile
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> PERFORMANCE INDEX
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black">{averageScore}%</div>
                        <p className="text-xs text-blue-100 mt-1 opacity-80">Cumulative Average Score</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-md border-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" /> TOTAL EXAMS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-800">{studentResults.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Exams Completed to Date</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-md border-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" /> ACADEMIC STATUS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-slate-800">
                            {Number(averageScore) >= 50 ? "Satisfactory" : "Needs Improvement"}
                        </div>
                        <Badge className={`mt-2 ${Number(averageScore) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-none`}>
                            {student.classLevel} Student
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <Card className="shadow-xl border-none overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" /> Examination History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-bold">Exam Date</TableHead>
                                <TableHead className="font-bold">Subject / Title</TableHead>
                                <TableHead className="font-bold">Score</TableHead>
                                <TableHead className="font-bold">Percentage</TableHead>
                                <TableHead className="font-bold">Remark</TableHead>
                                <TableHead className="text-right font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentResults.length > 0 ? (
                                studentResults
                                    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                                    .map((result) => {
                                        const remark = getGradeRemark(result.percentage);
                                        return (
                                            <TableRow key={result.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell>
                                                    <p className="font-medium text-sm">{format(new Date(result.completedAt), "dd MMM, yyyy")}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(result.completedAt), "hh:mm a")}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold text-slate-700">{getExamTitle(result.examId)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-bold">{result.score}</span>
                                                    <span className="text-muted-foreground text-xs"> / {result.totalPoints}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-black ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                                                            {result.percentage}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`${remark.color} border-none shadow-none font-bold`}>
                                                        {remark.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link href={`/admin/results/${result.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            onClick={() => handlePrintSingle(result)}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No examination records found for this student.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
