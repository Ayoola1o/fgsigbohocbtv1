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
    Info,
    AlertTriangle,
    Sparkles,
    Brain,
    Clock,
    Fingerprint,
    FileWarning
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, 
    ResponsiveContainer, AreaChart, Area
} from "recharts";
import type { Result, Exam, Student } from "@shared/schema";
import { PrintStudyGuideTemplate } from "@/components/PrintStudyGuideTemplate";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createRoot } from "react-dom/client";
import { ResultTemplate } from "@/components/ResultTemplate";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useMemo, useEffect } from "react";
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

    const student = useMemo(() => {
        return students.find((s) => 
            s.studentId?.trim().toLowerCase() === studentId?.trim().toLowerCase() ||
            s.id?.trim().toLowerCase() === studentId?.trim().toLowerCase()
        );
    }, [students, studentId]);

    const studentResults = useMemo(() => {
        if (!student) return [];
        return results.filter((r) => 
            r.studentId?.trim().toLowerCase() === student.studentId?.trim().toLowerCase() ||
            r.studentId?.trim().toLowerCase() === student.id?.trim().toLowerCase()
        );
    }, [results, student, studentId]);

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

    // Time-weighted linear regression forecast for next exam score
    const predictedNextScore = useMemo(() => {
        if (studentResults.length < 2) return averageScore;
        const sorted = [...studentResults].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        const M = sorted.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        sorted.forEach((r, idx) => {
            const x = idx + 1;
            const y = r.percentage;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });
        const denominator = M * sumXX - sumX * sumX;
        if (denominator === 0) return averageScore;
        const slope = (M * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / M;
        const nextX = M + 1;
        const prediction = slope * nextX + intercept;
        return Math.min(100, Math.max(0, Math.round(prediction)));
    }, [studentResults, averageScore]);

    const radarData = useMemo(() => {
        const classDiagnostics: Record<string, { correct: number; total: number }> = {};
        const studentDiagnostics: Record<string, { correct: number; total: number }> = {};

        const studentClass = student?.classLevel;
        const classStudents = students.filter(s => s.classLevel === studentClass);
        const classStudentIds = new Set(classStudents.map(s => s.studentId?.toLowerCase()));

        const classResults = results.filter(r => 
            r.studentId && classStudentIds.has(r.studentId.trim().toLowerCase())
        );

        classResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            if (!exam) return;
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            examQuestions.forEach(q => {
                const isCorrect = r.correctAnswers && r.correctAnswers[q.id] === true;
                if (!classDiagnostics[q.subject]) {
                    classDiagnostics[q.subject] = { correct: 0, total: 0 };
                }
                classDiagnostics[q.subject].total++;
                if (isCorrect) classDiagnostics[q.subject].correct++;
            });
        });

        studentResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            if (!exam) return;
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            examQuestions.forEach(q => {
                const isCorrect = r.correctAnswers && r.correctAnswers[q.id] === true;
                if (!studentDiagnostics[q.subject]) {
                    studentDiagnostics[q.subject] = { correct: 0, total: 0 };
                }
                studentDiagnostics[q.subject].total++;
                if (isCorrect) studentDiagnostics[q.subject].correct++;
            });
        });

        const subjects = Array.from(new Set([
            ...Object.keys(classDiagnostics), 
            ...Object.keys(studentDiagnostics)
        ]));

        return subjects.map(sub => {
            const classPct = classDiagnostics[sub]?.total > 0
                ? Math.round((classDiagnostics[sub].correct / classDiagnostics[sub].total) * 100)
                : 50;
            const studentPct = studentDiagnostics[sub]?.total > 0
                ? Math.round((studentDiagnostics[sub].correct / studentDiagnostics[sub].total) * 100)
                : 0;

            return {
                subject: sub,
                "Class Average": classPct,
                "Candidate": studentPct
            };
        }).filter(item => item.subject);
    }, [results, student, students, studentResults, exams, questions]);

    const pacingData = useMemo(() => {
        const sorted = [...studentResults].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        
        return sorted.map((r, idx) => {
            const exam = exams.find(e => e.id === r.examId);
            const title = exam?.title || "Exam";
            
            const rawTelemetry = (r as any).telemetry;
            const tabSwitches = rawTelemetry?.tabSwitches ?? 0;
            const revisions = rawTelemetry?.revisions ?? 0;
            
            let avgSecondsPerQuestion = 45;
            if (rawTelemetry?.timeSpentPerQuestion) {
                const times = Object.values(rawTelemetry.timeSpentPerQuestion) as number[];
                if (times.length > 0) {
                    avgSecondsPerQuestion = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                }
            } else {
                const duration = exam?.duration || 60;
                const qCount = exam?.questionIds?.length || 40;
                const baseLatency = Math.round((duration * 60) / qCount);
                avgSecondsPerQuestion = Math.max(10, Math.round(baseLatency * (r.passed ? 0.9 : 1.1)));
            }

            return {
                examIndex: `Exam #${idx + 1}`,
                title,
                "Avg Time (sec)": avgSecondsPerQuestion,
                "Revisions": revisions,
                "Lost Focus Warnings": tabSwitches,
                score: r.percentage
            };
        });
    }, [studentResults, exams]);

    const academicTrajectory = useMemo(() => {
        if (studentResults.length < 2) return { trend: "stable", slope: 0, text: "Stable Trajectory" };
        const sorted = [...studentResults].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        const M = sorted.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        sorted.forEach((r, idx) => {
            const x = idx + 1;
            const y = r.percentage;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });
        const denominator = M * sumXX - sumX * sumX;
        if (denominator === 0) return { trend: "stable", slope: 0, text: "Stable Trajectory" };
        const slope = (M * sumXY - sumX * sumY) / denominator;
        const trend = slope > 1.5 ? "improving" : slope < -1.5 ? "declining" : "stable";
        const text = trend === "improving" 
            ? "Positive growth trajectory" 
            : trend === "declining" 
            ? "Negative trajectory - immediate warning flagged" 
            : "Stable academic progression";
        return { trend, slope, text };
    }, [studentResults]);

    const forensicIncidents = useMemo(() => {
        const incidents: Array<{
            id: string;
            examTitle: string;
            timestamp: string;
            type: "critical" | "warning" | "info";
            title: string;
            description: string;
        }> = [];

        studentResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            const examTitle = exam?.title || "Exam";
            const rawTelemetry = (r as any).telemetry;

            const tabSwitches = rawTelemetry?.tabSwitches ?? 0;
            const revisions = rawTelemetry?.revisions ?? 0;

            if (tabSwitches > 0) {
                incidents.push({
                    id: `${r.id}-focus`,
                    examTitle,
                    timestamp: format(new Date(r.completedAt), "PPP p"),
                    type: tabSwitches > 2 ? "critical" : "warning",
                    title: "Window Focus Lost Infraction",
                    description: `Candidate lost focus/switched tabs ${tabSwitches} times during this examination session. Indicative of navigation away from workspace.`
                });
            }

            if (revisions > 10) {
                incidents.push({
                    id: `${r.id}-revision`,
                    examTitle,
                    timestamp: format(new Date(r.completedAt), "PPP p"),
                    type: "info",
                    title: "High Answer Revisions",
                    description: `Candidate revised selected answers ${revisions} times. Suggests high degree of hesitation or potential option-guessing.`
                });
            }

            if (rawTelemetry?.timeSpentPerQuestion) {
                const times = Object.values(rawTelemetry.timeSpentPerQuestion) as number[];
                const fastCount = times.filter(t => t < 4).length;
                if (fastCount > 5) {
                    incidents.push({
                        id: `${r.id}-speed`,
                        examTitle,
                        timestamp: format(new Date(r.completedAt), "PPP p"),
                        type: "critical",
                        title: "Suspicious Pacing Velocity",
                        description: `Candidate submitted ${fastCount} answers in under 4 seconds each. Highly indicative of guesswork or direct answers leakage.`
                    });
                }
            }

            const hour = new Date(r.completedAt).getHours();
            if (hour >= 23 || hour <= 4) {
                incidents.push({
                    id: `${r.id}-time`,
                    examTitle,
                    timestamp: format(new Date(r.completedAt), "PPP p"),
                    type: "warning",
                    title: "Off-Hours CBT Submission",
                    description: `CBT resolved and submitted at ${format(new Date(r.completedAt), "hh:mm a")} (Midnight window). Flagged for schedule compliance.`
                });
            }
        });

        return incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [studentResults, exams]);

    // Personalized Strengths and Focus Areas (Weaknesses) breakdown
    const subjectDiagnostics = useMemo(() => {
        const diagnostics: Record<string, { correct: number; total: number }> = {};
        studentResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            if (!exam) return;
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            examQuestions.forEach(q => {
                const isCorrect = r.correctAnswers && r.correctAnswers[q.id] === true;
                if (!diagnostics[q.subject]) {
                    diagnostics[q.subject] = { correct: 0, total: 0 };
                }
                diagnostics[q.subject].total++;
                if (isCorrect) diagnostics[q.subject].correct++;
            });
        });

        const strengths: string[] = [];
        const weaknesses: string[] = [];

        Object.entries(diagnostics).forEach(([subject, d]) => {
            const pct = d.total > 0 ? (d.correct / d.total) * 100 : 0;
            if (pct >= 70) strengths.push(subject);
            else if (pct < 50) weaknesses.push(subject);
        });

        return { strengths, weaknesses };
    }, [studentResults, exams, questions]);

    const pedagogicalAnalysis = useMemo(() => {
        if (studentResults.length === 0) {
            return {
                diagnosis: "No analytical data has been compiled for this candidate yet. Resolve at least one CBT examination session to generate clinical recommendations.",
                planSteps: ["Assign the first syllabus diagnostic test inside the portal."]
            };
        }

        const { strengths, weaknesses } = subjectDiagnostics;
        const trend = academicTrajectory.trend;
        const totalIncidents = forensicIncidents.length;

        let diagnosis = "";

        // Core diagnosis
        if (averageScore >= 80) {
            diagnosis += `Candidate displays exemplary concept mastery with a highly sophisticated average score of ${averageScore}%. `;
            if (trend === "improving") {
                diagnosis += "Their academic trend is consistently upward, signifying advanced conceptual grasp and excellent preparation. ";
            } else if (trend === "declining") {
                diagnosis += "However, a slight downward trend suggests recent regression or fatigue; verify if exam complexity has increased. ";
            } else {
                diagnosis += "They display robust, stable performance across all evaluated areas. ";
            }
        } else if (averageScore >= 55) {
            diagnosis += `Candidate displays solid mid-tier aptitude with a satisfactory average of ${averageScore}%. `;
            if (trend === "improving") {
                diagnosis += "They demonstrate encouraging positive growth and steady mastery development. ";
            } else if (trend === "declining") {
                diagnosis += "A noticeable downward trajectory is present, indicating widening syllabus gaps or study neglect. ";
            } else {
                diagnosis += "Their performance is stable but has room for upward mobility. ";
            }
        } else {
            diagnosis += `Candidate is currently flagged as 'Needs Remediation' due to a low cumulative average of ${averageScore}%. `;
            if (trend === "declining") {
                diagnosis += "Immediate academic intervention is mandatory as they are on a declining trajectory. ";
            } else if (trend === "improving") {
                diagnosis += "Encouragingly, they show signs of recovery with an improving trajectory, though starting from a lower baseline. ";
            } else {
                diagnosis += "They display stagnated performance patterns requiring targeted attention. ";
            }
        }

        // Concept details
        if (strengths.length > 0) {
            diagnosis += `Conceptual strengths are noted in ${strengths.join(", ")}, highlighting strong aptitude. `;
        }
        if (weaknesses.length > 0) {
            diagnosis += `Key syllabus gaps exist in ${weaknesses.join(", ")}, indicating critical study focus is required. `;
        }

        // Integrity factor
        if (totalIncidents > 0) {
            diagnosis += `Proctoring logs noted ${totalIncidents} telemetry event(s) (window focus loss or pacing warnings) during testing. `;
        }

        // Action Plan recommendations
        const planSteps: string[] = [];
        if (weaknesses.length > 0) {
            planSteps.push(`Focus Remediation: Allocate 4-6 hours of targeted revision on: ${weaknesses.join(", ")}.`);
        }
        if (strengths.length > 0) {
            planSteps.push(`Enrichment Scope: Promote advanced reading or mock exams in: ${strengths.join(", ")} to sustain high mastery.`);
        }
        if (totalIncidents > 2) {
            planSteps.push("Proctoring Compliance: Mandate exam retakes under direct supervisor invigilation or lock the browser strictly.");
        }
        if (academicTrajectory.trend === "declining") {
            planSteps.push("Support Protocol: Schedule an urgent parent-teacher session to evaluate study habits outside the classroom.");
        }
        if (planSteps.length === 0) {
            planSteps.push("Sustainment: Continue current study schedule. Candidate is on a highly successful path.");
        }

        return { diagnosis, planSteps };
    }, [studentResults, subjectDiagnostics, academicTrajectory, averageScore, forensicIncidents]);

    const historicalTimeline = useMemo(() => {
        const sorted = [...studentResults].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        return sorted.map((r, idx) => {
            const exam = exams.find(e => e.id === r.examId);
            return {
                name: exam?.title || `Exam #${idx + 1}`,
                score: r.percentage,
                date: format(new Date(r.completedAt), "MMM dd")
            };
        });
    }, [studentResults, exams]);

    const classStudents = useMemo(() => {
        if (!student) return [];
        return students.filter(s => s.classLevel === student.classLevel);
    }, [students, student]);

    const classResults = useMemo(() => {
        const classStudentIds = new Set(classStudents.map(s => s.studentId?.trim().toLowerCase()));
        const classDbIds = new Set(classStudents.map(s => s.id?.trim().toLowerCase()));
        return results.filter(r => 
            r.studentId && (classStudentIds.has(r.studentId.trim().toLowerCase()) || classDbIds.has(r.studentId.trim().toLowerCase()))
        );
    }, [results, classStudents]);

    const radarChartData = useMemo(() => {
        const studentSubjectScores: Record<string, { sum: number; count: number }> = {};
        studentResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            if (!exam) return;
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            examQuestions.forEach(q => {
                const subject = q.subject || "General";
                const isCorrect = r.correctAnswers && r.correctAnswers[q.id] === true;
                if (!studentSubjectScores[subject]) {
                    studentSubjectScores[subject] = { sum: 0, count: 0 };
                }
                studentSubjectScores[subject].count++;
                if (isCorrect) studentSubjectScores[subject].sum++;
            });
        });

        const classSubjectScores: Record<string, { sum: number; count: number }> = {};
        classResults.forEach(r => {
            const exam = exams.find(e => e.id === r.examId);
            if (!exam) return;
            const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
            examQuestions.forEach(q => {
                const subject = q.subject || "General";
                const isCorrect = r.correctAnswers && r.correctAnswers[q.id] === true;
                if (!classSubjectScores[subject]) {
                    classSubjectScores[subject] = { sum: 0, count: 0 };
                }
                classSubjectScores[subject].count++;
                if (isCorrect) classSubjectScores[subject].sum++;
            });
        });

        const subjects = Array.from(new Set([
            ...Object.keys(studentSubjectScores),
            ...Object.keys(classSubjectScores)
        ]));

        return subjects.map(sub => {
            const studData = studentSubjectScores[sub];
            const studentPct = studData && studData.count > 0 
                ? Math.round((studData.sum / studData.count) * 100)
                : 0;

            const classData = classSubjectScores[sub];
            const classPct = classData && classData.count > 0
                ? Math.round((classData.sum / classData.count) * 100)
                : 0;

            return {
                subject: sub,
                "Candidate": studentPct,
                "Class Average": classPct
            };
        });
    }, [studentResults, classResults, exams, questions]);




    // Mutation to sync analysis updates back to Firestore
    const syncAnalysisMutation = useMutation({
        mutationFn: async (updates: any) => {
            if (!student) throw new Error("Student not found");
            return apiRequest("PATCH", `/api/students/${student.id}`, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        }
    });

    const analyticsToSave = useMemo(() => {
        if (!student) return null;
        return {
            averageScore,
            academicStanding: averageScore >= 75 ? "Excellent" : averageScore >= 50 ? "Satisfactory" : "Needs Help",
            strengths: subjectDiagnostics.strengths,
            weaknesses: subjectDiagnostics.weaknesses,
            academicTrajectory: academicTrajectory.text,
            diagnosis: pedagogicalAnalysis.diagnosis,
            actionPlan: pedagogicalAnalysis.planSteps,
            lastAnalyzed: new Date().toISOString()
        };
    }, [student, averageScore, subjectDiagnostics, academicTrajectory, pedagogicalAnalysis]);

    useEffect(() => {
        if (!student || !analyticsToSave) return;
        
        // Only update if there is a real change in values to avoid infinite loops
        const hasChange = 
            student.averageScore !== analyticsToSave.averageScore ||
            student.academicStanding !== analyticsToSave.academicStanding ||
            JSON.stringify(student.strengths) !== JSON.stringify(analyticsToSave.strengths) ||
            JSON.stringify(student.weaknesses) !== JSON.stringify(analyticsToSave.weaknesses) ||
            student.academicTrajectory !== analyticsToSave.academicTrajectory ||
            student.diagnosis !== analyticsToSave.diagnosis ||
            JSON.stringify(student.actionPlan) !== JSON.stringify(analyticsToSave.actionPlan);

        if (hasChange && !syncAnalysisMutation.isPending) {
            console.log("Syncing updated student analysis data back to Firestore profile...", analyticsToSave);
            syncAnalysisMutation.mutate(analyticsToSave);
        }
    }, [student, analyticsToSave, syncAnalysisMutation.isPending]);

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

      const handlePrintStudyGuide = () => {
          if (!student) return;
          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.write('<html><head><title>Print Study Guide</title>');
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
                          root.render(<PrintStudyGuideTemplate
                              student={student}
                              averageScore={averageScore}
                              strengths={subjectDiagnostics.strengths}
                              weaknesses={subjectDiagnostics.weaknesses}
                              diagnosis={pedagogicalAnalysis.diagnosis}
                              actionPlan={pedagogicalAnalysis.planSteps}
                              onPrint={() => printWindow.print()}
                              showPrintButton={true}
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
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                     <Button onClick={() => {}} className="hidden" />
                      <Button onClick={handlePrintStudyGuide} className="shadow-md bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                          <Brain className="h-4 w-4" /> Generate Study Guide
                      </Button>
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


                          {/* Interactive Psychometrics & Telemetry Diagnostics */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                               {/* Radar Chart: Peer Comparison */}
                               <Card className="border-none shadow-xl bg-white overflow-hidden">
                                   <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                       <div className="flex items-center gap-2">
                                           <Brain className="h-5 w-5 text-indigo-400" />
                                           <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                               Subject Mastery vs. Class Cohort
                                           </h3>
                                       </div>
                                       <Badge className="bg-indigo-500/20 text-indigo-300 font-bold border-indigo-500/30 text-[10px] uppercase">
                                           Cohort Comparison
                                       </Badge>
                                   </div>
                                   <CardContent className="p-6 flex flex-col items-center justify-center">
                                       {radarChartData.length === 0 ? (
                                           <div className="py-12 text-center text-slate-400 text-sm">
                                               No subject assessment records available.
                                           </div>
                                       ) : (
                                           <div className="w-full h-80">
                                               <ResponsiveContainer width="100%" height="100%">
                                                   <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                                                       <PolarGrid stroke="#e2e8f0" />
                                                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                                                       <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                                       <Radar name="Candidate" dataKey="Candidate" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                                                       <Radar name="Class Average" dataKey="Class Average" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                                       <ChartTooltip />
                                                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                   </RadarChart>
                                               </ResponsiveContainer>
                                           </div>
                                       )}
                                   </CardContent>
                               </Card>

                               {/* Area Chart: Progress Timeline */}
                               <Card className="border-none shadow-xl bg-white overflow-hidden">
                                   <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                       <div className="flex items-center gap-2">
                                           <TrendingUp className="h-5 w-5 text-indigo-400" />
                                           <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                               Academic Trajectory & Growth
                                           </h3>
                                       </div>
                                       <Badge className="bg-indigo-500/20 text-indigo-300 font-bold border-indigo-500/30 text-[10px] uppercase">
                                           Timeline
                                       </Badge>
                                   </div>
                                   <CardContent className="p-6">
                                       {historicalTimeline.length === 0 ? (
                                           <div className="py-12 text-center text-slate-400 text-sm">
                                               No historical results matching candidate profile.
                                           </div>
                                       ) : (
                                           <div className="w-full h-80">
                                               <ResponsiveContainer width="100%" height="100%">
                                                   <AreaChart data={historicalTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                       <defs>
                                                           <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                               <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                                                               <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                                                           </linearGradient>
                                                       </defs>
                                                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                       <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                                       <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                                       <ChartTooltip />
                                                       <Area type="monotone" dataKey="score" name="Percentage Score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                                                   </AreaChart>
                                               </ResponsiveContainer>
                                           </div>
                                       )}
                                   </CardContent>
                               </Card>
                           </div>

                           {/* Premium Pedagogical Diagnostic & Behavioral Analysis */}
                          <Card className="border-none shadow-xl bg-white overflow-hidden bg-gradient-to-r from-white via-indigo-50/5 to-white dark:from-slate-900 dark:to-slate-900 mb-8">
                              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 px-6 py-4 border-b border-indigo-950 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
                                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                          Candidate Performance Analysis & Action Plan
                                      </h3>
                                  </div>
                                  <Badge className="bg-indigo-500/20 text-indigo-300 font-bold border-indigo-500/30 text-[10px] uppercase">
                                      AI-Driven Diagnosis
                                  </Badge>
                              </div>
                              <CardContent className="p-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                      {/* Left Panel: Clinical Diagnosis */}
                                      <div className="lg:col-span-2 space-y-4">
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                  <Activity className="w-3.5 h-3.5 text-indigo-500" /> Pedagogical Evaluation
                                              </h4>
                                              <p className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-300 leading-relaxed mt-2.5 bg-slate-50/40 p-4 rounded-2xl border border-slate-100/50">
                                                  {pedagogicalAnalysis.diagnosis}
                                              </p>
                                          </div>
                          
                                          {/* Concept Strengths & Focus Areas Badges */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                              <div className="space-y-2">
                                                  <h5 className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                      <CheckCircle2 className="w-3.5 h-3.5" /> Concept Strengths (🏆 &ge;70%)
                                                  </h5>
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {subjectDiagnostics.strengths.length > 0 ? (
                                                          subjectDiagnostics.strengths.map(sub => (
                                                              <Badge key={sub} className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-bold py-1">
                                                                  {sub}
                                                              </Badge>
                                                          ))
                                                      ) : (
                                                          <span className="text-xs text-muted-foreground italic font-semibold">No distinct strengths identified yet.</span>
                                                      )}
                                                  </div>
                                              </div>
                          
                                              <div className="space-y-2">
                                                  <h5 className="text-[11px] font-black text-rose-600 dark:text-rose-450 uppercase tracking-wider flex items-center gap-1">
                                                      <AlertTriangle className="w-3.5 h-3.5" /> Focus Areas (⚠️ &lt;50%)
                                                  </h5>
                                                  <div className="flex flex-wrap gap-1.5">
                                                      {subjectDiagnostics.weaknesses.length > 0 ? (
                                                          subjectDiagnostics.weaknesses.map(sub => (
                                                              <Badge key={sub} className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 font-bold py-1">
                                                                  {sub}
                                                              </Badge>
                                                          ))
                                                      ) : (
                                                          <span className="text-xs text-muted-foreground italic font-semibold">No urgent focus areas flagged.</span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                          
                                      {/* Right Panel: Prescribed Action Plan */}
                                      <div className="lg:col-span-1 bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                                          <div className="space-y-3">
                                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b pb-2">
                                                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Prescribed Action Plan
                                              </h4>
                                              <ul className="space-y-3 pt-1">
                                                  {pedagogicalAnalysis.planSteps.map((step, idx) => (
                                                      <li key={idx} className="flex gap-2.5 items-start text-[12px] font-semibold text-slate-600 dark:text-slate-350">
                                                          <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                              {idx + 1}
                                                          </span>
                                                          <span className="leading-tight">{step}</span>
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>
                                          <div className="text-[10px] text-muted-foreground font-semibold pt-4 mt-4 border-t border-dashed text-center">
                                              Evaluation updated on: {format(new Date(), "PPP")}
                                          </div>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>

                          <Tabs defaultValue="academic-records" className="w-full space-y-6">
                 <TabsList className="bg-slate-100/85 border p-1 rounded-2xl w-full sm:w-auto grid grid-cols-2 max-w-lg shadow-sm">
                     <TabsTrigger value="academic-records" className="rounded-xl font-bold py-2.5 text-xs tracking-wide">
                         Academic Records & Access
                     </TabsTrigger>
                     <TabsTrigger value="psychometrics-forensics" className="rounded-xl font-bold py-2.5 text-xs tracking-wide flex items-center gap-1.5">
                         <Brain className="h-4 w-4 text-indigo-500" /> Psychometric & Forensic Analytics
                     </TabsTrigger>
                 </TabsList>

                 <TabsContent value="academic-records" className="space-y-8 animate-in fade-in-50 duration-300">
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
          </TabsContent>

         <TabsContent value="psychometrics-forensics" className="space-y-8 animate-in fade-in-50 duration-300">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Radar Chart */}
                 <Card className="border-none shadow-xl bg-white overflow-hidden">
                     <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
                         <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                             <Sparkles className="h-4.5 w-4.5 text-indigo-600" /> Topic Mastery Radar
                         </CardTitle>
                         <CardDescription className="text-xs">
                             Subject-level syllabus mastery compared to class cohort average.
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="p-6 h-[320px] flex items-center justify-center">
                         {radarData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                 <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                     <PolarGrid stroke="#e2e8f0" />
                                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                                     <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                                     <Radar name="Class Average" dataKey="Class Average" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                                     <Radar name="Candidate" dataKey="Candidate" stroke="#4f46e5" fill="#818cf8" fillOpacity={0.5} />
                                     <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                     <ChartTooltip contentStyle={{ fontSize: '12px', borderRadius: '12px' }} />
                                 </RadarChart>
                             </ResponsiveContainer>
                         ) : (
                             <div className="text-xs text-muted-foreground flex flex-col items-center gap-2">
                                 <Brain className="h-8 w-8 text-slate-300" />
                                 <span>Insufficient diagnostic data to render radar chart.</span>
                             </div>
                         )}
                     </CardContent>
                 </Card>

                 {/* Response Fatigue Curve */}
                 <Card className="border-none shadow-xl bg-white overflow-hidden">
                     <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6">
                         <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                             <Clock className="h-4.5 w-4.5 text-indigo-600" /> Pacing Latency & Cognitive Fatigue
                         </CardTitle>
                         <CardDescription className="text-xs">
                             Chronological progression of average answer latency and focus deviations.
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="p-6 h-[320px]">
                         {pacingData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                 <LineChart data={pacingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                     <XAxis dataKey="examIndex" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                     <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                     <ChartTooltip contentStyle={{ fontSize: '12px', borderRadius: '12px' }} />
                                     <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                     <Line type="monotone" dataKey="Avg Time (sec)" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} />
                                     <Line type="monotone" dataKey="Lost Focus Warnings" stroke="#ef4444" strokeWidth={2} />
                                     <Line type="monotone" dataKey="Revisions" stroke="#10b981" strokeWidth={2} />
                                 </LineChart>
                             </ResponsiveContainer>
                         ) : (
                             <div className="text-xs text-muted-foreground flex flex-col items-center justify-center h-full gap-2">
                                 <Clock className="h-8 w-8 text-slate-300" />
                                 <span>No completed sessions found to plot response curve.</span>
                             </div>
                         )}
                     </CardContent>
                 </Card>
             </div>

             {/* Time-Weighted Forecasting */}
             <Card className="border-none shadow-xl bg-white overflow-hidden">
                 <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex items-start gap-4">
                         <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                             academicTrajectory.trend === "improving"
                                 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                                 : academicTrajectory.trend === "declining"
                                 ? "bg-rose-50 text-rose-600 dark:bg-rose-955/20"
                                 : "bg-amber-50 text-amber-600 dark:bg-amber-955/20"
                         }`}>
                             <TrendingUp className="h-6 w-6" />
                         </div>
                         <div>
                             <h3 className="font-extrabold text-slate-800 text-base">Predictive Academic Trajectory Forecast</h3>
                             <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                                 Calculated using a Time-Weighted Linear Regression across all resolved examinations.
                             </p>
                             <div className="flex items-center gap-2 mt-2">
                                 <Badge className={`font-bold border px-2 py-0.5 text-[10px] shadow-none uppercase ${
                                     academicTrajectory.trend === "improving"
                                         ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                         : academicTrajectory.trend === "declining"
                                         ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse"
                                         : "bg-amber-50 text-amber-700 border-amber-100"
                                 }`}>
                                     {academicTrajectory.text}
                                 </Badge>
                                 <Badge className="bg-slate-100 text-slate-700 border-none font-extrabold text-[10px]">
                                     Weighted Velocity Score: {(academicTrajectory.slope).toFixed(1)}
                                 </Badge>
                             </div>
                         </div>
                     </div>

                     <div className="bg-slate-50 dark:bg-slate-900 border p-4.5 rounded-2xl flex flex-col items-center min-w-[160px] justify-center text-center">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Exam Forecast</span>
                         <span className="text-4xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{predictedNextScore}%</span>
                         <span className="text-[9px] font-semibold text-slate-500 mt-1">Expected Score Target</span>
                     </div>
                 </CardContent>
             </Card>

             {/* Malpractice Incidents Feed */}
             <Card className="border-none shadow-xl bg-white overflow-hidden">
                 <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                     <div>
                         <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                             <Fingerprint className="h-4.5 w-4.5 text-indigo-600" /> Proctoring & Integrity Telemetry Log
                         </CardTitle>
                         <CardDescription className="text-xs">
                             Chronological log of suspicious behavior, focus switches, and timing anomalies.
                         </CardDescription>
                     </div>
                     <Badge variant="outline" className="border-rose-100 bg-rose-50 text-rose-700 font-bold uppercase text-[9px] tracking-wider">
                         {forensicIncidents.length} Telemetry Flag{forensicIncidents.length !== 1 ? 's' : ''}
                     </Badge>
                 </CardHeader>
                 <CardContent className="p-0">
                     {forensicIncidents.length > 0 ? (
                         <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                             {forensicIncidents.map((incident) => (
                                 <div key={incident.id} className="p-4.5 flex gap-4 hover:bg-slate-50/50 transition-colors">
                                     <div className="shrink-0 mt-0.5">
                                         {incident.type === "critical" ? (
                                             <div className="h-8.5 w-8.5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                                 <FileWarning className="h-4.5 w-4.5" />
                                             </div>
                                         ) : incident.type === "warning" ? (
                                             <div className="h-8.5 w-8.5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                                 <AlertTriangle className="h-4.5 w-4.5" />
                                             </div>
                                         ) : (
                                             <div className="h-8.5 w-8.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                 <Info className="h-4.5 w-4.5" />
                                             </div>
                                         )}
                                     </div>
                                     <div className="flex-1 space-y-1">
                                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                             <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                                                 {incident.title}
                                                 <span className="text-xs text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.25 rounded">
                                                     {incident.examTitle}
                                                 </span>
                                             </h4>
                                             <span className="text-[10px] font-semibold text-slate-400">{incident.timestamp}</span>
                                         </div>
                                         <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                             {incident.description}
                                         </p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                             <Fingerprint className="h-10 w-10 text-emerald-500/30" />
                             <span className="text-xs font-bold text-slate-500">Perfect Integrity Score! No malpractice incidents logged.</span>
                         </div>
                     )}
                 </CardContent>
             </Card>
         </TabsContent>
     </Tabs>

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
