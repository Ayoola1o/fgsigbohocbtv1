import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
    ChevronLeft,
    GraduationCap,
    FileText,
    TrendingUp,
    Calendar,
    Printer,
    Eye,
    Lock,
    Unlock,
    RefreshCw,
    ShieldAlert,
    AlertCircle,
    CheckCircle2,
    Activity,
    Info
} from "lucide-react";
import type { Result, Exam, Student } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createRoot } from "react-dom/client";
import { ResultTemplate } from "@/components/ResultTemplate";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
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

export default function AdminStudentProfile() {
    const { studentId } = useParams<{ studentId: string }>();
    const { toast } = useToast();
    const [resettingResult, setResettingResult] = useState<Result | null>(null);

    // Queries
    const { data: students = [] } = useQuery<Student[]>({
        queryKey: ["/api/students"],
    });

    const { data: results = [], isLoading: resultsLoading } = useQuery<Result[]>({
        queryKey: ["/api/results"],
    });

    const { data: exams = [] } = useQuery<Exam[]>({
        queryKey: ["/api/exams"],
    });

    const { data: questions = [] } = useQuery<any[]>({
        queryKey: ["/api/questions"]
    });

    const student = students.find((s) => s.studentId === studentId);
    const studentResults = results.filter((r) => r.studentId === studentId);

    // Mutations
    const resetResultMutation = useMutation({
        mutationFn: async (resultId: string) => {
            return apiRequest("POST", `/api/results/${resultId}/reset`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/results"] });
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            toast({
                title: "Exam Reset Successful",
                description: "The student's past score and sessions have been fully cleared. They can now retake this exam.",
            });
            setResettingResult(null);
        },
        onError: (err: any) => {
            toast({
                title: "Failed to Reset Exam",
                description: err.message || "An error occurred while resetting the exam.",
                variant: "destructive",
            });
            setResettingResult(null);
        }
    });

    const toggleBlockMutation = useMutation({
        mutationFn: async (payload: { examId: string; blockState: boolean }) => {
            if (!student) throw new Error("Student not found");
            return apiRequest("POST", `/api/students/${student.studentId}/toggle-block`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
            toast({
                title: "Permissions Updated",
                description: "Exam access permissions for this student have been modified.",
            });
        },
        onError: (err: any) => {
            toast({
                title: "Failed to Update Lock State",
                description: err.message || "An error occurred.",
                variant: "destructive",
            });
        }
    });

    // Helper selectors
    const averageScore = studentResults.length > 0
        ? Math.round(studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length)
        : 0;

    const getExamTitle = (examId: string) => {
        return exams.find((e) => e.id === examId)?.title || "Unknown Exam";
    };

    const getGradeRemark = (percentage: number) => {
        if (percentage >= 75) return { label: "Excellent", color: "text-emerald-700 bg-emerald-50 border-emerald-100" };
        if (percentage >= 60) return { label: "Very Good", color: "text-blue-700 bg-blue-50 border-blue-100" };
        if (percentage >= 50) return { label: "Credit", color: "text-amber-700 bg-amber-50 border-amber-100" };
        if (percentage >= 40) return { label: "Pass", color: "text-orange-700 bg-orange-50 border-orange-100" };
        return { label: "Fail", color: "text-rose-700 bg-rose-50 border-rose-100" };
    };

    const handlePrintSingle = (result: Result) => {
        const exam = exams.find(e => e.id === result.examId);

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

     // Filter exams matching class and department
     const eligibleExams = exams.filter(e => {
         // Class matching
         const matchesClass = e.classLevel === student?.classLevel;
         // Department matching (General department is eligible for all)
         const matchesDept = !e.department || e.department === "General" || e.department === student?.department;
         return matchesClass && matchesDept && e.isActive;
     });

     const isExamBlocked = (examId: string) => {
         if (!student) return false;
         return student.blockedExams?.includes(examId) || false;
     };

     if (resultsLoading) {
         return (
             <div className="space-y-6 animate-pulse">
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
                 <AlertCircle className="h-14 w-14 text-rose-500 mb-4 animate-bounce" />
                 <h2 className="text-2xl font-bold text-slate-800">Student Profile Not Found</h2>
                 <p className="text-muted-foreground mt-2 max-w-sm">The student with ID {studentId} could not be located in our registers.</p>
                 <Link href="/admin/students">
                     <Button variant="outline" className="mt-6 shadow-sm">
                         <ChevronLeft className="mr-2 h-4 w-4" /> Back to Students Directory
                     </Button>
                 </Link>
             </div>
         );
     }

     return (
         <div className="space-y-8 pb-16 animate-in fade-in duration-500">
             {/* Sleek Header Navigation */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                 <div className="flex items-center gap-4">
                     <Link href="/admin/students">
                         <Button variant="ghost" size="icon" className="rounded-full bg-slate-50 hover:bg-slate-100 shadow-sm border border-slate-200">
                             <ChevronLeft className="h-5 w-5 text-slate-700" />
                         </Button>
                     </Link>
                     <div>
                         <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
                             Student Dossier
                         </h1>
                         <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
                             <span className="font-semibold text-indigo-700">{student.name}</span>
                             <span className="text-muted-foreground/30">•</span>
                             <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[11px] tracking-wider uppercase">
                                 {student.studentId}
                             </span>
                         </p>
                     </div>
                 </div>

                 <div className="flex items-center gap-2">
                     <Button onClick={() => window.print()} variant="outline" className="shadow-sm border-slate-200 hover:bg-slate-50 gap-2">
                         <Printer className="h-4 w-4 text-slate-600" /> Print Summary
                     </Button>
                 </div>
             </div>

             {/* Biodata & Main Analytics Deck */}
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* Premium Biodata Tracking Card */}
                 <Card className="lg:col-span-1 border-none shadow-xl bg-white overflow-hidden h-fit">
                     <div className="h-32 bg-gradient-to-tr from-indigo-600 to-indigo-800 relative">
                         <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                             <div className="h-20 w-20 rounded-full border-4 border-white bg-indigo-50 border-indigo-200 flex items-center justify-center shadow-lg">
                                 <span className="text-3xl font-black text-indigo-700">
                                     {student.name.charAt(0).toUpperCase()}
                                 </span>
                             </div>
                         </div>
                     </div>
                     <CardContent className="pt-14 pb-6 px-6 space-y-4">
                         <div className="text-center">
                             <h2 className="font-extrabold text-xl text-slate-800">{student.name}</h2>
                             <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-500 text-[10px] tracking-wider font-bold uppercase">
                                 UID: {student.studentId}
                             </Badge>
                         </div>

                         <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 text-sm">
                             <div className="flex justify-between items-center py-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class Level</span>
                                 <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-none font-bold">
                                     {student.classLevel}
                                 </Badge>
                             </div>
                             <div className="flex justify-between items-center py-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</span>
                                 <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-none font-bold">
                                     {student.department || "General"}
                                 </Badge>
                             </div>
                             <div className="flex justify-between items-center py-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                                 <Badge className={student.sex === "M" ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-none font-bold" : "bg-pink-50 text-pink-700 border border-pink-200 shadow-none font-bold"}>
                                     {student.sex === "M" ? "Male" : "Female"}
                                 </Badge>
                             </div>
                             <div className="flex justify-between items-center py-1">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dossier Status</span>
                                 <Badge className={averageScore >= 50 ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold" : "bg-rose-50 text-rose-700 border border-rose-200 font-bold"}>
                                     {averageScore >= 50 ? "Active Standing" : "Needs Attention"}
                                 </Badge>
                             </div>
                         </div>
                     </CardContent>
                 </Card>

                 {/* Metric Cards Row */}
                 <div className="lg:col-span-3 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Performance Index Card */}
                         <Card className="bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-900 text-white border-none shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <TrendingUp className="h-24 w-24" />
                             </div>
                             <CardHeader className="pb-2">
                                 <CardTitle className="text-xs font-bold text-indigo-100 flex items-center gap-2 tracking-wider uppercase">
                                     <TrendingUp className="h-4 w-4" /> Performance Index
                                 </CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <div className="text-5xl font-black tracking-tight">{averageScore}%</div>
                                 <p className="text-xs text-indigo-100 mt-2 font-medium opacity-80">Cumulative Performance Average</p>
                             </CardContent>
                         </Card>

                         {/* Exams Completed Card */}
                         <Card className="bg-white shadow-xl border-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                 <FileText className="h-24 w-24 text-slate-800" />
                             </div>
                             <CardHeader className="pb-2">
                                 <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider uppercase">
                                     <FileText className="h-4 w-4 text-blue-500" /> Assessment Record
                                 </CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <div className="text-5xl font-black text-slate-800">{studentResults.length}</div>
                                 <p className="text-xs text-muted-foreground mt-2 font-semibold">Total Examinations Completed</p>
                             </CardContent>
                         </Card>

                         {/* Performance Standing Card */}
                         <Card className="bg-white shadow-xl border-none relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                 <GraduationCap className="h-24 w-24 text-slate-800" />
                             </div>
                             <CardHeader className="pb-2">
                                 <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-2 tracking-wider uppercase">
                                     <GraduationCap className="h-4 w-4 text-emerald-500" /> Standing
                                 </CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <div className="text-3xl font-extrabold text-slate-800 mt-2">
                                     {averageScore >= 75 ? "Excellent 🏆" : averageScore >= 50 ? "Satisfactory 👍" : "Incomplete ⚠️"}
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-3 font-semibold">Overall educational standing rating</p>
                             </CardContent>
                         </Card>
                     </div>

                     {/* Informative Help Box */}
                     <Card className="bg-slate-50/50 border border-slate-100 shadow-inner">
                         <CardContent className="p-4 flex items-center gap-3">
                             <Info className="h-5 w-5 text-indigo-500 shrink-0" />
                             <p className="text-xs text-slate-600 font-medium">
                                 Use the tables below to regulate exam attempts or reset blocked items. Blocking an exam disables entry inside the Student Portal. Resetting an attempt deletes previous records so the student can start fresh.
                             </p>
                         </CardContent>
                     </Card>
                 </div>
             </div>

             {/* Exam Block & Permissions Panel */}
             <Card className="shadow-xl border-none overflow-hidden bg-white">
                 <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div>
                         <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                             <Lock className="h-5 w-5 text-indigo-600" /> Exam Permissions & Access Locks
                         </CardTitle>
                         <CardDescription className="text-xs">
                             Regulate which examinations this candidate is authorized to open or start.
                         </CardDescription>
                     </div>
                 </CardHeader>
                 <CardContent className="p-0">
                     <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                             <thead>
                                 <tr className="bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                     <th className="py-3 px-6">Exam Subject & Title</th>
                                     <th className="py-3 px-4 text-center">Duration</th>
                                     <th className="py-3 px-4 text-center">Eligibility Scope</th>
                                     <th className="py-3 px-4 text-center">Lock Status</th>
                                     <th className="py-3 px-6 text-right">Access Controls</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {eligibleExams.length > 0 ? (
                                     eligibleExams.map((exam) => {
                                         const isBlocked = isExamBlocked(exam.id);
                                         const hasTaken = studentResults.some(r => r.examId === exam.id);
                                         return (
                                             <tr key={exam.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                                 <td className="py-3.5 px-6 font-bold text-slate-800 text-sm">
                                                     {exam.title}
                                                     <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5 tracking-wider">
                                                         {exam.subject}
                                                     </div>
                                                 </td>
                                                 <td className="py-3.5 px-4 text-center text-sm font-semibold text-slate-600">
                                                     {exam.duration} mins
                                                 </td>
                                                 <td className="py-3.5 px-4 text-center">
                                                     <Badge className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-wider border-none">
                                                         {exam.department || "General"}
                                                     </Badge>
                                                 </td>
                                                 <td className="py-3.5 px-4 text-center">
                                                     {isBlocked ? (
                                                         <Badge className="bg-rose-50 text-rose-700 border border-rose-100 shadow-none font-bold gap-1 justify-center py-0.5 text-[10px]">
                                                             <Lock className="h-3 w-3" /> Blocked
                                                         </Badge>
                                                     ) : hasTaken ? (
                                                         <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-none font-bold gap-1 justify-center py-0.5 text-[10px]">
                                                             <CheckCircle2 className="h-3 w-3" /> Already Taken
                                                         </Badge>
                                                     ) : (
                                                         <Badge className="bg-blue-50 text-blue-700 border border-blue-100 shadow-none font-bold gap-1 justify-center py-0.5 text-[10px]">
                                                             <Unlock className="h-3 w-3" /> Unlocked & Available
                                                         </Badge>
                                                     )}
                                                 </td>
                                                 <td className="py-3.5 px-6 text-right">
                                                     <Button
                                                         size="sm"
                                                         variant={isBlocked ? "outline" : "destructive"}
                                                         onClick={() => {
                                                             toggleBlockMutation.mutate({
                                                                 examId: exam.id,
                                                                 blockState: !isBlocked
                                                             });
                                                         }}
                                                         className="font-bold text-xs shadow-none border-rose-200/50 h-8"
                                                         disabled={toggleBlockMutation.isPending}
                                                     >
                                                         {isBlocked ? (
                                                             <span className="flex items-center gap-1.5 text-indigo-600"><Unlock className="h-3.5 w-3.5" /> Grant Access</span>
                                                         ) : (
                                                             <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Block Access</span>
                                                         )}
                                                     </Button>
                                                 </td>
                                             </tr>
                                         );
                                     })
                                 ) : (
                                     <tr>
                                         <td colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                                             No active examinations registered for {student.classLevel} students.
                                         </td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </CardContent>
             </Card>

             {/* Examination History Table with Reset */}
             <Card className="shadow-xl border-none overflow-hidden bg-white">
                 <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                     <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                         <Calendar className="h-5 w-5 text-indigo-600" /> Examination History Log
                     </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                     <Table>
                         <TableHeader className="bg-slate-50/50">
                             <TableRow>
                                 <TableHead className="font-bold py-3 px-6 text-xs text-slate-400 uppercase tracking-wider">Completed Date</TableHead>
                                 <TableHead className="font-bold py-3 px-4 text-xs text-slate-400 uppercase tracking-wider">Exam Title</TableHead>
                                 <TableHead className="font-bold py-3 px-4 text-xs text-slate-400 uppercase tracking-wider">Raw Score</TableHead>
                                 <TableHead className="font-bold py-3 px-4 text-xs text-slate-400 uppercase tracking-wider text-center">Grade Score</TableHead>
                                 <TableHead className="font-bold py-3 px-4 text-xs text-slate-400 uppercase tracking-wider">Remark</TableHead>
                                 <TableHead className="text-right font-bold py-3 px-6 text-xs text-slate-400 uppercase tracking-wider">Operational Overrides</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {studentResults.length > 0 ? (
                                 [...studentResults]
                                     .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                                     .map((result) => {
                                         const remark = getGradeRemark(result.percentage);
                                         return (
                                             <TableRow key={result.id} className="hover:bg-slate-50/30 transition-colors">
                                                 <TableCell className="py-4 px-6">
                                                     <p className="font-semibold text-sm text-slate-800">{format(new Date(result.completedAt), "dd MMM, yyyy")}</p>
                                                     <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(result.completedAt), "hh:mm a")}</p>
                                                 </TableCell>
                                                 <TableCell className="py-4 px-4">
                                                     <span className="font-extrabold text-slate-700 text-sm">{getExamTitle(result.examId)}</span>
                                                 </TableCell>
                                                 <TableCell className="py-4 px-4 text-sm font-semibold">
                                                     {result.score}
                                                     <span className="text-muted-foreground text-xs font-normal"> / {result.totalPoints}</span>
                                                 </TableCell>
                                                 <TableCell className="py-4 px-4 text-center">
                                                     <span className={`text-base font-black ${result.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                         {result.percentage}%
                                                     </span>
                                                 </TableCell>
                                                 <TableCell className="py-4 px-4">
                                                     <Badge variant="outline" className={`${remark.color} shadow-none font-bold text-[10px] uppercase border`}>
                                                         {remark.label}
                                                     </Badge>
                                                 </TableCell>
                                                 <TableCell className="py-4 px-6 text-right">
                                                     <div className="flex justify-end items-center gap-1.5">
                                                         <Link href={`/admin/results/${result.id}`}>
                                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" title="View Breakdown">
                                                                 <Eye className="h-4 w-4" />
                                                             </Button>
                                                         </Link>
                                                         <Button
                                                             variant="ghost"
                                                             size="icon"
                                                             className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                                             onClick={() => handlePrintSingle(result)}
                                                             title="Print result sheet"
                                                         >
                                                             <Printer className="h-4 w-4" />
                                                         </Button>
                                                         <Button
                                                             variant="outline"
                                                             size="sm"
                                                             className="h-8 border-indigo-200/50 hover:bg-indigo-50 text-indigo-600 font-bold text-xs gap-1.5 shadow-sm ml-2"
                                                             onClick={() => setResettingResult(result)}
                                                             title="Reset Student Attempt"
                                                         >
                                                             <RefreshCw className="h-3 w-3 shrink-0" /> Reset Attempt
                                                         </Button>
                                                     </div>
                                                 </TableCell>
                                             </TableRow>
                                         );
                                     })
                             ) : (
                                 <TableRow>
                                     <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                                         No examinations have been completed by this student.
                                     </TableCell>
                                 </TableRow>
                             )}
                         </TableBody>
                     </Table>
                 </CardContent>
             </Card>

             {/* Reset Confirmation Dialog */}
             <AlertDialog open={resettingResult !== null} onOpenChange={(open) => !open && setResettingResult(null)}>
                 <AlertDialogContent className="bg-white rounded-xl border p-6">
                     <AlertDialogHeader>
                         <div className="flex items-center gap-2.5 text-indigo-600">
                             <ShieldAlert className="h-6 w-6 shrink-0 animate-bounce" />
                             <AlertDialogTitle className="text-lg font-bold">Reset Examination Attempt?</AlertDialogTitle>
                         </div>
                         <AlertDialogDescription className="text-xs text-slate-500 mt-2">
                             This will permanently delete candidate's scores and responses for <span className="font-bold text-slate-700">{resettingResult && getExamTitle(resettingResult.examId)}</span>. 
                             Any active exam sessions will be deleted, allowing the student to retake the exam from scratch inside their portal.
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter className="mt-4">
                         <AlertDialogCancel className="text-slate-500">Cancel</AlertDialogCancel>
                         <AlertDialogAction
                             onClick={() => resettingResult && resetResultMutation.mutate(resettingResult.id)}
                             className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                             disabled={resetResultMutation.isPending}
                         >
                             {resetResultMutation.isPending ? "Resetting..." : "Confirm Reset"}
                         </AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>
         </div>
     );
}
