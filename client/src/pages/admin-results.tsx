import { useState } from "react";
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
import { Search, Eye, CheckCircle, XCircle, Printer, Filter, Calendar as CalendarIcon } from "lucide-react";
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


  const getExamTitle = (examId: string) => {
    return exams?.find((e) => e.id === examId)?.title || "Unknown Exam";
  };

  const handlePrint = (result: Result) => {
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
      console.log("handlePrint: Print window opened, writing document...");
      printWindow.document.write('<html><head><title>Print Result</title>');
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        printWindow.document.head.appendChild(style.cloneNode(true));
      });
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');
      printWindow.document.write('</head><body><div id="print-root"></div></body></html>');

      printWindow.document.close();
      printWindow.focus();

      // Use a timeout to allow the browser to process the document write
      setTimeout(() => {
        console.log("handlePrint: Starting polling for print-root...");
        let attempts = 0;
        const interval = setInterval(() => {
          const container = printWindow.document.getElementById('print-root');
          if (container) {
            console.log("handlePrint: print-root found, rendering component...");
            clearInterval(interval);
            try {
              const root = createRoot(container);
              // @ts-ignore
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
                onPrint={() => {
                  console.log("handlePrint: Component triggered onPrint");
                  setTimeout(() => printWindow.print(), 500);
                }}
              />);
            } catch (err) {
              console.error("handlePrint: Render error:", err);
              toast({ title: "Print Error", description: "Failed to render print document.", variant: "destructive" });
            }
          } else if (attempts >= 50) { // Increased to 5 seconds
            console.error("handlePrint: Print root element not found after 5s.");
            clearInterval(interval);
            toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
            printWindow.close();
          }
          attempts++;
        }, 100);
      }, 100);
    } else {
      console.error("handlePrint: Pop-up blocked or window failed to open.");
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
    }
  };

  const handlePrintBroadsheet = () => {
    if (filterExamId === "ALL" || !filteredResults || filteredResults.length === 0) {
      toast({ title: "Action Required", description: "Please select a specific exam to print a score sheet.", variant: "destructive" });
      return;
    }

    const exam = exams?.find(e => e.id === filterExamId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    printWindow.document.write('<html><head><title>Score Sheet</title>');
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
      printWindow.document.head.appendChild(style.cloneNode(true));
    });
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
    printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
    printWindow.document.close();

    const sorted = [...filteredResults].sort((a, b) => a.studentName.localeCompare(b.studentName));
    const studentResults = sorted.map(r => {
      const student = students?.find(s => s.studentId === r.studentId);
      return {
        id: r.studentId,
        name: r.studentName,
        class: student?.classLevel || filterClassLevel || "-",
        subject: exam?.title || "Examination",
        score: r.percentage
      };
    });

    const printInterval = setInterval(() => {
      const container = printWindow.document.getElementById('print-root');
      if (container) {
        clearInterval(printInterval);
        const root = createRoot(container);
        root.render(
          <PrintReportTemplate
            reportType="score-sheet"
            schoolInfo={{
              name: "FAITH IMMACULATE ACADEMY",
              address: "IGBOHO, OYO STATE",
              motto: "KNOWLEDGE AND GODLINESS",
              logoText: "FIA"
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
      }
    }, 100);
  };

  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredResults) {
      setSelectedResultIds(new Set(filteredResults.map(r => r.id)));
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

  const handleBulkPrint = () => {
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
      printWindow.document.write('<html><head><title>Print Report Cards</title>');
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach(style => {
        printWindow.document.head.appendChild(style.cloneNode(true));
      });
      printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
      printWindow.document.write(`
        <style>
           body { background-color: #f1f5f9; }
           @media print { 
             body { background-color: white; } 
             .page-break { page-break-after: always; }
           }
           #print-root { display: flex; flex-direction: column; gap: 2rem; align-items: center; padding: 2rem; }
           .report-wrapper { width: 100%; max-width: 8.5in; }
         </style>
      `);
      printWindow.document.write('</head><body><div id="print-root"></div></body></html>');

      printWindow.document.close();

      printWindow.onload = () => {
        let attempts = 0;
        const interval = setInterval(() => {
          const container = printWindow.document.getElementById('print-root');
          if (container) {
            clearInterval(interval);
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
                        logoText: "FIA"
                      }}
                      metadata={{
                        class: data.candidate.gradeLevel,
                        exam: data.examTitle,
                        date: data.candidate.date,
                        session: "2025/2026 ACADEMIC SESSION"
                      }}
                      results={data.subjectBreakdown.map((b: any) => ({
                        id: b.questions.toString(),
                        name: b.subject,
                        class: data.candidate.gradeLevel,
                        subject: b.correct.toString(),
                        score: b.percentage
                      }))}
                      showPrintButton={false}
                    />
                  </div>
                ))}
              </>
            );
          } else if (attempts >= 10) {
            clearInterval(interval);
            console.error("Print root element not found after polling.");
            toast({ title: "Print Error", description: "Could not prepare print document.", variant: "destructive" });
          }
          attempts++;
        }, 100);
      };
    } else {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
    }
  };

  const handlePrintFullReport = () => {
    if (!filteredResults || filteredResults.length === 0) {
      toast({ title: "No Results", description: "There are no results to print.", variant: "destructive" });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    printWindow.document.write('<html><head><title>Results Report</title>');
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
      printWindow.document.head.appendChild(style.cloneNode(true));
    });
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
    printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
    printWindow.document.close();

    const studentResults = filteredResults.map(r => {
      const student = students?.find(s => s.studentId === r.studentId);
      return {
        id: r.studentId,
        name: r.studentName,
        class: student?.classLevel || filterClassLevel || "-",
        subject: getExamTitle(r.examId),
        score: r.percentage
      };
    });

    const printInterval = setInterval(() => {
      const container = printWindow.document.getElementById('print-root');
      if (container) {
        clearInterval(printInterval);
        const root = createRoot(container);
        root.render(
          <PrintReportTemplate
            reportType="score-sheet"
            schoolInfo={{
              name: "FAITH IMMACULATE ACADEMY",
              address: "IGBOHO, OYO STATE",
              motto: "KNOWLEDGE AND GODLINESS",
              logoText: "FIA"
            }}
            metadata={{
              class: filterClassLevel === "ALL" ? "All Classes" : filterClassLevel,
              exam: filterExamId === "ALL" ? "Consolidated Report" : getExamTitle(filterExamId),
              date: new Date().toLocaleDateString(),
              session: "2025/2026 ACADEMIC SESSION"
            }}
            results={studentResults}
            onPrint={() => {
              setTimeout(() => printWindow.print(), 500);
            }}
          />
        );
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
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

      <div className="no-print">
        <h1 className="mb-2 text-3xl font-bold">Results</h1>
        <p className="text-muted-foreground">
          View and analyze student exam results
        </p>
        {resultsError && (
          <div className="mt-4 p-4 rounded bg-red-50 border border-red-200 text-red-700">
            <h3 className="font-bold">Error loading results:</h3>
            <p>{resultsError instanceof Error ? resultsError.message : "Unknown error. Please check your Firebase settings."}</p>
          </div>
        )}
      </div>

      <div className="print-container">

        {/* Advanced Filter Toolbar */}
        <Card className="print:hidden overflow-visible mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Name or Student ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Exam Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exam</label>
                  <Select value={filterExamId} onValueChange={setFilterExamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Exams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Exams</SelectItem>
                      {exams?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class Level Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class Level</label>
                  <Select value={filterClassLevel} onValueChange={setFilterClassLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Classes</SelectItem>
                      {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Art">Art</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {/* Date Range Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSearchQuery("");
                    setFilterExamId("ALL");
                    setSearchQuery("");
                    setFilterExamId("ALL");
                    setFilterClassLevel("ALL");
                    setFilterDepartment("ALL");
                    setDateRange({ from: undefined, to: undefined });

                  }}>
                    Reset Filters
                  </Button>
                </div>

                <div className="flex gap-3">
                  {selectedResultIds.size > 0 && (
                    <Button onClick={handleBulkPrint} variant="default">
                      <Printer className="mr-2 h-4 w-4" />
                      Print Selected ({selectedResultIds.size})
                    </Button>
                  )}

                  <Button onClick={handlePrintFullReport} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                  </Button>

                  {filterExamId !== "ALL" && (
                    <Button variant="secondary" onClick={handlePrintBroadsheet}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Score Sheet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {resultsLoading ? (
          <div className="space-y-4 print:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredResults && filteredResults.length > 0 ? (
          <Card className="overflow-hidden border-none shadow-lg print:shadow-none">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold print:hidden w-10">
                    <input
                      type="checkbox"
                      checked={filteredResults.length > 0 && Array.from(selectedResultIds).length === filteredResults.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead className="font-bold max-w-[150px]">Student</TableHead>
                  <TableHead className="font-bold">Cls</TableHead>
                  <TableHead className="font-bold">Dept</TableHead>
                  <TableHead className="font-bold max-w-[120px]">Exam</TableHead>
                  <TableHead className="font-bold print:hidden">Scr</TableHead>
                  <TableHead className="font-bold hidden print:table-cell">Score (%)</TableHead>
                  <TableHead className="font-bold print:hidden">%</TableHead>
                  <TableHead className="font-bold print:hidden">Sts</TableHead>
                  <TableHead className="font-bold hidden xl:table-cell print:hidden">Submitted</TableHead>
                  <TableHead className="font-bold text-right hidden lg:table-cell print:hidden">Completed</TableHead>
                  <TableHead className="text-right print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults
                  .sort(
                    (a, b) =>
                      new Date(b.completedAt).getTime() -
                      new Date(a.completedAt).getTime()
                  )
                  .map((result) => {
                    const student = students?.find(s => s.studentId === result.studentId);
                    return (
                      <TableRow key={result.id} className={cn(selectedResultIds.has(result.id) ? "bg-blue-50/50" : "", "group transition-colors")}>
                        <TableCell className="print:hidden">
                          <input
                            type="checkbox"
                            checked={selectedResultIds.has(result.id)}
                            onChange={(e) => handleSelectOne(result.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <div
                            className="cursor-pointer"
                            onClick={() => setLocation(`/ admin / results / student / ${result.studentId}`)}
                          >
                            <p className="font-semibold text-primary hover:underline transition-all truncate" title={result.studentName}>
                              {result.studentName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {result.studentId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{student?.classLevel || '-'}</TableCell>
                        <TableCell className="font-medium text-muted-foreground">{student?.department || '-'}</TableCell>
                        <TableCell className="font-medium max-w-[120px] truncate" title={getExamTitle(result.examId)}>{getExamTitle(result.examId)}</TableCell>

                        {/* Score Column: Visible on Screen, Hidden on Print */}
                        <TableCell className="print:hidden">
                          <span className="font-medium">{result.score}</span>
                          <span className="text-muted-foreground text-xs"> / {result.totalPoints}</span>
                        </TableCell>

                        {/* Score (%) Column: Hidden on Screen, Visible on Print */}
                        <TableCell className="hidden print:table-cell">
                          <span className="font-bold">{result.percentage}%</span>
                        </TableCell>

                        {/* Percentage Column: Visible on Screen, Hidden on Print */}
                        <TableCell className="print:hidden">
                          <span
                            className={`font-bold ${result.passed ? "text-green-600" : "text-red-600"
                              }`}
                          >
                            {result.percentage}%
                          </span>
                        </TableCell>

                        <TableCell className="print:hidden">
                          {result.passed ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="print:hidden hidden xl:table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent font-semibold shadow-none",
                              result.submissionType === 'student'
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            )}
                          >
                            {result.submissionType === 'student' ? 'Submitted' : 'Not Submitted'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right print:hidden hidden lg:table-cell">
                          <div className="text-sm">
                            <p className="font-medium">{format(new Date(result.completedAt), "dd MMM yyyy")}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(result.completedAt), "hh:mm a")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right print:hidden">
                          <div className="flex justify-end gap-1">
                            <Link href={`/admin/results/${result.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                              onClick={() => handlePrint(result)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow >
                    )
                  })}
              </TableBody >
            </Table >
          </Card >
        ) : (
          <Card className="print:hidden">
            <CardContent className="flex flex-col items-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-bold">
                {searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from ? "No Match Found" : "No Results Yet"}
              </h3>
              <p className="text-muted-foreground max-w-xs">
                {searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from
                  ? "We couldn't find any results matching your active filters. Try adjusting them."
                  : "Examination results will automatically appear here once students complete their exams."}
              </p>
              {(searchQuery || filterExamId !== "ALL" || filterClassLevel !== "ALL" || dateRange.from) && (
                <Button variant="outline" className="mt-6" onClick={() => {
                  setSearchQuery("");
                  setFilterExamId("ALL");
                  setFilterClassLevel("ALL");
                  setDateRange({ from: undefined, to: undefined });
                }}>
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div >
    </div >
  );
}
