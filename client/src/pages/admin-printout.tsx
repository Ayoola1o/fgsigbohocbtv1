import { resultPeriod } from "@shared/school-calendar";
import type { SystemSettings } from "@shared/schema";
import { printDocument } from "@/lib/print-document";
import { resultBreakdown, latestAttempts, termScores, annualScores, studentKey } from "@/lib/report-data";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResultTemplate } from "@/components/ResultTemplate";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { Loader2 } from "lucide-react";

export default function AdminPrintout() {
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: students } = useQuery<any[]>({ queryKey: ["/api/students"] });
  const { data: results } = useQuery<any[]>({ queryKey: ["/api/results"] });
  const { data: exams } = useQuery<any[]>({ queryKey: ["/api/exams"] });
  const { data: questions } = useQuery<any[]>({ queryKey: ["/api/questions"] });

  const { data: settings } = useQuery<SystemSettings>({ queryKey: ["/api/settings"] });
  // Filter students by class level
  const filteredStudents = students?.filter(s => selectedClassLevel && !s.isTestUser && s.classLevel === selectedClassLevel) || [];

  // Prepare data for printout
  const printoutData = filteredStudents.map(student => {
    // Latest completed attempt for the selected examination.
    const studentResults = latestAttempts((results || []).filter(r => studentKey(r.studentId) === studentKey(student.studentId) && r.examId === selectedExamId && resultPeriod(r, settings?.academicCalendar || [])?.session === settings?.currentSession));
    if (studentResults.length === 0) return null;

    // Sort by date desc
    studentResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const latestResult = studentResults[0];
    const exam = exams?.find(e => e.id === latestResult.examId);

    // Calculate subject breakdown
    // We need questions to know the subject of each question in the exam
    // BUT, the result doesn't store question IDs directly in a way that maps easily without fetching the exam's question list.
    // Actually `exam.questionIds` has the list.

    const breakdown = resultBreakdown(latestResult, questions || [], exam);

return {
      schoolName: "Faith Immaculate Academy",
      schoolLogoUrl: "/logo.png", // Placeholder (unused by template)
      examTitle: exam?.title || "Exam Result",
      candidate: {
        name: student.name,
        studentId: student.studentId,
        gradeLevel: student.classLevel || selectedClassLevel || "-",
        date: new Date(latestResult.completedAt).toLocaleDateString(),
      },
      overallResult: {
        score: latestResult.score,
        total: latestResult.totalPoints,
        percentage: latestResult.percentage,
        timeTakenMinutes: 60, // Mocking time taken as it's not strictly tracked in result yet (only start/end in session)
        status: latestResult.passed ? 'PASS' : 'FAIL',
      },
      subjectBreakdown: breakdown
    };
  }).filter(Boolean);

  return (
    <div className="space-y-8">
      <style>{`@media print { .no-print, nav, aside, header { display: none !important; } .report-page { break-after: page; } .report-page:last-child { break-after: auto; } }`}</style>
      <div className="no-print">
        <h1 className="mb-2 text-3xl font-bold">General Printout</h1>
        <p className="text-muted-foreground mb-6">
          Generate result slips for all students in a specific class.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 items-end">
            <div className="w-64 space-y-2">
              <label className="text-sm font-medium">Class Level</label>
              <Select value={selectedClassLevel} onValueChange={value => { setSelectedClassLevel(value); setSelectedExamId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JSS1">JSS1</SelectItem>
                  <SelectItem value="JSS2">JSS2</SelectItem>
                  <SelectItem value="JSS3">JSS3</SelectItem>
                  <SelectItem value="SS1">SS1</SelectItem>
                  <SelectItem value="SS2">SS2</SelectItem>
                  <SelectItem value="SS3">SS3</SelectItem>
                  <SelectItem value="WAEC">WAEC</SelectItem>
                  <SelectItem value="NECO">NECO</SelectItem>
                  <SelectItem value="GCE WAEC">GCE WAEC</SelectItem>
                  <SelectItem value="GCE NECO">GCE NECO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64 space-y-2"><label>Examination / Term</label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}><SelectTrigger><SelectValue placeholder="Select examination" /></SelectTrigger><SelectContent>
                {exams?.filter(exam => exam.classLevel === selectedClassLevel && (!exam.academicSession || exam.academicSession === settings?.currentSession)).map(exam => <SelectItem key={exam.id} value={exam.id}>{exam.title} — {exam.term}</SelectItem>)}
              </SelectContent></Select></div>
            <Button
              onClick={async () => { setIsGenerating(true); try { await printDocument(window); } finally { setIsGenerating(false); } }}
              disabled={!selectedClassLevel || !selectedExamId || !questions || !results || isGenerating || printoutData.length === 0}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🖨️ Print All Results"}
            </Button>
          </CardContent>
        </Card>

        {selectedClassLevel && selectedExamId && results && printoutData.length === 0 && (
          <div className="mt-4 text-center text-muted-foreground">
            No results found for students in {selectedClassLevel}.
          </div>
        )}
      </div>

      {selectedClassLevel && selectedExamId && results && <p className="no-print">{printoutData.length} result slips available; {filteredStudents.length - printoutData.length} students have no result for this examination.</p>}
      {/* Print Preview Area */}
      <div className="print-area">
        {printoutData.map((data: any, idx) => (
          <div key={idx} className="report-page">
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
                session: settings?.currentSession || "Unassigned",
                studentName: data.candidate.name,
                studentId: data.candidate.studentId,
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
      </div>
    </div>
  );
}

