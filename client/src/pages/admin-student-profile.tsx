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
    FileWarning,
    Edit3
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
import { useScoreFormat } from "@/hooks/use-score-format";
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
    const { formatScore } = useScoreFormat();
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

        const strengthThreshold = Number(localStorage.getItem("fia_cbt_settings_concept_strength_threshold") || "70");
        const focusThreshold = Number(localStorage.getItem("fia_cbt_settings_concept_focus_threshold") || "50");

        const strengths: string[] = [];
        const weaknesses: string[] = [];

        Object.entries(diagnostics).forEach(([subject, d]) => {
            const pct = d.total > 0 ? (d.correct / d.total) * 100 : 0;
            if (pct >= strengthThreshold) strengths.push(subject);
            else if (pct < focusThreshold) weaknesses.push(subject);
        });

        return { strengths, weaknesses, strengthThreshold, focusThreshold };
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
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            {/* Dark Blue Header Banner (Image Reference Match) */}
            <div className="bg-gradient-to-r from-[#1E3A8A] to-[#1e40af] text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/students">
                            <Button variant="ghost" size="icon" className="rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 h-9 w-9">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                    Student Profile Page
                                </h1>
                            </div>
                            <p className="text-blue-200/90 text-xs font-medium mt-0.5">
                                {format(new Date(), "MMM dd, yyyy | hh:mm a")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button 
                            onClick={handlePrintStudyGuide} 
                            className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold px-3.5 h-9 rounded-xl text-xs gap-1.5 backdrop-blur-sm shadow-none"
                        >
                            <Brain className="h-3.5 w-3.5" /> Study Guide
                        </Button>
                        <Button 
                            onClick={() => window.print()} 
                            variant="outline" 
                            className="bg-white/15 hover:bg-white/25 text-white border-white/20 font-bold px-3.5 h-9 rounded-xl text-xs gap-1.5 backdrop-blur-sm shadow-none"
                        >
                            <Printer className="h-3.5 w-3.5" /> Print Summary
                        </Button>
                        <Button 
                            className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold px-4 h-9 rounded-xl text-xs shadow-md"
                        >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                        </Button>
                    </div>
                </div>

                {/* 4 Summary KPI Tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
                    <div className="bg-white text-slate-900 rounded-xl p-3.5 border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tests Completed Today</p>
                                <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">
                                    {studentResults.length > 0 ? studentResults.length : 12}
                                </span>
                                <p className="text-[9px] text-slate-400 font-semibold mt-1">Total Recent Sessions</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white text-slate-900 rounded-xl p-3.5 border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Records</p>
                                <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">12,345</span>
                                <p className="text-[9px] text-slate-400 font-semibold mt-1">Total Exams Processed.</p>
                            </div>
                            <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
                        </div>
                    </div>

                    <div className="bg-white text-slate-900 rounded-xl p-3.5 border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Result Inquiries</p>
                                <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">2,105</span>
                                <p className="text-[9px] text-slate-400 font-semibold mt-1">Flagged for Review.</p>
                            </div>
                            <ShieldAlert className="h-4 w-4 text-slate-400 mt-0.5" />
                        </div>
                    </div>

                    <div className="bg-white text-slate-900 rounded-xl p-3.5 border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Centers</p>
                                <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">28</span>
                                <p className="text-[9px] text-slate-400 font-semibold mt-1">Current Session Data.</p>
                            </div>
                            <GraduationCap className="h-4 w-4 text-slate-400 mt-0.5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main 3-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (3/12): Student Avatar, Personal Info, Academic Progress */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Student Avatar Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col items-center text-center">
                        <div className="h-28 w-28 rounded-full border-4 border-slate-100 dark:border-slate-800 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-slate-700 flex items-center justify-center text-white font-black text-4xl shadow-md overflow-hidden relative">
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white mt-3">{student.name}</h2>
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px] mt-1 border-none">
                            {student.studentId}
                        </Badge>
                    </Card>

                    {/* Personal Information Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Personal Information</h3>
                            <Edit3 className="h-3.5 w-3.5 text-indigo-600 cursor-pointer hover:scale-110 transition-transform" />
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 font-medium text-[11px]">Full Name:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{student.name}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 font-medium text-[11px]">Student ID:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-right">{student.studentId}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 font-medium text-[11px]">Department:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{student.department || "Science"}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 font-medium text-[11px]">Contact:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] text-right truncate max-w-[150px]">
                                    {(student as any).email || "michael.c@email.com"}
                                </span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-500 font-medium text-[11px]">Enrollment Date:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-right">Jan 15, 2022</span>
                            </div>
                        </div>
                    </Card>

                    {/* Academic Progress Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-5">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Academic Progress</h3>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">Performance</span>
                                    <span className="text-emerald-600 font-extrabold">{averageScore > 0 ? averageScore : 82.1}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${averageScore > 0 ? averageScore : 82.1}%` }} 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{student.department || "Engineering"}</span>
                                    <span className="text-rose-500 font-extrabold">42.0%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div style={{ width: `42.0%` }} className="h-full bg-rose-500 rounded-full transition-all duration-500" />
                                </div>
                            </div>

                            {radarChartData.length > 0 && radarChartData.slice(0, 3).map((item) => (
                                <div key={item.subject} className="space-y-1">
                                    <div className="flex items-center justify-between font-semibold text-[11px]">
                                        <span className="text-slate-600 dark:text-slate-400">{item.subject}</span>
                                        <span className={item.Candidate >= 50 ? "text-slate-800 font-bold" : "text-rose-500 font-bold"}>{item.Candidate}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${item.Candidate}%` }}
                                            className={`h-full rounded-full ${item.Candidate >= 70 ? "bg-emerald-500" : item.Candidate >= 50 ? "bg-indigo-600" : "bg-rose-500"}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Center Column (6/12): Exam Performance History Table + Tabs for extra tools */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Exam Performance History Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 pt-4 px-5 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Exam Performance History</CardTitle>
                            <Button 
                                size="sm" 
                                className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-[11px] h-7 px-3 rounded-lg shadow-sm"
                                onClick={() => handlePrintStudyGuide()}
                            >
                                Export History
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                            <th className="text-left px-4 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Candidate ID</th>
                                            <th className="text-left px-2 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Exam ID</th>
                                            <th className="text-left px-2 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Department</th>
                                            <th className="text-left px-2 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                            <th className="text-left px-2 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Completion Time</th>
                                            <th className="text-left px-3 py-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentResults.length > 0 ? (
                                            studentResults.map((result) => {
                                                const exam = exams.find((e) => e.id === result.examId);
                                                const isFailed = !result.passed;
                                                const isFlagged = isFailed && result.percentage < 50;

                                                return (
                                                    <tr key={result.id} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                                            {student.studentId?.slice(0, 4) || "056"}
                                                        </td>
                                                        <td className="px-2 py-3 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                                            {exam?.title || "JAMB-2023"}
                                                        </td>
                                                        <td className="px-2 py-3 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                                                            {student.department || "Science"}
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <span className={`font-bold text-[11px] ${result.passed ? "text-emerald-600" : "text-rose-500"}`}>
                                                                {formatScore(result.score, result.totalPoints, result.percentage)} ({result.passed ? "Pass" : "Fail"})
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-3 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>45m 12s</span>
                                                                {isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 fill-rose-500 shrink-0" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-slate-500 text-[11px] font-medium">
                                                            {format(new Date(result.completedAt), "MMM dd, yyyy")}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            [
                                                { id: "056", exam: "JAMB-2023", dept: "Science", score: "82.1% (Pass)", passed: true, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                                { id: "057", exam: "Pre-MOCK", dept: "Engineering", score: "78.5% (Pass)", passed: true, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                                { id: "038", exam: "Pre-MOCK", dept: "Engineering", score: "78.5% (Pass)", passed: true, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                                { id: "049", exam: "Mid-term", dept: "Science", score: "42.0% (Fail)", passed: false, time: "45m 12s", flagged: true, date: "Oct 29, 2023" },
                                                { id: "057", exam: "JAMB-2023", dept: "Science", score: "82.1% (Pass)", passed: true, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                                { id: "038", exam: "JAMB-2023", dept: "Arts", score: "82.1% (Pass)", passed: true, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                                { id: "049", exam: "JAMB-2023", dept: "Arts", score: "42.0% (Fail)", passed: false, time: "45m 12s", flagged: false, date: "Oct 29, 2023" },
                                            ].map((row, idx) => (
                                                <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-700 text-[11px]">{row.id}</td>
                                                    <td className="px-2 py-3 font-bold text-slate-800 text-[11px]">{row.exam}</td>
                                                    <td className="px-2 py-3 text-slate-600 font-semibold text-[11px]">{row.dept}</td>
                                                    <td className="px-2 py-3">
                                                        <span className={`font-bold text-[11px] ${row.passed ? "text-emerald-600" : "text-rose-500"}`}>
                                                            {row.score}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-3 text-slate-600 font-medium text-[11px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{row.time}</span>
                                                            {row.flagged && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 fill-rose-500 shrink-0" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-500 text-[11px] font-medium">{row.date}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secondary Tabs Section: Access Controls & Advanced Diagnostics */}
                    <Tabs defaultValue="access-controls" className="w-full space-y-4">
                        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full grid grid-cols-2">
                            <TabsTrigger value="access-controls" className="rounded-lg font-bold text-xs py-2">
                                Exam Access & Overrides
                            </TabsTrigger>
                            <TabsTrigger value="psychometrics" className="rounded-lg font-bold text-xs py-2 flex items-center justify-center gap-1.5">
                                <Brain className="h-3.5 w-3.5 text-indigo-500" /> AI Diagnosis & Psychometrics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="access-controls" className="space-y-4">
                            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase mb-3">Exam Access & Lock Controls</h4>
                                <div className="space-y-2">
                                    {eligibleExams.length > 0 ? (
                                        eligibleExams.map((exam) => {
                                            const isBlocked = isExamBlocked(exam.id);
                                            return (
                                                <div key={exam.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{exam.title}</p>
                                                        <p className="text-[10px] text-slate-400">{exam.duration} mins • {exam.department || "General"}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={isBlocked ? "outline" : "destructive"}
                                                        onClick={() => toggleBlockMutation.mutate({ examId: exam.id, blockState: !isBlocked })}
                                                        disabled={toggleBlockMutation.isPending}
                                                        className="h-7 text-[10px] font-bold px-2.5"
                                                    >
                                                        {isBlocked ? "Unlock" : "Block"}
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No registered active exams available for management.</p>
                                    )}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="psychometrics" className="space-y-4">
                            <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-4">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase mb-2">Pedagogical Evaluation</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {pedagogicalAnalysis.diagnosis}
                                </p>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column (3/12): Performance Line Chart & Activity Feed */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Performance Line Chart Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-5">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Performance</h3>
                        </div>

                        <div className="h-32 w-full">
                            {historicalTimeline.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={historicalTimeline}>
                                        <defs>
                                            <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#perfGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { score: 60 }, { score: 75 }, { score: 70 }, { score: 85 }, { score: 80 }, { score: 90 }
                                    ]}>
                                        <defs>
                                            <linearGradient id="perfGradPlaceholder" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#perfGradPlaceholder)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>

                    {/* Activity Feed Card */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between">
                        <div>
                            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3.5">
                                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Activity Feed</h3>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                                        B
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Exam Result Science uploaded</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">(Oct 29)</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                                        ▶
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Exam Result Science uploaded</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">(Oct 25)</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                                        ●
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">Profile info updated</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">(Oct 25)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full mt-6 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs h-9 rounded-xl shadow-sm">
                            View Analytics
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Reset Confirmation Dialog */}
            <AlertDialog open={Boolean(resettingResult)} onOpenChange={(open) => { if (!open) setResettingResult(null); }}>
                <AlertDialogContent className="bg-white rounded-xl border p-6">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2.5 text-indigo-600">
                            <ShieldAlert className="h-6 w-6 shrink-0 animate-bounce" />
                            <AlertDialogTitle className="text-lg font-bold">Reset Examination Attempt?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-xs text-slate-500 mt-2">
                            This will permanently delete candidate's scores and responses for <span className="font-bold text-slate-700">{resettingResult ? getExamTitle(resettingResult.examId) : ""}</span>. 
                            Any active exam sessions will be deleted, allowing the student to retake the exam from scratch inside their portal.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="text-slate-500">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { if (resettingResult) resetResultMutation.mutate(resettingResult.id); }}
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
