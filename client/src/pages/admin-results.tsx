import { useState, useEffect } from "react";
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
import { Search, Eye, CheckCircle, XCircle, Printer, Filter, Calendar as CalendarIcon, Award, TrendingUp, Sparkles, Clock, ChevronRight, User } from "lucide-react";
import type { Result, Exam, Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { createRoot } from "react-dom/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getResults } from "@/lib/firebase-api";

export default function AdminResults() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExamId, setFilterExamId] = useState<string>("ALL");
  const [filterClassLevel, setFilterClassLevel] = useState<string>("ALL");
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

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

  const filteredResults = results?.filter(
    (result) => {
      const examMatch = filterExamId === "ALL" || result.examId === filterExamId;
      const searchMatch = result.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.studentId.toLowerCase().includes(searchQuery.toLowerCase());

      const student = students?.find(s => s.studentId === result.studentId);
      const classLevelMatch = filterClassLevel === "ALL" || student?.classLevel === filterClassLevel;
      const departmentMatch = filterDepartment === "ALL" || student?.department === filterDepartment;


      const completedDate = new Date(result.completedAt);
      const dateMatch = (!dateRange.from || completedDate >= dateRange.from) &&
        (!dateRange.to || completedDate <= dateRange.to);

      return examMatch && searchMatch && classLevelMatch && departmentMatch && dateMatch;
    }
  );
  const sortedResults = [...(filteredResults || [])].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.ceil(sortedResults.length / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const displayedResults = sortedResults.slice((activePage - 1) * pageSize, activePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterExamId, filterClassLevel, filterDepartment, dateRange]);


  const getExamTitle = (examId: string) => {
    return exams?.find((e) => e.id === examId)?.title || "Unknown Exam";
  };

  const handlePrint = async (result: Result) => {
    const exam = exams?.find(e => e.id === result.examId);
    const student = students?.find(s => s.studentId === result.studentId);

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
      const student = students?.find(s => s.studentId === r.studentId);
      return {
        id: r.studentId,
        name: r.studentName,
        class: student?.classLevel || filterClassLevel || "-",
        subject: getExamTitle(r.examId),
        score: r.percentage
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

  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && displayedResults) {
      setSelectedResultIds(new Set(displayedResults.map(r => r.id)));
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

  const handleBulkPrint = async () => {
    const selected = results?.filter(r => selectedResultIds.has(r.id));
    if (!selected || selected.length === 0) {
      toast({ title: "Warning", description: "No results selected for bulk print.", variant: "default" });
      return;
    }

    // Generate data for each result
    const printPayloads = selected.map(result => {
      const exam = exams?.find(e => e.id === result.examId);
      const student = students?.find(s => s.studentId === result.studentId);

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
        const studentObj = students?.find(s => s.studentId === studentId);
        
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

      {/* Header Panel */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-6 bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Performance Ledger</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Examination Results
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Review detailed student scorecards, filter performance trends, and print consolidated school reports.
          </p>
        </div>

        {resultsError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium max-w-md animate-bounce">
            <span className="font-extrabold block mb-1">Error Loading Results:</span>
            <span>{resultsError instanceof Error ? resultsError.message : "Unknown error. Please check your database settings."}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-900/40 text-xs font-bold text-indigo-650 dark:text-indigo-455">
            <TrendingUp className="h-4 w-4" />
            <span>{results?.length || 0} Total Exams Completed</span>
          </div>
        </div>
      </div>

      <div className="print-container">
        {/* Advanced Filter Toolbar */}
        <Card className="print:hidden overflow-visible border border-slate-100 dark:border-slate-800/80 shadow-md rounded-2xl bg-white dark:bg-slate-900 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

                <div className="flex flex-wrap items-center gap-3">
                  {selectedResultIds.size > 0 && (
                    <Button 
                      onClick={handleBulkPrint} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 h-9.5 rounded-xl text-xs shadow-lg shadow-indigo-500/10 transition-transform duration-200 hover:scale-[1.02]"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Selected ({selectedResultIds.size})
                    </Button>
                  )}

                  <Button 
                    onClick={handlePrintFullReport} 
                    variant="outline" 
                    className="border-indigo-150 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-850 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 px-4 h-9.5 rounded-xl text-xs font-bold"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Consolidated Report
                  </Button>

                  <Button 
                    variant="secondary" 
                    onClick={handlePrintBroadsheet}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-750 px-4 h-9.5 rounded-xl text-xs font-bold"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Score Sheet (Broadsheet)
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 max-w-[200px]">Student / Candidate</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 w-16">Class</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 w-20">Dept</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 max-w-[150px]">Examination</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 print:hidden">Points</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 hidden print:table-cell">Score (%)</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 print:hidden">Score %</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 print:hidden">Status</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 hidden xl:table-cell print:hidden">Submission</TableHead>
                    <TableHead className="font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 text-right hidden lg:table-cell print:hidden">Date Completed</TableHead>
                    <TableHead className="text-right font-bold text-xs text-slate-400 uppercase tracking-wider py-3.5 print:hidden w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100/50 dark:divide-slate-805/40">
                  {displayedResults
                    .map((result) => {
                      const student = students?.find(s => s.studentId === result.studentId);
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
                          <TableCell className="max-w-[200px] py-4">
                            <div
                              className="cursor-pointer flex items-center gap-3"
                              onClick={() => setLocation(`/admin/results/student/${result.studentId}`)}
                            >
                              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 flex-shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-650 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-400 transition-colors">
                                <User className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-455 transition-colors hover:underline truncate" title={result.studentName}>
                                  {result.studentName}
                                </p>
                                <p className="text-[11px] text-slate-455 font-mono truncate mt-0.5">
                                  {result.studentId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-550 py-4">{student?.classLevel || '-'}</TableCell>
                          <TableCell className="font-semibold text-xs text-slate-550 py-4">
                            {student?.department && student.department !== 'General' ? (
                              <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px] py-0 px-1.5 font-bold">
                                {student.department}
                              </Badge>
                            ) : student?.department || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-300 max-w-[150px] truncate py-4" title={getExamTitle(result.examId)}>
                            {getExamTitle(result.examId)}
                          </TableCell>

                          {/* Score Column: Visible on Screen, Hidden on Print */}
                          <TableCell className="print:hidden py-4">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{result.score}</span>
                            <span className="text-slate-400 text-xs"> / {result.totalPoints}</span>
                          </TableCell>

                          {/* Score (%) Column: Hidden on Screen, Visible on Print */}
                          <TableCell className="hidden print:table-cell py-4">
                            <span className="font-black text-sm">{result.percentage}%</span>
                          </TableCell>

                          {/* Percentage Column: Visible on Screen, Hidden on Print */}
                          <TableCell className="print:hidden py-4">
                            <span
                              className={`font-black text-sm ${
                                result.passed 
                                  ? "text-emerald-600 dark:text-emerald-400" 
                                  : "text-rose-600 dark:text-rose-455"
                              }`}
                            >
                              {result.percentage}%
                            </span>
                          </TableCell>

                          <TableCell className="print:hidden py-4">
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
                          <TableCell className="print:hidden hidden xl:table-cell py-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-transparent font-black text-[10px] uppercase shadow-none rounded-lg py-0.5 px-2",
                                result.submissionType === 'student'
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                              )}
                            >
                              {result.submissionType === 'student' ? 'Student Portal' : 'Manual / Staff'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right print:hidden hidden lg:table-cell py-4">
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
                            <div className="flex justify-end gap-1.5">
                              <Link href={`/admin/results/${result.id}`}>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8.5 w-8.5 rounded-lg text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                                >
                                  <Eye className="h-4.5 w-4.5" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8.5 w-8.5 rounded-lg text-slate-455 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => handlePrint(result)}
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
    </div>
  );
}
