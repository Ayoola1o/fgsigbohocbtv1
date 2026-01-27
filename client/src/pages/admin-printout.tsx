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
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: students } = useQuery<any[]>({ queryKey: ["/api/students"] });
  const { data: results } = useQuery<any[]>({ queryKey: ["/api/results"] });
  const { data: exams } = useQuery<any[]>({ queryKey: ["/api/exams"] });
  const { data: questions } = useQuery<any[]>({ queryKey: ["/api/questions"] });

  // Filter students by class level
  const filteredStudents = students?.filter(s => !selectedClassLevel || s.classLevel === selectedClassLevel) || [];

  // Prepare data for printout
  const printoutData = filteredStudents.map(student => {
    // Find the most recent result for this student? Or all results?
    // For "General Printout", usually it's for a specific exam or term.
    // But here we might just print whatever latest result they have, or all of them.
    // Let's assume we want to print the latest result for each student for now, 
    // or maybe we should also filter by Exam?
    // The prompt says "general print out for all student and a condition for class level".
    // It doesn't explicitly say "for a specific exam".
    // But a report card usually contains multiple subjects (exams).

    // If we want a "Report Card" style, we need to aggregate results from multiple exams.
    // The template shows "Subject Breakdown" which implies one exam with multiple subjects OR a report card of multiple exams.
    // The template has `examTitle: "Mid-Term Software Development Fundamentals"`.
    // And `subjectBreakdown` inside it.

    // Let's try to find the most recent result for the student.
    const studentResults = results?.filter(r => r.studentId === student.studentId) || [];
    if (studentResults.length === 0) return null;

    // Sort by date desc
    studentResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    const latestResult = studentResults[0];
    const exam = exams?.find(e => e.id === latestResult.examId);

    // Calculate subject breakdown
    // We need questions to know the subject of each question in the exam
    // BUT, the result doesn't store question IDs directly in a way that maps easily without fetching the exam's question list.
    // Actually `exam.questionIds` has the list.

    const breakdown: any[] = [];
    if (questions && exam) {
      const examQuestions = questions.filter(q => exam.questionIds.includes(q.id));
      const subjects = [...new Set(examQuestions.map(q => q.subject))];

      subjects.forEach(subject => {
        const subjectQuestions = examQuestions.filter(q => q.subject === subject);
        const totalQuestions = subjectQuestions.length;
        let correctCount = 0;

        subjectQuestions.forEach(q => {
          if (latestResult.correctAnswers && latestResult.correctAnswers[q.id]) {
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

    return {
      schoolName: "Faith Immaculate Academy",
      schoolLogoUrl: "https://placehold.co/150x50/3b82f6/ffffff?text=FIA+CBT", // Placeholder
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
              <Select value={selectedClassLevel} onValueChange={setSelectedClassLevel}>
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
            <Button
              onClick={() => {
                setIsGenerating(true);
                setTimeout(() => {
                  window.print();
                  setIsGenerating(false);
                }, 500);
              }}
              disabled={!selectedClassLevel || printoutData.length === 0}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🖨️ Print All Results"}
            </Button>
          </CardContent>
        </Card>

        {selectedClassLevel && printoutData.length === 0 && (
          <div className="mt-4 text-center text-muted-foreground">
            No results found for students in {selectedClassLevel}.
          </div>
        )}
      </div>

      {/* Print Preview Area */}
      <div className="print-area">
        {printoutData.map((data: any, idx) => (
          <div key={idx}>
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
      </div>
    </div>
  );
}
