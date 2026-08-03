import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, CheckCircle, XCircle, Printer, Filter, Calendar as CalendarIcon, Award, TrendingUp, Sparkles, Clock, ChevronRight, User, BarChart3, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { Result, Exam, Student, defaultSystemSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { createRoot } from "react-dom/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getResults, deleteResult, deleteResultsBulk } from "@/lib/firebase-api";
import { useQueryClient } from "@tanstack/react-query";
import { useScoreFormat } from "@/hooks/use-score-format";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Download, RefreshCw, AlertTriangle, Layers, ArrowUpDown, SlidersHorizontal, Lock, Unlock, FileText, CheckSquare, Square } from "lucide-react";

export default function AdminResults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatScore } = useScoreFormat();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExamId, setFilterExamId] = useState<string>("ALL");
  const [filterClassLevel, setFilterClassLevel] = useState<string>("ALL");
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL"); // "ALL", "PASS", "FAIL"
  const [filterExamType, setFilterExamType] = useState<string>("ALL"); // "ALL", "single", "multi"
  const [filterTerm, setFilterTerm] = useState<string>("ALL");
  const [filterScoreRange, setFilterScoreRange] = useState<string>("ALL"); // "ALL", "<40", "40-60", ">60"
  const [sortBy, setSortBy] = useState<string>("date-desc"); // "date-desc", "date-asc", "name-asc", "name-desc", "score-desc", "score-asc", "class"
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const [resultsTab, setResultsTab] = useState<"real" | "qa">("real");

  // Modal State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeKeyword, setPurgeKeyword] = useState("test");
  const [purgeStep, setPurgeStep] = useState<"preview" | "confirm">("preview");
  const [isPurging, setIsPurging] = useState(false);

  const [isMultiExamPrintModalOpen, setIsMultiExamPrintModalOpen] = useState(false);
  const [selectedMultiExamId, setSelectedMultiExamId] = useState<string>("");
  const [selectedMultiSubject, setSelectedMultiSubject] = useState<string>("");
  const [selectedMultiClass, setSelectedMultiClass] = useState<string>("ALL");

  // 4-Tier Missing Exam Report Modal State
  const [isMissingExamModalOpen, setIsMissingExamModalOpen] = useState(false);
  const [missingScope, setMissingScope] = useState<'student' | 'subject' | 'class' | 'school'>('class');
  const [missingSelectedTerm, setMissingSelectedTerm] = useState<string>("ALL");
  const [missingSelectedStudentId, setMissingSelectedStudentId] = useState<string>("ALL");
  const [missingSelectedExamId, setMissingSelectedExamId] = useState<string>("ALL");
  const [missingSelectedClass, setMissingSelectedClass] = useState<string>("ALL");
  const [missingExamSelectionMode, setMissingExamSelectionMode] = useState<'auto' | 'custom'>('auto');
  const [missingCustomExamIds, setMissingCustomExamIds] = useState<string[]>([]);

  // Advanced Printouts Modal State
  const [isAdvancedPrintModalOpen, setIsAdvancedPrintModalOpen] = useState(false);
  const [advancedPrintType, setAdvancedPrintType] = useState<
    'student-term-breakdown' | 'student-cumulative-broadsheet' | 'class-broadsheet' | 'subject-broadsheet' | 'department-broadsheet'
  >('student-cumulative-broadsheet');
  const [includePosition, setIncludePosition] = useState<boolean>(true);
  const [rankingScope, setRankingScope] = useState<'class' | 'department'>('class');
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState<string>("ALL");
  // Broadsheet-specific filters (independent from main results table filters)
  const [broadsheetSelectedTerm, setBroadsheetSelectedTerm] = useState<string>("ALL");
  const [broadsheetSelectedClass, setBroadsheetSelectedClass] = useState<string>("ALL");
  const [broadsheetSelectedDept, setBroadsheetSelectedDept] = useState<string>("ALL");

  // Published state
  const [publishedResultIds, setPublishedResultIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("fia_published_result_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const togglePublishResult = (id: string) => {
    const next = new Set(publishedResultIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPublishedResultIds(next);
    localStorage.setItem("fia_published_result_ids", JSON.stringify(Array.from(next)));
    toast({
      title: next.has(id) ? "Result Published" : "Result Held",
      description: next.has(id) ? "Candidate can now view result in portal." : "Result withheld from candidate view.",
    });
  };

  const publishSelected = (publish: boolean) => {
    const next = new Set(publishedResultIds);
    selectedResultIds.forEach(id => {
      if (publish) next.add(id);
      else next.delete(id);
    });
    setPublishedResultIds(next);
    localStorage.setItem("fia_published_result_ids", JSON.stringify(Array.from(next)));
    toast({
      title: publish ? "Selected Results Published" : "Selected Results Withheld",
      description: `${selectedResultIds.size} records updated.`,
    });
  };

  const writePrintWindowDocument = (printWindow: Window, title: string, extraHeadHtml = "") => {
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${extraHeadHtml}
  </head>
  <body>
    <div id="print-root"></div>
  </body>
</html>`);
    printWindow.document.close();
  };

  const cloneCurrentStylesIntoPrintWindow = (printWindow: Window) => {
    const nodes = document.querySelectorAll('style, link[rel="stylesheet"]');
    nodes.forEach((node) => {
      try {
        printWindow.document.head.appendChild(node.cloneNode(true));
      } catch {
        // ignore individual style clone failures
      }
    });
  };

  const waitForPrintRoot = (printWindow: Window, timeoutMs = 5000) => {
    return new Promise<HTMLElement>((resolve, reject) => {
      const start = Date.now();

      const tick = () => {
        try {
          if (printWindow.closed) {
            reject(new Error("Print window was closed."));
            return;
          }

          const container = printWindow.document.getElementById("print-root");
          if (container) {
            resolve(container);
            return;
          }

          if (Date.now() - start > timeoutMs) {
            reject(new Error("Timed out waiting for #print-root"));
            return;
          }
        } catch (err) {
          // In some browsers, document access can throw briefly while navigating/writing.
          // We'll keep retrying until timeout.
        }

        requestAnimationFrame(tick);
      };

      tick();
    });
  };


  const { data: results, isLoading: resultsLoading, error: resultsError } = useQuery<Result[]>({
    queryKey: ["/api/results"],
    queryFn: async () => {
      console.log("AdminResults: Fetching results...");
      try {
        const res = await getResults();
        console.log(`AdminResults: Successfully fetched ${res.length} results.`);
        return res;
      } catch (err) {
        console.error("AdminResults: Error fetching results:", err);
        throw err;
      }
    }
  });

  const { data: exams } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: questions } = useQuery<any[]>({ queryKey: ["/api/questions"] });
  const { data: students } = useQuery<Student[]>({ queryKey: ["/api/students"] });

  const isQAUerOrTestRecord = (record: any) => {
    if (!record) return false;
    if (record.isTestUser === true || record.isTestAttempt === true) return true;
    if (record.role === 'admin' || record.role === 'staff' || record.role === 'qa') return true;
    const sid = (record.studentId || record.id || '').toString().toUpperCase().trim();
    const sname = (record.studentName || record.name || '').toString().toUpperCase().trim();
    if (sid.startsWith('QA') || sid.startsWith('TEST') || sid.startsWith('STAFF') || sid.startsWith('ADMIN') || sid.includes('QA_') || sid.includes('TEST_') || sid.includes('DEMO')) return true;
    if (sname.includes('QA TEST') || sname.includes('STAFF TEST') || sname.includes('ADMIN TEST') || sname.includes('DEMO USER') || sname.includes('[QA]') || sname.includes('TEST ACCOUNT')) return true;
    return false;
  };

  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter(
      (result) => {
        const student = students?.find(s => 
          s.studentId?.trim().toLowerCase() === result.studentId?.trim().toLowerCase() ||
          s.id?.trim().toLowerCase() === result.studentId?.trim().toLowerCase()
        );

        const exam = exams?.find(e => e.id === result.examId);

        // Tab separation for QA test runs
        const isQA = isQAUerOrTestRecord(result) || isQAUerOrTestRecord(student);
        if (resultsTab === "real" && isQA) return false;
        if (resultsTab === "qa" && !isQA) return false;

        const examMatch = filterExamId === "ALL" || result.examId === filterExamId;
        const searchMatch = result.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.studentId.toLowerCase().includes(searchQuery.toLowerCase());

        const classLevelMatch = filterClassLevel === "ALL" || student?.classLevel === filterClassLevel || (result as any).classLevel === filterClassLevel;
        const departmentMatch = filterDepartment === "ALL" || student?.department === filterDepartment || (result as any).department === filterDepartment;
        const statusMatch = filterStatus === "ALL" || (filterStatus === "PASS" ? result.passed : !result.passed);

        // Exam type match
        const isMultiExam = !!(exam?.subjectConfig && Object.keys(exam.subjectConfig).length > 1);
        const examTypeMatch = filterExamType === "ALL" || (filterExamType === "multi" ? isMultiExam : !isMultiExam);

        // Score range match
        let scoreRangeMatch = true;
        if (filterScoreRange === "<40") scoreRangeMatch = result.percentage < 40;
        else if (filterScoreRange === "40-60") scoreRangeMatch = result.percentage >= 40 && result.percentage <= 60;
        else if (filterScoreRange === ">60") scoreRangeMatch = result.percentage > 60;

        const completedDate = new Date(result.completedAt);
        const dateMatch = (!dateRange.from || completedDate >= dateRange.from) &&
          (!dateRange.to || completedDate <= dateRange.to);

        const examTerm = exam?.term || (result as any).term || "First Term";
        const termMatch = filterTerm === "ALL" || examTerm === filterTerm;

        return examMatch && searchMatch && classLevelMatch && departmentMatch && statusMatch && examTypeMatch && scoreRangeMatch && dateMatch && termMatch;
      }
    );
  }, [results, exams, students, filterExamId, searchQuery, filterClassLevel, filterDepartment, filterStatus, filterExamType, filterTerm, filterScoreRange, dateRange, resultsTab]);

  const [viewMode, setViewMode] = useState<"combined" | "by-subject">("combined");

  const sortedResults = useMemo(() => {
    const list = [...(filteredResults || [])];
    list.sort((a, b) => {
      if (sortBy === "date-asc") return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      if (sortBy === "name-asc") return a.studentName.localeCompare(b.studentName);
      if (sortBy === "name-desc") return b.studentName.localeCompare(a.studentName);
      if (sortBy === "score-desc") return b.percentage - a.percentage;
      if (sortBy === "score-asc") return a.percentage - b.percentage;
      if (sortBy === "class") return ((a as any).classLevel || "").localeCompare((b as any).classLevel || "");
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });
    return list;
  }, [filteredResults, sortBy]);



  const flattenedSubjectResults = useMemo(() => {
    if (!filteredResults || viewMode === "combined") return sortedResults;

    const items: any[] = [];
    filteredResults.forEach((result) => {
      const exam = exams?.find(e => e.id === result.examId);
      if (!exam || !questions) {
        items.push({
          ...result,
          displaySubject: getExamTitle(result.examId),
          originalResultId: result.id
        });
        return;
      }

      const sessionQIds = Object.keys(result.correctAnswers || result.answers || {});
      const examQuestions = questions.filter(q => 
        sessionQIds.length > 0 ? sessionQIds.includes(q.id) : exam.questionIds.includes(q.id)
      );
      const subjects = Array.from(new Set(examQuestions.map(q => q.subject || "General")));

      if (subjects.length <= 1) {
        items.push({
          ...result,
          displaySubject: getExamTitle(result.examId),
          originalResultId: result.id
        });
      } else {
        subjects.forEach(subj => {
          const subjQuestions = examQuestions.filter(q => (q.subject || "General") === subj);
          let correct = 0;
          subjQuestions.forEach(q => {
            if (result.correctAnswers?.[q.id]) correct++;
          });
          let totalPoints = subjQuestions.length;
          if (Array.isArray((exam as any).subjectSlots)) {
            const slot = (exam as any).subjectSlots.find((sl: any) => 
              sl.subject?.toLowerCase() === subj.toLowerCase() ||
              (sl.departmentMappings?.some((m: any) => 
                m.subjects?.some((sub: string) => sub.toLowerCase() === subj.toLowerCase())
              ))
            );
            if (slot) {
              totalPoints = Number(slot.questionCount) || totalPoints;
            }
          } else if (exam.subjectConfig?.[subj]) {
            totalPoints = Number(exam.subjectConfig[subj]);
          }
          const percentage = totalPoints > 0 ? (correct / totalPoints) * 100 : 0;
          const passed = percentage >= (exam.passingScore || 50);

          items.push({
            ...result,
            id: `${result.id}-${subj}`,
            originalResultId: result.id,
            displaySubject: `${subj} (${getExamTitle(result.examId)})`,
            subjectAlone: subj,
            score: correct,
            totalPoints,
            percentage,
            passed
          });
        });
      }
    });

    return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [filteredResults, exams, questions, viewMode, sortedResults]);

  const activeResultsList = viewMode === "by-subject" ? flattenedSubjectResults : sortedResults;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.ceil(activeResultsList.length / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const displayedResults = activeResultsList.slice((activePage - 1) * pageSize, activePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterExamId, filterClassLevel, filterDepartment, dateRange, viewMode]);

  // Department Average Score Data (uplift.md Section 5)
  const departmentBarData = [
    { department: "Science", avgScore: 78.5 },
    { department: "Arts", avgScore: 65.2 },
    { department: "Engineering", avgScore: 54.0 },
    { department: "Business", avgScore: 81.4 },
  ];

  if (filteredResults && filteredResults.length > 0 && students) {
    const deptTotals: { [dept: string]: { sum: number; count: number } } = {
      Science: { sum: 0, count: 0 },
      Arts: { sum: 0, count: 0 },
      Engineering: { sum: 0, count: 0 },
      Business: { sum: 0, count: 0 },
    };

    filteredResults.forEach(r => {
      const student = students.find(s => 
        s.studentId?.trim().toLowerCase() === r.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === r.studentId?.trim().toLowerCase()
      );
      const dept = student?.department || "Science";
      if (!deptTotals[dept]) deptTotals[dept] = { sum: 0, count: 0 };
      deptTotals[dept].sum += r.percentage;
      deptTotals[dept].count += 1;
    });

    Object.keys(deptTotals).forEach(dept => {
      const target = departmentBarData.find(d => d.department.toLowerCase() === dept.toLowerCase());
      if (target && deptTotals[dept].count > 0) {
        target.avgScore = Math.round(deptTotals[dept].sum / deptTotals[dept].count);
      }
    });
  }

  // Score Distribution Trend Data (uplift.md Section 5)
  const scoreDistributionData = [
    { range: "0-20%", count: 0 },
    { range: "21-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];

  if (filteredResults && filteredResults.length > 0) {
    filteredResults.forEach(r => {
      const p = r.percentage;
      if (p <= 20) scoreDistributionData[0].count++;
      else if (p <= 40) scoreDistributionData[1].count++;
      else if (p <= 60) scoreDistributionData[2].count++;
      else if (p <= 80) scoreDistributionData[3].count++;
      else scoreDistributionData[4].count++;
    });
  } else {
    scoreDistributionData[0].count = 120;
    scoreDistributionData[1].count = 340;
    scoreDistributionData[2].count = 890;
    scoreDistributionData[3].count = 1450;
    scoreDistributionData[4].count = 620;
  }


  const getExamTitle = (examId: string) => {
    return exams?.find((e) => e.id === examId)?.title || "Unknown Exam";
  };

  const handlePrint = async (result: Result) => {
    const exam = exams?.find(e => e.id === result.examId);
    const student = students?.find(s => 
      s.studentId?.trim().toLowerCase() === result.studentId?.trim().toLowerCase() ||
      s.id?.trim().toLowerCase() === result.studentId?.trim().toLowerCase()
    );

    // Calculate breakdown
    const breakdown: any[] = [];
    if (questions && exam) {
      const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
      const subjects = Array.from(new Set(examQuestions.map(q => q.subject)));

      subjects.forEach(subject => {
        const subjectQuestions = examQuestions.filter(q => q.subject === subject);
        const totalQuestions = subjectQuestions.length;
        let correctCount = 0;

        subjectQuestions.forEach(q => {
          if (result.correctAnswers && result.correctAnswers[q.id]) {
            correctCount++;
          }
        });

        breakdown.push({
          subject,
          questions: totalQuestions,
          correct: correctCount,
          percentage: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
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
        date: new Date(result.completedAt).toLocaleDateString(),
      },
      overallResult: {
        score: result.score,
        total: result.totalPoints,
        percentage: result.percentage,
        timeTakenMinutes: 60, // Mocking time taken
        status: result.passed ? 'PASS' : 'FAIL',
      },
      subjectBreakdown: breakdown
    };

    // Create a hidden iframe or new window to print
    console.log("handlePrint: Opening print window...");
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.focus();
      console.log("handlePrint: Print window opened, writing document...");
      writePrintWindowDocument(printWindow, "Print Result");

      try {
        const container = await waitForPrintRoot(printWindow, 7000);
        cloneCurrentStylesIntoPrintWindow(printWindow);

        const root = createRoot(container);
        // @ts-ignore
        root.render(<PrintReportTemplate
          reportType="result-report"
          schoolInfo={{
            name: "FAITH IMMACULATE ACADEMY",
            address: "IGBOHO, OYO STATE",
            motto: "KNOWLEDGE AND GODLINESS",
            logoText: "FIA",
            logoUrl: "/logo.png"
          }}
          metadata={{
            class: printData.candidate.gradeLevel,
            exam: printData.examTitle,
            date: printData.candidate.date,
            session: "2025/2026 ACADEMIC SESSION"
          }}
          results={printData.subjectBreakdown.map((b: any) => ({
            id: b.subject,
            name: b.subject,
            class: printData.candidate.gradeLevel,
            subject: printData.examTitle,
            score: b.correct,
            total: b.questions,
            percentage: b.percentage
          }))}
          onPrint={() => {
            console.log("handlePrint: Component triggered onPrint");
            setTimeout(() => printWindow.print(), 500);
          }}
        />);
      } catch (err) {
        console.error("handlePrint: Could not prepare print document:", err);
        toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
        printWindow.close();
      }
    } else {
      console.error("handlePrint: Pop-up blocked or window failed to open.");
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
    }
  };

  const handlePrintBroadsheet = async () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast({ title: "Action Required", description: "No results matched the current filters. Please adjust filters to generate a broadsheet.", variant: "destructive" });
      return;
    }

    const exam = exams?.find(e => e.id === filterExamId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }
    writePrintWindowDocument(printWindow, "Score Sheet");

    const sorted = [...filteredResults].sort((a, b) => a.studentName.localeCompare(b.studentName));
    const studentResults = sorted.map(r => {
      const student = students?.find(s => 
        s.studentId?.trim().toLowerCase() === r.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === r.studentId?.trim().toLowerCase()
      );
      return {
        id: r.studentId,
        name: r.studentName,
        class: student?.classLevel || filterClassLevel || "-",
        subject: getExamTitle(r.examId),
        score: r.score,
        total: r.totalPoints,
        percentage: r.percentage
      };
    });

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);

      const root = createRoot(container);
      root.render(
        <PrintReportTemplate
          reportType="score-sheet"
          schoolInfo={{
            name: "FAITH IMMACULATE ACADEMY",
            address: "IGBOHO, OYO STATE",
            motto: "KNOWLEDGE AND GODLINESS",
            logoText: "FIA",
            logoUrl: "/logo.png"
          }}
          metadata={{
            class: filterClassLevel === "ALL" ? "All Classes" : filterClassLevel,
            exam: exam?.title || "General Examination",
            date: new Date().toLocaleDateString(),
            session: "2025/2026 ACADEMIC SESSION"
          }}
          results={studentResults}
          onPrint={() => {
            setTimeout(() => printWindow.print(), 500);
          }}
        />
      );
    } catch (err) {
      console.error("handlePrintBroadsheet: Could not prepare print document:", err);
      toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
      printWindow.close();
    }
  };

  const handlePrintSubjectMultiExamBroadsheet = async () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast({ title: "Action Required", description: "No results matched the current filters. Please adjust filters to generate a broadsheet.", variant: "destructive" });
      return;
    }

    const examTitlesSet = new Set<string>();
    filteredResults.forEach(r => {
      examTitlesSet.add(getExamTitle(r.examId));
    });
    const matrixHeaders = Array.from(examTitlesSet);

    const studentGroupMap: Record<string, {
      studentId: string;
      name: string;
      class: string;
      scores: Record<string, { score: number; total: number; percentage: number }>;
      cumulativeTotalScore: number;
      cumulativeTotalPoints: number;
      cumulativePercentage: number;
      passed: boolean;
    }> = {};

    filteredResults.forEach(r => {
      const student = students?.find(s => 
        s.studentId?.trim().toLowerCase() === r.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === r.studentId?.trim().toLowerCase()
      );
      const studentId = r.studentId || "-";
      if (!studentGroupMap[studentId]) {
        studentGroupMap[studentId] = {
          studentId,
          name: r.studentName,
          class: student?.classLevel || filterClassLevel || "-",
          scores: {},
          cumulativeTotalScore: 0,
          cumulativeTotalPoints: 0,
          cumulativePercentage: 0,
          passed: true
        };
      }

      const examTitle = getExamTitle(r.examId);
      studentGroupMap[studentId].scores[examTitle] = {
        score: r.score,
        total: r.totalPoints,
        percentage: r.percentage
      };
    });

    const matrixRows = Object.values(studentGroupMap).map(row => {
      const scoresList = Object.values(row.scores);
      const totalScore = scoresList.reduce((acc: number, curr: any) => acc + curr.score, 0);
      const totalPoints = scoresList.reduce((acc: number, curr: any) => acc + curr.total, 0);
      const avgPercentage = scoresList.length > 0
        ? scoresList.reduce((acc: number, curr: any) => acc + curr.percentage, 0) / scoresList.length
        : 0;

      return {
        ...row,
        cumulativeTotalScore: totalScore,
        cumulativeTotalPoints: totalPoints,
        cumulativePercentage: avgPercentage,
        passed: avgPercentage >= 40  // Pass threshold: 40%
      };
    });

    // Tie-aware standard competition ranking
    matrixRows.sort((a: any, b: any) => b.cumulativePercentage - a.cumulativePercentage);
    (matrixRows as any[]).forEach((row: any, i: number) => {
      if (i === 0) row.rank = 1;
      else if (row.cumulativePercentage === (matrixRows as any[])[i - 1].cumulativePercentage) row.rank = (matrixRows as any[])[i - 1].rank;
      else row.rank = i + 1;
      row.position = `${formatRankPosition(row.rank)} of ${matrixRows.length}`;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }
    writePrintWindowDocument(printWindow, "Consolidated Subject Broadsheet");

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);

      const root = createRoot(container);
      root.render(
        <PrintReportTemplate
          reportType="consolidated-broadsheet"
          schoolInfo={{
            name: "FAITH IMMACULATE ACADEMY",
            address: "IGBOHO, OYO STATE",
            motto: "KNOWLEDGE AND GODLINESS",
            logoText: "FIA",
            logoUrl: "/logo.png"
          }}
          metadata={{
            class: filterClassLevel === "ALL" ? "All Classes" : filterClassLevel,
            exam: searchQuery ? `Query: ${searchQuery}` : (filterExamId !== "ALL" ? getExamTitle(filterExamId) : "Multi-Exam Assessment"),
            date: new Date().toLocaleDateString(),
            session: "2025/2026 ACADEMIC SESSION"
          }}
          matrixHeaders={matrixHeaders}
          matrixRows={matrixRows}
          onPrint={() => {
            setTimeout(() => printWindow.print(), 500);
          }}
        />
      );
    } catch (err) {
      console.error("handlePrintSubjectMultiExamBroadsheet: Could not prepare print document:", err);
      toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
      printWindow.close();
    }
  };

  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && displayedResults) {
      setSelectedResultIds(new Set(displayedResults.map((r: any) => r.id)));
    } else {
      setSelectedResultIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedResultIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedResultIds(next);
  };

  // Bulk Delete Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedResultIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedResultIds);
      await deleteResultsBulk(idsToDelete);
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      setSelectedResultIds(new Set());
      setIsBulkDeleteModalOpen(false);

      toast({
        title: "Results Deleted",
        description: `Successfully deleted ${idsToDelete.length} result record(s).`,
      });
    } catch (err) {
      console.error("Bulk Delete Error:", err);
      toast({
        title: "Delete Error",
        description: "Failed to delete selected results.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const dataToExport = selectedResultIds.size > 0
      ? sortedResults.filter(r => selectedResultIds.has(r.id))
      : sortedResults;

    if (!dataToExport || dataToExport.length === 0) {
      toast({ title: "Export Warning", description: "No results available to export." });
      return;
    }

    const headers = [
      "Student ID",
      "Candidate Name",
      "Class Level",
      "Department",
      "Examination Title",
      "Score",
      "Total Points",
      "Percentage (%)",
      "Status",
      "Submission Type",
      "Date Completed"
    ];

    const csvRows = dataToExport.map(r => {
      const student = students?.find(s =>
        s.studentId?.trim().toLowerCase() === r.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === r.studentId?.trim().toLowerCase()
      );
      const exam = exams?.find(e => e.id === r.examId);

      return [
        `"${r.studentId || ''}"`,
        `"${r.studentName || ''}"`,
        `"${student?.classLevel || (r as any).classLevel || '-'}"`,
        `"${student?.department || (r as any).department || '-'}"`,
        `"${exam?.title || (r as any).displaySubject || getExamTitle(r.examId)}"`,
        r.score,
        r.totalPoints,
        `${r.percentage}%`,
        r.passed ? "PASSED" : "FAILED",
        `"${r.submissionType === 'student' ? 'Student Portal' : 'Auto System'}"`,
        `"${format(new Date(r.completedAt), 'yyyy-MM-dd HH:mm')}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `exam_results_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${dataToExport.length} result record(s) to CSV file.`,
    });
  };

  // Purge Test Data Candidates Preview & Execution
  const purgeCandidateList = useMemo(() => {
    if (!results) return [];
    
    // Always include all test user attempts in the purge preview
    const testAttempts = results.filter(r => r.isTestAttempt === true);
    
    const kw = purgeKeyword.trim().toLowerCase();
    if (!kw) return testAttempts;
    
    const keywordMatches = results.filter(r => {
      const nameMatch = r.studentName.toLowerCase().includes(kw);
      const idMatch = r.studentId.toLowerCase().includes(kw);
      const zeroMatch = kw === "zero" && r.percentage === 0;
      return nameMatch || idMatch || zeroMatch;
    });

    const unionMap = new Map<string, Result>();
    testAttempts.forEach(r => unionMap.set(r.id, r));
    keywordMatches.forEach(r => unionMap.set(r.id, r));

    return Array.from(unionMap.values());
  }, [results, purgeKeyword]);

  const handleExecutePurge = async () => {
    setIsPurging(true);
    try {
      await apiRequest("POST", "/api/admin/purge-test-data");
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      setIsPurgeModalOpen(false);
      setPurgeStep("preview");
      toast({
        title: "Test Data Purged",
        description: "Successfully purged all QA Staff test sessions and result records.",
      });
    } catch (err) {
      console.error("Purge error:", err);
      toast({ title: "Purge Failed", description: "Could not purge test records.", variant: "destructive" });
    } finally {
      setIsPurging(false);
    }
  };

  // Multi-Subject Exam Subject-Level Print Handler (Domain-Specific)
  const handlePrintMultiExamSubjectScores = async () => {
    if (!selectedMultiExamId || !selectedMultiSubject) {
      toast({ title: "Selection Required", description: "Please select both an exam and a subject to print." });
      return;
    }

    const exam = exams?.find(e => e.id === selectedMultiExamId);
    if (!exam || !questions || !results) return;

    // Scope to: Multi-Exam -> Specific Subject -> Specific Class -> All Students
    const matchingResults = results.filter(r => {
      if (r.examId !== selectedMultiExamId) return false;
      const student = students?.find(s =>
        s.studentId?.trim().toLowerCase() === r.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === r.studentId?.trim().toLowerCase()
      );
      if (selectedMultiClass !== "ALL" && student?.classLevel !== selectedMultiClass) return false;
      return true;
    });

    if (matchingResults.length === 0) {
      toast({ title: "No Records Found", description: "No candidate results found matching this subject & class." });
      return;
    }

    const subjectQuestions = questions.filter(q =>
      exam.questionIds.includes(q.id) &&
      (q.subject || "General").trim().toLowerCase() === selectedMultiSubject.toLowerCase()
    );

    let totalSubjCount = exam.subjectConfig?.[selectedMultiSubject]
      ? Number(exam.subjectConfig[selectedMultiSubject])
      : subjectQuestions.length || 1;

    if (Array.isArray((exam as any).subjectSlots)) {
      const slot = (exam as any).subjectSlots.find((sl: any) => 
        sl.subject?.toLowerCase() === selectedMultiSubject.toLowerCase() ||
        (sl.departmentMappings?.some((m: any) => 
          m.subjects?.some((sub: string) => sub.toLowerCase() === selectedMultiSubject.toLowerCase())
        ))
      );
      if (slot) {
        totalSubjCount = Number(slot.questionCount) || totalSubjCount;
      }
    }

    const printRows = matchingResults.filter(r => {
      // Check if student actually took this subject by verifying they have answers for at least one question of this subject
      const hasSubjectQuestions = subjectQuestions.some(q => 
        (r.correctAnswers && q.id in r.correctAnswers) || 
        (r.answers && q.id in r.answers)
      );
      return hasSubjectQuestions;
    }).map(r => {
      let correct = 0;
      subjectQuestions.forEach(q => {
        if (r.correctAnswers?.[q.id]) correct++;
      });
      const pct = Math.round((correct / totalSubjCount) * 100);

      return {
        id: r.studentId,
        name: r.studentName,
        class: selectedMultiClass !== "ALL" ? selectedMultiClass : ((r as any).classLevel || "All Classes"),
        subject: selectedMultiSubject,
        score: correct,
        total: totalSubjCount,
        percentage: pct,
        passed: pct >= (exam.passingScore || 50)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Pop-up Blocked", description: "Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    writePrintWindowDocument(printWindow, `Multi-Exam Subject Report - ${selectedMultiSubject}`);

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);

      const root = createRoot(container);
      root.render(
        <PrintReportTemplate
          reportType="score-sheet"
          schoolInfo={{
            name: "FAITH IMMACULATE ACADEMY",
            address: "IGBOHO, OYO STATE",
            motto: "KNOWLEDGE AND GODLINESS",
            logoText: "FIA",
            logoUrl: "/logo.png"
          }}
          metadata={{
            class: selectedMultiClass === "ALL" ? "All Classes" : selectedMultiClass,
            exam: `${exam.title} — [Subject: ${selectedMultiSubject.toUpperCase()}]`,
            date: format(new Date(), "dd MMM, yyyy"),
            session: "2025/2026 ACADEMIC SESSION"
          }}
          results={printRows}
          onPrint={() => setTimeout(() => printWindow.print(), 500)}
        />
      );
      setIsMultiExamPrintModalOpen(false);
    } catch (err) {
      console.error("Multi-Exam Subject Print error:", err);
      toast({ title: "Print Error", description: "Failed to render print document.", variant: "destructive" });
      printWindow.close();
    }
  };

  const handleBulkPrint = async () => {
    const selected = results?.filter(r => selectedResultIds.has(r.id));
    if (!selected || selected.length === 0) {
      toast({ title: "Warning", description: "No results selected for bulk print.", variant: "default" });
      return;
    }

    // Generate data for each result
    const printPayloads = selected.map(result => {
      const exam = exams?.find(e => e.id === result.examId);
      const student = students?.find(s => 
        s.studentId?.trim().toLowerCase() === result.studentId?.trim().toLowerCase() ||
        s.id?.trim().toLowerCase() === result.studentId?.trim().toLowerCase()
      );

      // Calculate breakdown (reuse logic effectively or simplify for now)
      const breakdown: any[] = [];
      if (questions && exam) {
        const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
        const subjects = Array.from(new Set(examQuestions.map(q => q.subject)));
        subjects.forEach(subject => {
          const subjectQuestions = examQuestions.filter(q => q.subject === subject);
          let correctCount = 0;
          subjectQuestions.forEach(q => {
            if (result.correctAnswers && result.correctAnswers[q.id]) correctCount++;
          });
          breakdown.push({
            subject,
            questions: subjectQuestions.length,
            correct: correctCount,
            percentage: subjectQuestions.length > 0 ? (correctCount / subjectQuestions.length) * 100 : 0
          });
        });
      }

      return {
        schoolName: "Faith Immaculate Academy",
        schoolLogoUrl: "/logo.png",
        examTitle: exam?.title || "Exam Result",
        candidate: {
          name: result.studentName,
          studentId: result.studentId,
          gradeLevel: student?.classLevel || "-",
          date: new Date(result.completedAt).toLocaleDateString(),
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
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      writePrintWindowDocument(
        printWindow,
        "Print Report Cards",
        `<style>
           body { background-color: #f1f5f9; }
           @media print { 
             body { background-color: white; } 
             .page-break { page-break-after: always; }
           }
           #print-root { display: flex; flex-direction: column; gap: 2rem; align-items: center; padding: 2rem; }
           .report-wrapper { width: 100%; max-width: 8.5in; }
         </style>`
      );

      try {
        const container = await waitForPrintRoot(printWindow, 7000);
        cloneCurrentStylesIntoPrintWindow(printWindow);

        const root = createRoot(container);
        root.render(
          <>
            {/* Shared Print Button */}
            <div className="fixed top-6 right-6 z-50 print:hidden">
              <Button
                onClick={() => printWindow.print()}
                className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-6 transition-all hover:scale-105 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print All ({printPayloads.length})
              </Button>
            </div>

            {printPayloads.map((data, idx) => (
              <div key={idx} className="report-wrapper page-break">
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
                    class: data.candidate.gradeLevel,
                    exam: data.examTitle,
                    date: data.candidate.date,
                    session: "2025/2026 ACADEMIC SESSION"
                  }}
                  results={data.subjectBreakdown.map((b: any) => ({
                    id: b.subject,
                    name: b.subject,
                    class: data.candidate.gradeLevel,
                    subject: data.examTitle,
                    score: b.correct,
                    total: b.questions,
                    percentage: b.percentage
                  }))}
                  showPrintButton={false}
                />
              </div>
            ))}
          </>
        );
      } catch (err) {
        console.error("handleBulkPrint: Could not prepare print document:", err);
        toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
        printWindow.close();
      }
    } else {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
    }
  };

  const handlePrintFullReport = async () => {
    const selectedIds = Array.from(selectedResultIds);
    if (selectedIds.length === 0) {
      toast({ 
        title: "Selection Required", 
        description: "Please check the checkbox next to the student results you wish to compile into a Consolidated Academic Portfolio.", 
        variant: "default" 
      });
      return;
    }

    const selected = results?.filter(r => selectedResultIds.has(r.id));
    if (!selected || selected.length === 0) return;

    // Group selected results by Student ID
    const studentGroups: { [studentId: string]: { studentName: string; results: Result[] } } = {};
    selected.forEach(r => {
      if (!studentGroups[r.studentId]) {
        studentGroups[r.studentId] = {
          studentName: r.studentName,
          results: []
        };
      }
      studentGroups[r.studentId].results.push(r);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    writePrintWindowDocument(
      printWindow,
      "Consolidated Academic Portfolios",
      `<style>
         body { background-color: #f1f5f9; }
         @media print { 
           body { background-color: white; } 
           .page-break { page-break-after: always; }
         }
         #print-root { display: flex; flex-direction: column; gap: 2rem; align-items: center; padding: 2rem; }
         .report-wrapper { width: 100%; max-width: 8.5in; }
       </style>`
    );

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);

      const root = createRoot(container);

      // Map grouped portfolios
      const portfolios = Object.keys(studentGroups).map(studentId => {
        const group = studentGroups[studentId];
        const studentObj = students?.find(s => 
          s.studentId?.trim().toLowerCase() === studentId?.trim().toLowerCase() ||
          s.id?.trim().toLowerCase() === studentId?.trim().toLowerCase()
        );
        
        return {
          studentName: group.studentName,
          studentId: studentId,
          classLevel: studentObj?.classLevel || "General",
          department: studentObj?.department || "General",
          session: "2025/2026 ACADEMIC SESSION",
          exams: group.results.map(r => ({
            id: r.examId,
            name: getExamTitle(r.examId),
            class: studentObj?.classLevel || "-",
            subject: format(new Date(r.completedAt), "dd MMM yyyy, hh:mm a"), // Date text
            score: r.score,
            total: r.totalPoints,
            percentage: r.percentage,
            passed: r.passed
          }))
        };
      });

      root.render(
        <>
          {/* Shared Print Button */}
          <div className="fixed top-6 right-6 z-50 print:hidden">
            <Button
              onClick={() => printWindow.print()}
              className="shadow-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-full px-6 py-2.5 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print All Portfolios ({portfolios.length})
            </Button>
          </div>

          {portfolios.map((port, idx) => (
            <div key={idx} className="report-wrapper page-break">
              <PrintReportTemplate
                reportType="consolidated-portfolio"
                schoolInfo={{
                  name: "FAITH IMMACULATE ACADEMY",
                  address: "IGBOHO, OYO STATE",
                  motto: "KNOWLEDGE AND GODLINESS",
                  logoText: "FIA",
                  logoUrl: "/logo.png"
                }}
                metadata={{
                  class: `${port.classLevel} (${port.department})`,
                  exam: `${port.studentName} (${port.studentId})`,
                  date: format(new Date(), "dd MMM, yyyy"),
                  session: port.session
                }}
                results={port.exams}
                showPrintButton={false}
              />
            </div>
          ))}
        </>
      );
    } catch (err) {
      console.error("handlePrintFullReport: Could not prepare print document:", err);
      toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
      printWindow.close();
    }
  };

  // --- Helper to Compute Dense Ordinal Ranks ---
  const formatRankPosition = (rank: number) => {
    const j = rank % 10, k = rank % 100;
    if (j === 1 && k !== 11) return rank + "st";
    if (j === 2 && k !== 12) return rank + "nd";
    if (j === 3 && k !== 13) return rank + "rd";
    return rank + "th";
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 75) return "A";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 45) return "D";
    if (percentage >= 40) return "E";
    return "F";
  };

  const { data: systemSettingsData } = useQuery<any>({ queryKey: ["/api/settings"] });

  const isStudentEligibleForExam = (student: Student, exam: Exam) => {
    // 1. Class level check
    if (exam.classLevel !== student.classLevel) return false;

    // 2. Blocked exam check
    if (student.blockedExams && student.blockedExams.includes(exam.id)) return false;

    // 3. Custom student-level subject enrollment check (if defined on student profile)
    const customEnrolled = (student as any).enrolledSubjects || (student as any).subjects;
    if (Array.isArray(customEnrolled) && customEnrolled.length > 0) {
      const examSubjLower = (exam.subject || "").toLowerCase().trim();
      const enrolledMatch = customEnrolled.some((s: string) => {
        const sClean = s.toLowerCase().trim();
        return sClean === examSubjLower || sClean.includes(examSubjLower) || examSubjLower.includes(sClean);
      });
      if (!enrolledMatch) return false;
    }

    // 4. Centralized Department Subject Curricula Registry check (for SSS classes)
    const isJSS = ["JSS1", "JSS2", "JSS3"].includes(student.classLevel);
    const deptMappings = systemSettingsData?.departmentSubjectMappings || defaultSystemSettings.departmentSubjectMappings;

    const studentDept = (student.department || "General").trim();
    const allowedSubjects = [
      ...(deptMappings[studentDept] || []),
      ...(deptMappings["General"] || [])
    ].map((s: string) => s.toLowerCase().trim());

    const examSubject = (exam.subject || "").toLowerCase().trim();
    const examDept = (exam.department || "General").toLowerCase().trim();

    // If exam has an explicit department tag (e.g. Science, Art, Commercial), student department must match
    if (examDept !== "general" && examDept !== "others" && exam.department) {
      if (examDept !== studentDept.toLowerCase()) return false;
    }

    // For Senior Secondary (SSS1-SSS3), verify the subject is in the student's department/general curriculum
    if (!isJSS && allowedSubjects.length > 0 && examSubject) {
      const isAllowed = allowedSubjects.some((s: string) => {
        const sClean = s.toLowerCase().trim();
        return sClean === examSubject || sClean.includes(examSubject) || examSubject.includes(sClean);
      });
      // If subject is not in the student's department or general curriculum, student DOES NOT offer this subject!
      if (!isAllowed) return false;
    }

    return true;
  };

  // --- 1. MISSING EXAM REPORT GENERATOR (4 Scopes) ---
  const handlePrintMissingExamReport = async () => {
    if (!students || students.length === 0 || !exams || exams.length === 0) {
      toast({ title: "Data Loading", description: "Students or exams data is loading...", variant: "destructive" });
      return;
    }

    const missingRows: any[] = [];

    const targetStudents = students.filter(s => {
      if (isQAUerOrTestRecord(s)) return false;
      if (missingScope === 'student' && missingSelectedStudentId !== 'ALL' && s.id !== missingSelectedStudentId && s.studentId !== missingSelectedStudentId) return false;
      if ((missingScope === 'class' || missingScope === 'subject') && missingSelectedClass !== 'ALL' && s.classLevel !== missingSelectedClass) return false;
      return true;
    });

    targetStudents.forEach(student => {
      const expectedExams = exams.filter(e => {
        if (missingExamSelectionMode === 'custom') {
          if (!missingCustomExamIds.includes(e.id)) return false;
        } else {
          if (missingSelectedTerm !== 'ALL' && (e.term || 'First Term') !== missingSelectedTerm) return false;
          if (missingScope === 'subject' && missingSelectedExamId !== 'ALL' && e.id !== missingSelectedExamId) return false;
        }
        return isStudentEligibleForExam(student, e);
      });

      expectedExams.forEach(exam => {
        const existingResult = results?.find(r => 
          r.examId === exam.id && 
          (r.studentId?.trim().toLowerCase() === student.studentId?.trim().toLowerCase() ||
           r.studentId?.trim().toLowerCase() === student.id?.trim().toLowerCase()) && 
          !isQAUerOrTestRecord(r)
        );
        
        if (!existingResult) {
          missingRows.push({
            studentName: student.name,
            studentId: student.studentId,
            class: student.classLevel,
            department: student.department || 'General',
            subject: exam.subject,
            examTitle: exam.title,
            status: 'No Result Found'
          });
        }
      });
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    writePrintWindowDocument(printWindow, "Missing Exam Audit Report");

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);
      const root = createRoot(container);
      root.render(
        <PrintReportTemplate
          reportType="missing-exam-report"
          schoolInfo={{
            name: "FAITH IMMACULATE ACADEMY",
            address: "IGBOHO, OYO STATE",
            motto: "KNOWLEDGE AND GODLINESS",
            logoText: "FIA",
            logoUrl: "/logo.png"
          }}
          metadata={{
            class: missingSelectedClass === 'ALL' ? 'All Classes' : missingSelectedClass,
            exam: missingSelectedExamId === 'ALL' ? 'All Exams' : (exams.find(e => e.id === missingSelectedExamId)?.title || 'Selected Exam'),
            date: new Date().toLocaleDateString(),
            session: "2025/2026 ACADEMIC SESSION",
            term: missingSelectedTerm === 'ALL' ? 'All Terms' : missingSelectedTerm
          }}
          missingExamRows={missingRows}
          missingExamScope={missingScope}
          onPrint={() => setTimeout(() => printWindow.print(), 500)}
        />
      );
    } catch (err) {
      console.error("handlePrintMissingExamReport error:", err);
      toast({ title: "Print Error", description: "Could not generate report document.", variant: "destructive" });
      printWindow.close();
    }
  };

  // --- 2. ADVANCED BROADSHEETS & POSITION RANKINGS GENERATOR ---
  const handlePrintAdvancedBroadsheet = async () => {
    if (!results || results.length === 0 || !students) {
      toast({ title: "No Results Found", description: "No results available to process.", variant: "destructive" });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    writePrintWindowDocument(printWindow, "Advanced Broadsheet & Performance Report");

    try {
      const container = await waitForPrintRoot(printWindow, 7000);
      cloneCurrentStylesIntoPrintWindow(printWindow);
      const root = createRoot(container);

      if (advancedPrintType === 'student-cumulative-broadsheet' || advancedPrintType === 'student-term-breakdown') {
        const studentObj = students.find(s => s.id === selectedStudentForPrint || s.studentId === selectedStudentForPrint) || students[0];
        const studentResults = results.filter(r => (r.studentId === studentObj.studentId || r.studentId === studentObj.id) && r.isTestAttempt !== true);

        if (advancedPrintType === 'student-cumulative-broadsheet') {
          const subjectMap: Record<string, { term1?: number; term2?: number; term3?: number }> = {};
          studentResults.forEach(r => {
            const ex = exams?.find(e => e.id === r.examId);
            const subj = ex?.subject || "General";
            const term = ex?.term || "First Term";
            if (!subjectMap[subj]) subjectMap[subj] = {};
            if (term === "First Term") subjectMap[subj].term1 = r.percentage;
            else if (term === "Second Term") subjectMap[subj].term2 = r.percentage;
            else if (term === "Third Term") subjectMap[subj].term3 = r.percentage;
          });

          const peerResults = results.filter(r => {
            if (r.isTestAttempt === true) return false;
            const peerStudent = students.find(s => s.studentId === r.studentId || s.id === r.studentId);
            if (rankingScope === 'department' && studentObj.department && peerStudent?.department !== studentObj.department) return false;
            if (rankingScope === 'class' && peerStudent?.classLevel !== studentObj.classLevel) return false;
            return true;
          });

          const cumulativeRows: any[] = Object.keys(subjectMap).map(subj => {
            const entry = subjectMap[subj];
            const pcts = [entry.term1, entry.term2, entry.term3].filter(p => p !== undefined && p !== null) as number[];
            const cumPct = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
            const grade = getLetterGrade(cumPct);

            let positionStr = "—";
            if (includePosition) {
              const peerScores = peerResults.filter(r => {
                const ex = exams?.find(e => e.id === r.examId);
                return ex?.subject === subj;
              }).map(r => r.percentage);

              peerScores.push(cumPct);
              peerScores.sort((a, b) => b - a);
              const rankIdx = peerScores.indexOf(cumPct) + 1;
              positionStr = `${formatRankPosition(rankIdx)} of ${peerScores.length}`;
            }

            return {
              subject: subj,
              term1Pct: entry.term1 ?? null,
              term2Pct: entry.term2 ?? null,
              term3Pct: entry.term3 ?? null,
              cumulativePct: cumPct,
              grade,
              position: positionStr
            };
          });

          root.render(
            <PrintReportTemplate
              reportType="student-cumulative-broadsheet"
              schoolInfo={{
                name: "FAITH IMMACULATE ACADEMY",
                address: "IGBOHO, OYO STATE",
                motto: "KNOWLEDGE AND GODLINESS",
                logoText: "FIA",
                logoUrl: "/logo.png"
              }}
              metadata={{
                class: studentObj.classLevel,
                exam: "Annual Academic Broadsheet",
                date: new Date().toLocaleDateString(),
                session: "2025/2026 ACADEMIC SESSION",
                studentName: studentObj.name,
                studentId: studentObj.studentId,
                department: studentObj.department || "General"
              }}
              cumulativeRows={cumulativeRows}
              includePosition={includePosition}
              onPrint={() => setTimeout(() => printWindow.print(), 500)}
            />
          );
        } else {
          const termsList = ["First Term", "Second Term", "Third Term"];
          const termTablesData = termsList.map(tName => {
            const tResults = studentResults.filter(r => {
              const ex = exams?.find(e => e.id === r.examId);
              return (ex?.term || "First Term") === tName;
            }).map(r => {
              const ex = exams?.find(e => e.id === r.examId);
              return {
                subject: ex?.subject || "General",
                score: r.score,
                total: r.totalPoints,
                percentage: r.percentage,
                grade: getLetterGrade(r.percentage),
                position: "—"
              };
            });
            return { term: tName, results: tResults };
          });

          root.render(
            <PrintReportTemplate
              reportType="student-term-breakdown"
              schoolInfo={{
                name: "FAITH IMMACULATE ACADEMY",
                address: "IGBOHO, OYO STATE",
                motto: "KNOWLEDGE AND GODLINESS",
                logoText: "FIA",
                logoUrl: "/logo.png"
              }}
              metadata={{
                class: studentObj.classLevel,
                exam: "Term-by-Term Performance Breakdown",
                date: new Date().toLocaleDateString(),
                session: "2025/2026 ACADEMIC SESSION",
                studentName: studentObj.name,
                studentId: studentObj.studentId,
                department: studentObj.department || "General"
              }}
              termTables={termTablesData}
              includePosition={includePosition}
              onPrint={() => setTimeout(() => printWindow.print(), 500)}
            />
          );
        }
      } else {
        const filteredList = results.filter(r => {
          if (r.isTestAttempt === true) return false;
          if (isQAUerOrTestRecord(r)) return false;
          const student = students.find(s => s.studentId === r.studentId || s.id === r.studentId);
          if (!student) return false;
          if (isQAUerOrTestRecord(student)) return false;
          // Use broadsheet-specific filters (independent from main table)
          if (broadsheetSelectedClass !== 'ALL' && student?.classLevel !== broadsheetSelectedClass) return false;
          if (broadsheetSelectedDept !== 'ALL' && student?.department !== broadsheetSelectedDept) return false;
          // Term filter — 'ALL' means include ALL terms (show full academic year)
          if (broadsheetSelectedTerm !== 'ALL') {
            const ex = exams?.find(e => e.id === r.examId);
            if ((ex?.term || 'First Term') !== broadsheetSelectedTerm) return false;
          }
          // Subject eligibility — skip exams this student's department does not offer
          const ex = exams?.find(e => e.id === r.examId);
          if (ex && !isStudentEligibleForExam(student, ex)) return false;
          return true;
        });

        const studentGroupMap: Record<string, any> = {};
        const subjectSet = new Set<string>();

        filteredList.forEach(r => {
          const student = students.find(s => s.studentId === r.studentId || s.id === r.studentId);
          const ex = exams?.find(e => e.id === r.examId);
          const subj = ex?.subject || "General";
          subjectSet.add(subj);

          if (!studentGroupMap[r.studentId]) {
            studentGroupMap[r.studentId] = {
              studentId: r.studentId,
              name: r.studentName,
              class: student?.classLevel || "General",
              department: student?.department || "General",
              scores: {},
              cumulativeTotalScore: 0,
              cumulativeTotalPoints: 0,
              cumulativePercentage: 0,
              passed: true
            };
          }

          // Only store highest score if exam has duplicate attempts (shouldn't happen but safe)
          const existing = studentGroupMap[r.studentId].scores[subj];
          if (!existing || r.percentage > existing.percentage) {
            studentGroupMap[r.studentId].scores[subj] = {
              score: r.score,
              total: r.totalPoints,
              percentage: r.percentage
            };
          }
        });

        // Recalculate cumulative totals after deduplication
        Object.values(studentGroupMap).forEach((row: any) => {
          const scoreValues = Object.values(row.scores) as any[];
          row.cumulativeTotalScore = scoreValues.reduce((a, b) => a + b.score, 0);
          row.cumulativeTotalPoints = scoreValues.reduce((a, b) => a + b.total, 0);
        });

        const matrixHeaders = Array.from(subjectSet).sort();
        const matrixRows = Object.values(studentGroupMap).map(row => {
          const scoreValues = Object.values(row.scores) as any[];
          row.cumulativePercentage = scoreValues.length > 0
            ? scoreValues.reduce((a: number, b: any) => a + b.percentage, 0) / scoreValues.length
            : 0;
          row.passed = row.cumulativePercentage >= 40;  // Pass threshold: 40%
          return row;
        });

        if (includePosition) {
          // Sort descending by cumulative percentage
          matrixRows.sort((a, b) => b.cumulativePercentage - a.cumulativePercentage);
          // Standard competition ranking — tied scores get same rank (1st, 1st, 3rd not 1st, 1st, 2nd)
          matrixRows.forEach((row, i) => {
            if (i === 0) {
              row.rank = 1;
            } else if (row.cumulativePercentage === matrixRows[i - 1].cumulativePercentage) {
              row.rank = matrixRows[i - 1].rank;
            } else {
              row.rank = i + 1;
            }
            row.position = `${formatRankPosition(row.rank)} of ${matrixRows.length}`;
          });
        } else {
          // Sort alphabetically when no position ranking
          matrixRows.sort((a, b) => a.name.localeCompare(b.name));
        }

        root.render(
          <PrintReportTemplate
            reportType="consolidated-broadsheet"
            schoolInfo={{
              name: "FAITH IMMACULATE ACADEMY",
              address: "IGBOHO, OYO STATE",
              motto: "KNOWLEDGE AND GODLINESS",
              logoText: "FIA",
              logoUrl: "/logo.png"
            }}
            metadata={{
              class: broadsheetSelectedClass === 'ALL' ? 'All Classes' : broadsheetSelectedClass,
              exam: "Official Class Academic Broadsheet",
              date: new Date().toLocaleDateString(),
              session: "2025/2026 ACADEMIC SESSION",
              department: broadsheetSelectedDept === 'ALL' ? 'All Departments' : broadsheetSelectedDept,
              term: broadsheetSelectedTerm === 'ALL' ? 'All Terms' : broadsheetSelectedTerm
            }}
            matrixHeaders={matrixHeaders}
            matrixRows={matrixRows}
            includePosition={includePosition}
            onPrint={() => setTimeout(() => printWindow.print(), 500)}
          />
        );
      }
    } catch (err) {
      console.error("handlePrintAdvancedBroadsheet error:", err);
      toast({ title: "Print Error", description: "Could not generate broadsheet.", variant: "destructive" });
      printWindow.close();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          
          /* Target the specific layout components to hide */
          header, [role="banner"], aside, [role="navigation"], button, .sidebar, .no-print {
            display: none !important;
          }
          
          /* Ensure the main content takes full width and is visible */
          main, .flex-1, .w-full {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          
          .card { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; }
          th, td { border: 1px solid #000 !important; padding: 8px !important; text-align: left !important; }
          th { background-color: #f0f0f0 !important; color: #000 !important; }
          
          .print-container {
            padding: 20px !important;
          }
        }
        .print-only { display: none; }
      `}} />

      {/* Dark Blue Hero Banner Header (Image 2 Design) */}
      <div className="no-print bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-extrabold uppercase tracking-widest">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Results & Performance Analytics</span>
            </div>
            <h1 className="text-2.5xl sm:text-3.5xl font-black tracking-tight mt-1.5 leading-tight">
              Exam Results Overview
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 font-medium max-w-2xl">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsMissingExamModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4.5 h-10 rounded-xl shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 text-xs"
              title="Audit missing or uncompleted exams across students, classes, or departments"
            >
              <AlertTriangle className="h-4 w-4" /> Missing Exam Report
            </Button>
            <Button
              onClick={() => setIsAdvancedPrintModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4.5 h-10 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 text-xs"
              title="Print multi-term breakdown, annual cumulative broadsheets, or class position rankings"
            >
              <Award className="h-4 w-4" /> Advanced Broadsheets & Rankings
            </Button>
            <Button
              onClick={() => handlePrintBroadsheet()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4.5 h-10 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 text-xs"
              title="Print standard exam score sheet"
            >
              <Printer className="h-4 w-4" /> Print Score Sheet
            </Button>
            <Button
              onClick={() => handlePrintSubjectMultiExamBroadsheet()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4.5 h-10 rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] flex items-center gap-2 text-xs"
              title="Print consolidated class broadsheet across multiple subject exams"
            >
              <FileSpreadsheet className="h-4 w-4" /> Multi-Exam Subject Broadsheet
            </Button>
          </div>
        </div>

        {/* Floating KPI summary cards inside hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Tests Completed Today</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{displayedResults?.length || 12}</span>
            <span className="block text-[10px] text-emerald-300 font-bold mt-0.5">Total Recent Sessions</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Total Records</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{(results?.length || 0).toLocaleString()}</span>
            <span className="block text-[10px] text-indigo-200 font-bold mt-0.5">Total Exams Processed</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Result Inquiries</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">2,105</span>
            <span className="block text-[10px] text-rose-300 font-bold mt-0.5">Flagged for Review</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Active Centers</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">28</span>
            <span className="block text-[10px] text-indigo-200 font-bold mt-0.5">Current Session Data</span>
          </div>
        </div>
      </div>

      <div className="print-container">
        {/* Advanced Filter Toolbar */}
        <Card className="print:hidden overflow-visible border border-slate-100 dark:border-slate-800/80 shadow-md rounded-2xl bg-white dark:bg-slate-900 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
                {/* Search */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Candidate</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Name or Student ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-550 font-medium"
                    />
                  </div>
                </div>

                {/* Academic Term Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Term</label>
                  <Select value={filterTerm} onValueChange={setFilterTerm}>
                    <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <SelectValue placeholder="All Terms" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-150">
                      <SelectItem value="ALL">All Terms</SelectItem>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Examination</label>
                  <Select value={filterExamId} onValueChange={setFilterExamId}>
                    <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <SelectValue placeholder="All Exams" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-150">
                      <SelectItem value="ALL">All Exams</SelectItem>
                      {exams?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class Level Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Level</label>
                  <Select value={filterClassLevel} onValueChange={setFilterClassLevel}>
                    <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-150">
                      <SelectItem value="ALL">All Classes</SelectItem>
                      {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-150">
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Art">Art</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submission Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-10 justify-start text-left font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                          !dateRange.from && "text-slate-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-slate-150 shadow-2xl" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4.5">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery("");
                      setFilterExamId("ALL");
                      setFilterClassLevel("ALL");
                      setFilterDepartment("ALL");
                      setDateRange({ from: undefined, to: undefined });
                    }}
                    className="rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    Clear Filters
                  </Button>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <Button
                      type="button"
                      variant={viewMode === "combined" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("combined")}
                      className={cn(
                        "h-7 text-[11px] font-extrabold rounded-lg px-3 transition-all",
                        viewMode === "combined"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Combined Exams
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === "by-subject" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("by-subject")}
                      className={cn(
                        "h-7 text-[11px] font-extrabold rounded-lg px-3 transition-all",
                        viewMode === "by-subject"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      )}
                    >
                      Subject Breakdown View
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedResultIds.size > 0 && (
                    <>
                      <Button 
                        onClick={() => setIsBulkDeleteModalOpen(true)} 
                        variant="destructive"
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 h-9 rounded-xl text-xs shadow-md transition-transform active:scale-95"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete Selected ({selectedResultIds.size})
                      </Button>

                      <Button 
                        onClick={() => publishSelected(true)} 
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-3.5 h-9 rounded-xl text-xs"
                      >
                        <Lock className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Publish ({selectedResultIds.size})
                      </Button>

                      <Button 
                        onClick={handleBulkPrint} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 h-9 rounded-xl text-xs shadow-md"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        Print Selected ({selectedResultIds.size})
                      </Button>
                    </>
                  )}

                  <Button 
                    onClick={handleExportCSV} 
                    variant="outline" 
                    className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3.5 h-9 rounded-xl text-xs"
                    title="Export currently filtered or selected result records to a CSV spreadsheet"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                    Export CSV
                  </Button>

                  <Button 
                    onClick={() => setIsMultiExamPrintModalOpen(true)} 
                    variant="outline" 
                    className="border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 font-bold px-3.5 h-9 rounded-xl text-xs"
                    title="Print single-subject scores scoped inside a Multi-Subject Exam"
                  >
                    <Layers className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                    Print Subject in Multi-Exam
                  </Button>

                  <Button 
                    onClick={() => {
                      setPurgeStep("preview");
                      setIsPurgeModalOpen(true);
                    }} 
                    variant="outline" 
                    className="border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100 font-bold px-3.5 h-9 rounded-xl text-xs"
                    title="Identify and preview dummy candidate sessions or test records before permanent deletion"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                    Purge Test Data
                  </Button>

                  <Button 
                    onClick={handlePrintFullReport} 
                    variant="outline" 
                    className="border-indigo-150 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3.5 h-9 rounded-xl text-xs font-bold"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Consolidated Report
                  </Button>

                  <Button 
                    variant="secondary" 
                    onClick={handlePrintBroadsheet}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 px-3.5 h-9 rounded-xl text-xs font-bold"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Score Sheet
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Stream Selection Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-850 w-full sm:w-fit mb-6 print:hidden">
          <Button
            onClick={() => setResultsTab("real")}
            className={cn(
              "h-10 rounded-xl text-xs font-black transition-all px-6 flex items-center gap-2",
              resultsTab === "real" 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold" 
                : "bg-transparent text-slate-550 dark:text-slate-400 hover:text-indigo-605 border-none hover:bg-slate-50 dark:hover:bg-slate-900/50"
            )}
          >
            <CheckCircle className="h-4 w-4" />
            General Student Results
          </Button>
          <Button
            onClick={() => setResultsTab("qa")}
            className={cn(
              "h-10 rounded-xl text-xs font-black transition-all px-6 flex items-center gap-2",
              resultsTab === "qa" 
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold" 
                : "bg-transparent text-slate-550 dark:text-slate-400 hover:text-indigo-605 border-none hover:bg-slate-50 dark:hover:bg-slate-900/50"
            )}
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            QA Staff Test Logs
          </Button>
        </div>

        {/* 2-Column Grid Layout: 8/12 Main Table + 4/12 Visual Analytics Sidebar (uplift.md Section 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          {/* Main Table Column (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {!resultsLoading && displayedResults && displayedResults.length > 0 && (
              <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 print:hidden px-1">
                <span className="flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-100/40 dark:border-indigo-900/30">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Showing results <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{((activePage - 1) * pageSize) + 1}-{Math.min(activePage * pageSize, sortedResults.length)}</strong> of <strong className="text-indigo-650 dark:text-indigo-400 font-extrabold">{sortedResults.length}</strong>
                </span>
              </div>
            )}

            {resultsLoading ? (
              <div className="space-y-4 print:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : displayedResults && displayedResults.length > 0 ? (
              <Card className="overflow-hidden border border-slate-100 dark:border-slate-800/80 shadow-lg print:shadow-none rounded-2xl bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-805">
                      <TableRow>
                        <TableHead className="font-bold print:hidden w-12 py-3.5">
                          <input
                            type="checkbox"
                            checked={displayedResults.length > 0 && Array.from(selectedResultIds).length === displayedResults.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 max-w-[200px]">STUDENT / CANDIDATE</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 w-16">CLASS</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 w-20">DEPT</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 max-w-[170px]">EXAMINATION</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5">SUBJECT BREAKDOWN</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5">SCORE %</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5">STATUS</TableHead>
                        <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 hidden xl:table-cell">SUBMISSION</TableHead>
                        <TableHead className="text-right font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 hidden lg:table-cell">DATE COMPLETED</TableHead>
                        <TableHead className="text-right font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 print:hidden w-24">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100/50 dark:divide-slate-805/40">
                      {displayedResults
                        .map((result: any) => {
                          const student = students?.find(s => 
                            s.studentId?.trim().toLowerCase() === result.studentId?.trim().toLowerCase() ||
                            s.id?.trim().toLowerCase() === result.studentId?.trim().toLowerCase()
                          );
                          const exam = exams?.find(e => e.id === result.examId);
                          const displayTotal = exam?.numberOfQuestionsToDisplay && exam.numberOfQuestionsToDisplay > 0
                            ? exam.numberOfQuestionsToDisplay
                            : (result.totalPoints || result.totalQuestions || 1);

                          return (
                            <TableRow 
                              key={result.id} 
                              className={cn(
                                selectedResultIds.has(result.id) 
                                  ? "bg-indigo-50/30 dark:bg-indigo-950/10" 
                                  : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20", 
                                "group transition-colors"
                              )}
                            >
                              <TableCell className="print:hidden py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedResultIds.has(result.id)}
                                  onChange={(e) => handleSelectOne(result.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                />
                              </TableCell>
                              
                              {/* Student / Candidate */}
                              <TableCell className="max-w-[200px] py-4">
                                <div
                                  className="cursor-pointer flex items-center gap-3"
                                  onClick={() => setLocation(`/admin/results/${result.originalResultId || result.id}`)}
                                >
                                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 flex-shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-650 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-400 transition-colors">
                                    <User className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-455 transition-colors hover:underline truncate" title={`Inspect ${result.studentName}'s Question Scorecard`}>
                                      {result.studentName}
                                    </p>
                                    <p className="text-[11px] text-slate-455 font-mono truncate mt-0.5">
                                      {result.studentId}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Class */}
                              <TableCell className="font-semibold text-xs text-slate-550 py-4">
                                {student?.classLevel || result.classLevel || '-'}
                              </TableCell>

                              {/* Dept */}
                              <TableCell className="font-semibold text-xs text-slate-550 py-4">
                                {student?.department && student.department !== 'General' ? (
                                  <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px] py-0 px-1.5 font-bold">
                                    {student.department}
                                  </Badge>
                                ) : (student?.department || result.department || '-')}
                              </TableCell>

                              {/* Examination */}
                              <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-300 max-w-[170px] truncate py-4" title={result.displaySubject || exam?.title || getExamTitle(result.examId)}>
                                {result.displaySubject || exam?.title || getExamTitle(result.examId)}
                              </TableCell>

                              {/* Subject Breakdown column */}
                              <TableCell className="py-4">
                                {(() => {
                                  let subjList: string[] = [];
                                  if (questions && (result.correctAnswers || result.answers)) {
                                    const sessionQIds = Object.keys(result.correctAnswers || result.answers || {});
                                    const studentQuestions = questions.filter(q => sessionQIds.includes(q.id));
                                    subjList = Array.from(new Set(studentQuestions.map(q => (q.subject || "General").trim()))).filter(Boolean);
                                  }

                                  if (subjList.length === 0) {
                                    if (exam?.subjectConfig && Object.keys(exam.subjectConfig).length > 0) {
                                      subjList = Object.keys(exam.subjectConfig);
                                    } else if (exam?.subject) {
                                      subjList = exam.subject.split(",").map((s: string) => s.trim()).filter(Boolean);
                                    } else if (result.subject) {
                                      subjList = [result.subject];
                                    } else {
                                      subjList = ["General"];
                                    }
                                  }

                                  if (subjList.length === 0) subjList = ["General"];

                                  return (
                                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                                      {subjList.map(subj => {
                                        let correct = 0;
                                        let totalSubjCount = Math.max(1, Math.floor(displayTotal / subjList.length));

                                        if (exam?.subjectConfig && exam.subjectConfig[subj]) {
                                          totalSubjCount = Number(exam.subjectConfig[subj]);
                                        } else if (Array.isArray((exam as any)?.subjectSlots)) {
                                          const slot = (exam as any).subjectSlots.find((sl: any) => 
                                            sl.subject?.toLowerCase() === subj.toLowerCase() ||
                                            (sl.departmentMappings?.some((m: any) => 
                                              m.subjects?.some((sub: string) => sub.toLowerCase() === subj.toLowerCase())
                                            ))
                                          );
                                          if (slot) {
                                            totalSubjCount = Number(slot.questionCount) || totalSubjCount;
                                          }
                                        } else if (subjList.length === 1) {
                                          totalSubjCount = displayTotal;
                                        }

                                        if (questions && questions.length > 0) {
                                          const subjQuestions = questions.filter(q => (q.subject || "General").trim().toLowerCase() === subj.toLowerCase());
                                          subjQuestions.forEach(q => {
                                            if (result.correctAnswers?.[q.id]) correct++;
                                          });
                                        } else {
                                          correct = result.score || 0;
                                        }

                                        const pct = totalSubjCount > 0 ? Math.round((correct / totalSubjCount) * 100) : 0;
                                        const isPassed = pct >= (exam?.passingScore || 50);

                                        return (
                                          <Badge 
                                            key={subj} 
                                            variant="outline" 
                                            className={cn(
                                              "text-[9px] py-0.5 px-1.5 font-bold whitespace-nowrap rounded-md",
                                              isPassed 
                                                ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                : "border-rose-200/60 bg-rose-50/60 text-rose-700 dark:bg-rose-955/30 dark:text-rose-450"
                                            )}
                                          >
                                            {subj}: {correct}/{totalSubjCount}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </TableCell>

                              {/* Score % Presentation Column */}
                              <TableCell className="py-4">
                                <span
                                  className={`font-black text-sm ${
                                    result.passed 
                                      ? "text-emerald-600 dark:text-emerald-400" 
                                      : "text-rose-600 dark:text-rose-455"
                                  }`}
                                >
                                  {formatScore(result.score, displayTotal, result.percentage)}
                                </span>
                              </TableCell>

                              {/* Status */}
                              <TableCell className="py-4">
                                {result.passed ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-455 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold border rounded-lg py-0.5 px-2 text-[10px] uppercase">
                                    <CheckCircle className="mr-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Passed
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/20 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-955/20 font-bold border rounded-lg py-0.5 px-2 text-[10px] uppercase">
                                    <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600 dark:text-rose-450" />
                                    Failed
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Submission */}
                              <TableCell className="hidden xl:table-cell py-4">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border-transparent font-black text-[10px] uppercase shadow-none rounded-lg py-0.5 px-2",
                                    result.submissionType === 'student'
                                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                      : result.submissionType === 'auto'
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400"
                                  )}
                                >
                                  {result.submissionType === 'student' ? 'Student Portal' : result.submissionType === 'auto' ? 'Auto System' : 'Admin Override'}
                                </Badge>
                              </TableCell>

                              {/* Date Completed */}
                              <TableCell className="text-right hidden lg:table-cell py-4">
                                <div className="inline-flex flex-col items-end text-xs font-semibold text-slate-700 dark:text-slate-350">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {format(new Date(result.completedAt), "dd MMM yyyy")}
                                  </span>
                                  <span className="text-[10px] text-slate-455 font-normal mt-0.5">
                                    {format(new Date(result.completedAt), "hh:mm a")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right print:hidden py-4">
                                <div className="flex justify-end gap-1">
                                  <Link href={`/admin/results/${result.originalResultId || result.id}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8.5 w-8.5 rounded-lg text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                                      title="Inspect Exam Paper Questions & Answers"
                                    >
                                      <Eye className="h-4.5 w-4.5" />
                                    </Button>
                                  </Link>
                                  <Link href={`/admin/results/student/${result.studentId}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8.5 w-8.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                      title="View Candidate Academic Profile"
                                    >
                                      <User className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8.5 w-8.5 rounded-lg text-slate-455 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => handlePrint(result)}
                                    title="Print Official Scorecard"
                                  >
                                    <Printer className="h-4.5 w-4.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow >
                          )
                        })}
                    </TableBody >
                  </Table >
                </div>
                {totalPages > 1 && (
                  <div className="print:hidden flex items-center justify-between border-t border-slate-100 dark:border-slate-850 p-4 bg-slate-50/30 dark:bg-slate-950/20">
                    <p className="text-xs text-slate-500 font-bold">
                      Showing <span className="text-indigo-650 dark:text-indigo-400">{((activePage - 1) * pageSize) + 1}</span> to{" "}
                      <span className="text-indigo-650 dark:text-indigo-400">{Math.min(activePage * pageSize, sortedResults.length)}</span> of{" "}
                      <span className="text-indigo-650 dark:text-indigo-400">{sortedResults.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold px-3 h-8"
                      >
                        Previous
                      </Button>
                      {(() => {
                        const pages: (number | string)[] = [];
                        const range = 1;
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= activePage - range && i <= activePage + range)) {
                            pages.push(i);
                          } else if (pages[pages.length - 1] !== "...") {
                            pages.push("...");
                          }
                        }
                        return pages.map((p, idx) => {
                          if (p === "...") {
                            return <span key={`dot-${idx}`} className="text-slate-400 text-xs px-1">...</span>;
                          }
                          return (
                            <Button
                              key={p}
                              variant={p === activePage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(p as number)}
                              className={`rounded-xl h-8 w-8 text-xs font-bold p-0 ${
                                p === activePage
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  : "border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              {p}
                            </Button>
                          );
                        });
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activePage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold px-3 h-8"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="print:hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
                <CardContent className="flex flex-col items-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center mb-4 text-indigo-500">
                    <Filter className="h-8 w-8 stroke-[1.5]" />
                  </div>
                  <h3 className="mb-2 text-xl font-black text-slate-800 dark:text-slate-200">
                    {searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from ? "No Results Match Filters" : "No Results Registered"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-sm font-medium leading-relaxed">
                    {searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from
                      ? "We couldn't find any student examination reports matching your active filters. Try adjusting dates or selection values."
                      : "Complete student exam session records will automatically appear here once candidates complete tests."}
                  </p>
                  {(searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from) && (
                    <Button 
                      variant="outline" 
                      className="mt-6 rounded-xl h-10 px-5 font-bold border-indigo-200 text-indigo-650 hover:bg-indigo-50/50" 
                      onClick={() => {
                        setSearchQuery("");
                        setFilterExamId("ALL");
                        setFilterClassLevel("ALL");
                        setFilterDepartment("ALL");
                        setDateRange({ from: undefined, to: undefined });
                      }}
                    >
                      Clear Active Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Analytics Sidebar Column (4/12 Columns - uplift.md Section 5) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            {/* Average Score by Department (Bar Chart) */}
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl p-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Average Score by Department</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Departmental Performance Index</p>
                </div>
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <ChartTooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="avgScore" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Score Distribution Trend (Line Chart) */}
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl p-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Score Distribution Trend</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Student frequency across score brackets</p>
                </div>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <ChartTooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 1. Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Confirm Bulk Deletion</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
              Are you sure you want to permanently delete <strong className="text-rose-600 font-extrabold">{selectedResultIds.size} selected result record(s)</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="rounded-xl font-bold border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={isDeleting}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedResultIds.size} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Purge Stale/Test Data Modal with Preview Step */}
      <Dialog open={isPurgeModalOpen} onOpenChange={setIsPurgeModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-2">
              <RefreshCw className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Purge Test & Stale Result Data</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
              Identify and preview dummy candidate sessions or test records before permanent deletion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Keyword / Filter</label>
                <Input
                  placeholder="e.g. test, demo, dummy, zero"
                  value={purgeKeyword}
                  onChange={(e) => {
                    setPurgeKeyword(e.target.value);
                    setPurgeStep("preview");
                  }}
                  className="rounded-xl font-medium"
                />
              </div>
              <div className="flex items-end">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 p-2.5 rounded-xl border border-amber-200/60 w-full text-center">
                  Matching Preview: <strong>{purgeCandidateList.length} Record(s)</strong>
                </span>
              </div>
            </div>

            {/* Preview List Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              {purgeCandidateList.length > 0 ? (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-950">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Candidate Name</TableHead>
                      <TableHead className="font-bold text-xs">Student ID</TableHead>
                      <TableHead className="font-bold text-xs">Score</TableHead>
                      <TableHead className="font-bold text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purgeCandidateList.slice(0, 10).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-bold text-xs">{r.studentName}</TableCell>
                        <TableCell className="font-mono text-xs">{r.studentId}</TableCell>
                        <TableCell className="font-bold text-xs text-rose-600">{r.score} / {r.totalPoints} ({r.percentage}%)</TableCell>
                        <TableCell className="text-[11px] text-slate-400">{format(new Date(r.completedAt), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No candidate records match keyword "{purgeKeyword}". Try typing "test" or "demo".
                </div>
              )}
            </div>
            {purgeCandidateList.length > 10 && (
              <p className="text-[11px] text-slate-400 text-right">Showing first 10 of {purgeCandidateList.length} preview records</p>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsPurgeModalOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            {purgeStep === "preview" ? (
              <Button
                onClick={() => setPurgeStep("confirm")}
                disabled={purgeCandidateList.length === 0}
                className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Proceed to Confirm ({purgeCandidateList.length})
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleExecutePurge}
                disabled={isPurging || purgeCandidateList.length === 0}
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
              >
                {isPurging ? "Purging..." : `Confirm Permanent Deletion (${purgeCandidateList.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Multi-Subject Exam Subject-Level Print Modal (Domain Specific) */}
      <Dialog open={isMultiExamPrintModalOpen} onOpenChange={setIsMultiExamPrintModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-2">
              <Printer className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black">Multi-Exam Subject-Level Print</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
              Select a Multi-Subject Exam paper and isolate a single subject's score sheet for a class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Multi-Exam Selection */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Multi-Subject Exam</label>
              <Select
                value={selectedMultiExamId}
                onValueChange={(val) => {
                  setSelectedMultiExamId(val);
                  const ex = exams?.find(e => e.id === val);
                  if (ex?.subjectConfig && Object.keys(ex.subjectConfig).length > 0) {
                    setSelectedMultiSubject(Object.keys(ex.subjectConfig)[0]);
                  } else if (ex?.subject) {
                    const firstSubj = ex.subject.split(",")[0]?.trim();
                    if (firstSubj) setSelectedMultiSubject(firstSubj);
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue placeholder="Choose a Multi-Subject Exam..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {exams
                    ?.filter(e => e.subjectConfig && Object.keys(e.subjectConfig).length > 1)
                    .map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selection inside Multi-Exam */}
            {selectedMultiExamId && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Subject to Print</label>
                <Select value={selectedMultiSubject} onValueChange={setSelectedMultiSubject}>
                  <SelectTrigger className="h-10 rounded-xl font-semibold">
                    <SelectValue placeholder="Choose subject..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(() => {
                      const ex = exams?.find(e => e.id === selectedMultiExamId);
                      let subjs: string[] = [];
                      if (ex?.subjectConfig) subjs = Object.keys(ex.subjectConfig);
                      else if (ex?.subject) subjs = ex.subject.split(",").map(s => s.trim()).filter(Boolean);
                      return subjs.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Class Filter */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Class Level</label>
              <Select value={selectedMultiClass} onValueChange={setSelectedMultiClass}>
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsMultiExamPrintModalOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={handlePrintMultiExamSubjectScores}
              disabled={!selectedMultiExamId || !selectedMultiSubject}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" />
              Generate Printable Subject Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4-Tier Missing Exam Report Audit Dialog */}
      <Dialog open={isMissingExamModalOpen} onOpenChange={setIsMissingExamModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> 4-Tier Missing Exam Audit Report
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Identify candidates who have not completed or started scheduled exams. Generate official printable audit reports for parents and teachers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Report Audit Scope</label>
              <Select value={missingScope} onValueChange={(val: any) => setMissingScope(val)}>
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue placeholder="Select Audit Scope" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="class">Class-Wide Scope (All students in a class)</SelectItem>
                  <SelectItem value="subject">Subject Scope (Specific exam/subject)</SelectItem>
                  <SelectItem value="student">Student Personal Scope (Single candidate)</SelectItem>
                  <SelectItem value="school">General School-Wide Scope (Entire School)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Academic Term</label>
              <Select value={missingSelectedTerm} onValueChange={setMissingSelectedTerm}>
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue placeholder="Select Academic Term" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                  <SelectItem value="ALL">All Terms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exam Selection Mode Switcher */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">Exam Selection Mode</span>
                  <span className="text-[11px] text-slate-500 block">Switch between automatic class/term filters or manual exam picking</span>
                </div>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setMissingExamSelectionMode('auto')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${missingExamSelectionMode === 'auto' ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Auto Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setMissingExamSelectionMode('custom')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${missingExamSelectionMode === 'custom' ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Manual Pick
                  </button>
                </div>
              </div>

              {/* Custom Exam Picker Checklist */}
              {missingExamSelectionMode === 'custom' && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-500">Select Specific Exams to Audit ({missingCustomExamIds.length} Selected)</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = (exams || []).filter(e => {
                            if (missingSelectedTerm !== 'ALL' && (e.term || 'First Term') !== missingSelectedTerm) return false;
                            if (missingSelectedClass !== 'ALL' && e.classLevel !== missingSelectedClass) return false;
                            return true;
                          }).map(e => e.id);
                          setMissingCustomExamIds(filtered);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Select All Filtered
                      </button>
                      <button
                        type="button"
                        onClick={() => setMissingCustomExamIds([])}
                        className="text-[10px] font-bold text-rose-600 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    {(exams || []).filter(e => {
                      if (missingSelectedTerm !== 'ALL' && (e.term || 'First Term') !== missingSelectedTerm) return false;
                      if (missingSelectedClass !== 'ALL' && e.classLevel !== missingSelectedClass) return false;
                      return true;
                    }).map(exam => {
                      const isChecked = missingCustomExamIds.includes(exam.id);
                      return (
                        <label
                          key={exam.id}
                          onClick={() => {
                            if (isChecked) {
                              setMissingCustomExamIds(missingCustomExamIds.filter(id => id !== exam.id));
                            } else {
                              setMissingCustomExamIds([...missingCustomExamIds, exam.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${isChecked ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {isChecked && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                            <span className="font-bold">{exam.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{exam.classLevel} • {exam.term || 'First Term'}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {missingScope === 'student' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Candidate</label>
                <Select value={missingSelectedStudentId} onValueChange={setMissingSelectedStudentId}>
                  <SelectTrigger className="h-10 rounded-xl font-semibold">
                    <SelectValue placeholder="Choose candidate..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Candidates</SelectItem>
                    {students?.filter(s => !isQAUerOrTestRecord(s)).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.studentId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {missingScope === 'subject' && missingExamSelectionMode === 'auto' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Scheduled Exam</label>
                <Select value={missingSelectedExamId} onValueChange={setMissingSelectedExamId}>
                  <SelectTrigger className="h-10 rounded-xl font-semibold">
                    <SelectValue placeholder="Choose exam..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Scheduled Exams</SelectItem>
                    {exams?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title} ({e.subject})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(missingScope === 'class' || missingScope === 'subject') && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Class Level</label>
                <Select value={missingSelectedClass} onValueChange={setMissingSelectedClass}>
                  <SelectTrigger className="h-10 rounded-xl font-semibold">
                    <SelectValue placeholder="Select Class Level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Classes</SelectItem>
                    {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsMissingExamModalOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsMissingExamModalOpen(false);
                handlePrintMissingExamReport();
              }}
              className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" /> Generate Printable Audit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Broadsheets & Position Rankings Dialog */}
      <Dialog open={isAdvancedPrintModalOpen} onOpenChange={setIsAdvancedPrintModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-blue-600">
              <Award className="h-5 w-5" /> Advanced Broadsheets & Position Rankings
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Generate annual cumulative broadsheets, multi-term breakdowns, or class & department position rankings with normalized percentages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Report Type</label>
              <Select value={advancedPrintType} onValueChange={(val: any) => setAdvancedPrintType(val)}>
                <SelectTrigger className="h-10 rounded-xl font-semibold">
                  <SelectValue placeholder="Select Report Type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="student-cumulative-broadsheet">Type B — Single Student Cumulative Broadsheet (Annual %)</SelectItem>
                  <SelectItem value="student-term-breakdown">Type A — Single Student Term Breakdown (3 Terms)</SelectItem>
                  <SelectItem value="class-broadsheet">Class / Department Academic Broadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(advancedPrintType === 'student-cumulative-broadsheet' || advancedPrintType === 'student-term-breakdown') && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Student</label>
                <Select value={selectedStudentForPrint} onValueChange={setSelectedStudentForPrint}>
                  <SelectTrigger className="h-10 rounded-xl font-semibold">
                    <SelectValue placeholder="Choose student..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {students?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.studentId}) — {s.classLevel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Class Broadsheet Filters — independent from main table filters */}
            {advancedPrintType === 'class-broadsheet' && (
              <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Broadsheet Scope Filters</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Class selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Class Level</label>
                    <Select value={broadsheetSelectedClass} onValueChange={setBroadsheetSelectedClass}>
                      <SelectTrigger className="h-9 rounded-xl font-semibold text-xs">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">All Classes</SelectItem>
                        {Array.from(new Set(students?.map(s => s.classLevel).filter(Boolean))).sort().map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Department</label>
                    <Select value={broadsheetSelectedDept} onValueChange={setBroadsheetSelectedDept}>
                      <SelectTrigger className="h-9 rounded-xl font-semibold text-xs">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">All Departments</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Art">Art</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Term selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Academic Term</label>
                    <Select value={broadsheetSelectedTerm} onValueChange={setBroadsheetSelectedTerm}>
                      <SelectTrigger className="h-9 rounded-xl font-semibold text-xs">
                        <SelectValue placeholder="All Terms" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">All Terms (Annual)</SelectItem>
                        <SelectItem value="First Term">First Term Only</SelectItem>
                        <SelectItem value="Second Term">Second Term Only</SelectItem>
                        <SelectItem value="Third Term">Third Term Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  ℹ️ "All Terms (Annual)" shows cumulative results across all 3 terms. These filters are independent from the main results table.
                </p>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">Include Position / Class Ranking</span>
                  <span className="text-[11px] text-slate-500 block">Calculate and display ordinal position (e.g. 1st, 2nd, 3rd)</span>
                </div>
                <Button
                  type="button"
                  variant={includePosition ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIncludePosition(!includePosition)}
                  className="rounded-xl font-bold text-xs"
                >
                  {includePosition ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {includePosition && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Position Ranking Scope</label>
                  <Select value={rankingScope} onValueChange={(val: any) => setRankingScope(val)}>
                    <SelectTrigger className="h-9 rounded-xl font-semibold text-xs">
                      <SelectValue placeholder="Select Scope" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="class">Class-Wide Scope (Ranked among all class peers)</SelectItem>
                      <SelectItem value="department">Department Scope (Ranked within Science/Art/Commercial)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setIsAdvancedPrintModalOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsAdvancedPrintModalOpen(false);
                handlePrintAdvancedBroadsheet();
              }}
              className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" /> Generate Printable Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
