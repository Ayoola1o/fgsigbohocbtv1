import React, { useState } from "react";
import { useLocation } from "wouter";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Question } from "@shared/schema";
import { TheoryStructureEditor, generateStructure, type TheorySlot } from "@/components/theory-structure-editor";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { createRoot } from "react-dom/client";
import { Printer } from "lucide-react";

export default function AdminExamDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: exam, isLoading } = useQuery<any>({
    queryKey: ["/api/exams", id],
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const [formData, setFormData] = useState<any>(null);

  // Advanced Question Bank search and filtering states
  const [qSearchText, setQSearchText] = useState("");
  const [qSubjectFilter, setQSubjectFilter] = useState("");
  const [qClassFilter, setQClassFilter] = useState("");
  const [qTermFilter, setQTermFilter] = useState("");

  // Set initial form data when exam loads
  React.useEffect(() => {
    if (exam) {
      setFormData({
        ...exam,
        // Ensure theoryConfig has structure
        theoryConfig: exam.theoryConfig || {
          mode: "manual",
          settings: {
            includeAlphabet: true,
            includeRoman: false,
            totalMainQuestions: 4,
            randomizeComplexity: false,
          },
          structure: [],
        }
      });
      // Dynamically initialize filters to match the exam defaults
      setQSubjectFilter(exam.subject || "");
      setQClassFilter(exam.classLevel || "");
      setQTermFilter(exam.term || "");
    }
  }, [exam]);

  // Question Linker Filtering logic
  const filteredQuestionsForLinker = (questions || []).filter(q => {
    const matchClass = !qClassFilter || q.classLevel === qClassFilter;
    const matchTerm = !qTermFilter || q.term === qTermFilter;
    const matchSubject = !qSubjectFilter || q.subject.toLowerCase().includes(qSubjectFilter.toLowerCase());
    const matchType = (formData?.examType || "Objectives") === "Theory" 
      ? (q.examType === "Theory" || q.questionType === "theory")
      : (q.examType === "Objectives" || q.questionType === "objectives" || !q.examType);
    const matchText = !qSearchText || q.questionText.toLowerCase().includes(qSearchText.toLowerCase());
    return matchClass && matchTerm && matchSubject && matchType && matchText;
  });

  const toggleQuestionInLinker = (questionId: string) => {
    if (!formData) return;
    const currentIds = formData.questionIds || [];
    const newIds = currentIds.includes(questionId)
      ? currentIds.filter((id: string) => id !== questionId)
      : [...currentIds, questionId];
    setFormData({ ...formData, questionIds: newIds });
  };

  const selectAllFilteredQuestions = () => {
    if (!formData) return;
    const currentIds = formData.questionIds || [];
    const filteredIds = filteredQuestionsForLinker.map(q => q.id);
    const combinedIds = Array.from(new Set([...currentIds, ...filteredIds]));
    setFormData({ ...formData, questionIds: combinedIds });
  };

  const clearAllFilteredQuestions = () => {
    if (!formData) return;
    const currentIds = formData.questionIds || [];
    const filteredIds = filteredQuestionsForLinker.map(q => q.id);
    const newIds = currentIds.filter((id: string) => !filteredIds.includes(id));
    setFormData({ ...formData, questionIds: newIds });
  };

  const updateExamMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/exams/${id}`, data),
    onSuccess: () => {
      toast({ title: "Exam updated", description: "Exam settings updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams", id] });
      setLocation("/admin/exams");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exam.",
        variant: "destructive"
      });
    },
  });

  const handlePrintExamSheet = () => {
    const examQuestions = questions?.filter(q => exam.questionIds?.includes(q.id)) || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Pop-up blocked. Please allow pop-ups for this site.", variant: "destructive" });
      return;
    }

    printWindow.document.write('<html><head><title>Exam Sheet</title>');
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
      printWindow.document.head.appendChild(style.cloneNode(true));
    });
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
    printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
    printWindow.document.close();

    const results = examQuestions.map(q => ({
      id: q.id,
      name: q.questionText,
      class: q.classLevel,
      subject: q.examType || "Objectives",
      options: q.options || [],
      score: 0
    }));

    const printInterval = setInterval(() => {
      const container = printWindow.document.getElementById('print-root');
      if (container) {
        clearInterval(printInterval);
        const root = createRoot(container);
        root.render(
          <PrintReportTemplate
            reportType="exam-paper"
            schoolInfo={{
              name: "FAITH IMMACULATE ACADEMY",
              address: "IGBOHO, OYO STATE",
              motto: "KNOWLEDGE AND GODLINESS",
              logoText: "FIA"
            }}
            metadata={{
              class: exam.classLevel,
              exam: exam.title,
              date: new Date().toLocaleDateString(),
              session: "2025/2026 ACADEMIC SESSION"
            }}
            results={results}
            onPrint={() => {
              setTimeout(() => printWindow.print(), 500);
            }}
          />
        );
      }
    }, 100);
  };

  if (isLoading || !formData) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground">Loading exam details...</div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Exam</h1>
          <p className="text-muted-foreground">Modify settings for "{exam?.title}"</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrintExamSheet} className="flex gap-2">
            <Printer size={18} /> Print Exam Sheet
          </Button>
          <Badge variant={formData.isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
            {formData.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault();
              updateExamMutation.mutate(formData);
            }}
            className="space-y-8"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="examType">Exam Type *</Label>
                <select
                  id="examType"
                  value={formData.examType}
                  onChange={e => setFormData({ ...formData, examType: e.target.value as any })}
                  className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary outline-none"
                  required
                >
                  <option value="Objectives">Objectives (Multiple Choice)</option>
                  <option value="Theory">Theory (Nested Structure)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  value={formData.isActive ? "true" : "false"}
                  onChange={e => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full border rounded-md px-3 py-2 bg-background focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Exam Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Mathematics Final Exam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of the exam purposes"
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Physics"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classLevel">Class Level *</Label>
                <select
                  id="classLevel"
                  value={formData.classLevel}
                  onChange={e => setFormData({ ...formData, classLevel: e.target.value, department: ["SS1", "SS2", "SS3"].includes(e.target.value) ? formData.department : "" })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  required
                >
                  <option value="JSS1">JSS1</option>
                  <option value="JSS2">JSS2</option>
                  <option value="JSS3">JSS3</option>
                  <option value="SS1">SS1</option>
                  <option value="SS2">SS2</option>
                  <option value="SS3">SS3</option>
                  <option value="WAEC">WAEC</option>
                  <option value="NECO">NECO</option>
                  <option value="GCE WAEC">GCE WAEC</option>
                  <option value="GCE NECO">GCE NECO</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="term">Term *</Label>
                <select
                  id="term"
                  value={formData.term}
                  onChange={e => setFormData({ ...formData, term: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  required
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            {["SS1", "SS2", "SS3"].includes(formData.classLevel) && (
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <select
                  id="department"
                  value={formData.department || ""}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  required
                >
                  <option value="">Select Department</option>
                  <option value="Science">Science</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Art">Art</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%) *</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={e => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfQuestionsToDisplay">Questions to Display (Optional)</Label>
              <Input
                id="numberOfQuestionsToDisplay"
                type="number"
                min="0"
                value={formData.numberOfQuestionsToDisplay || ""}
                onChange={e => setFormData({ ...formData, numberOfQuestionsToDisplay: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Leave blank to show all selected questions"
                disabled={formData.examType === "Theory"}
              />
              <p className="text-xs text-muted-foreground">
                {formData.examType === "Theory"
                  ? "Determined by theory structure for Theory exams."
                  : "If set, students will be given a random subset of this many questions from the total selected."}
              </p>
            </div>

            {formData.examType === "Theory" && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg font-semibold">Theory Instructions</Label>
                <Textarea
                  value={formData.theoryInstructions || ""}
                  onChange={e => setFormData({ ...formData, theoryInstructions: e.target.value })}
                  placeholder="Specific rules for the theory section..."
                  className="min-h-[120px]"
                />

                <div className="pt-4 border-t mt-4">
                  <Label className="text-lg font-semibold mb-4 block">Theory Structure Configuration</Label>
                  <TheoryStructureEditor
                    structure={formData.theoryConfig?.structure || []}
                    onChange={(structure) => setFormData({
                      ...formData,
                      theoryConfig: {
                        ...formData.theoryConfig,
                        structure
                      }
                    })}
                    availableQuestions={questions?.filter(q => {
                      const selectedSubjects = formData.subject
                        ? formData.subject.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean)
                        : [];
                      const matchSubject = selectedSubjects.length > 0
                        ? selectedSubjects.includes((q.subject || "").toLowerCase())
                        : true;
                      const qDepts = q.department ? q.department.split(",").map(d => d.trim()).filter(Boolean) : [];
                      const matchDept = !formData.department || formData.department === "General"
                        ? (qDepts.length === 0 || qDepts.includes("General"))
                        : (qDepts.length === 0 || qDepts.includes("General") || qDepts.includes(formData.department));
                      return q.examType === "Theory" &&
                        q.classLevel === formData.classLevel &&
                        matchSubject &&
                        matchDept;
                    }) || []}

                  />
                </div>
              </div>
            )}

            {/* Direct Question Bank Linker Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-md">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/40 py-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                      Link Questions from Question Bank
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                      Select objective or theory questions to compose this exam paper pool.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 self-start sm:self-center">
                    <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold text-sm py-1 px-3">
                      {formData.questionIds?.length || 0} Questions Linked
                    </Badge>
                    {formData.subject && formData.subject.split(",").map((s: string) => s.trim()).filter(Boolean).length > 1 && (
                      <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                        {formData.subject.split(",").map((s: string) => s.trim()).filter(Boolean).map((subj: string) => {
                          const count = (formData.questionIds || []).filter((qId: string) => {
                            const q = questions?.find(question => question.id === qId);
                            return q && q.subject.toLowerCase() === subj.toLowerCase();
                          }).length;
                          return (
                            <Badge key={subj} variant="outline" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[10px] font-bold py-0.5 px-2">
                              {subj}: {count}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* Search & Filtering for Linker */}
                <div className="grid gap-3 sm:grid-cols-4 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                  {/* Subject filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Subject</label>
                    <Input
                      placeholder="e.g., Mathematics"
                      value={qSubjectFilter}
                      onChange={e => setQSubjectFilter(e.target.value)}
                      className="h-8 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </div>

                  {/* Class level filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Class Classroom Level</label>
                    <select
                      value={qClassFilter}
                      onChange={e => setQClassFilter(e.target.value)}
                      className="border rounded-lg px-2 py-1 w-full bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800 focus:outline-none h-8 font-bold text-slate-700 dark:text-slate-350"
                    >
                      <option value="">All Classes</option>
                      {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Term filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">School Term</label>
                    <select
                      value={qTermFilter}
                      onChange={e => setQTermFilter(e.target.value)}
                      className="border rounded-lg px-2 py-1 w-full bg-white dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800 focus:outline-none h-8 font-bold text-slate-700 dark:text-slate-350"
                    >
                      <option value="">All Terms</option>
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Text search query */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Keyword Search</label>
                    <Input
                      placeholder="Search text..."
                      value={qSearchText}
                      onChange={e => setQSearchText(e.target.value)}
                      className="h-8 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Bulk operations toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850/60 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 block">
                    {filteredQuestionsForLinker.length} Question(s) Found
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={selectAllFilteredQuestions} 
                      className="text-xs text-indigo-650 hover:bg-indigo-50 dark:text-indigo-400 font-extrabold h-7 rounded-lg"
                    >
                      Select All
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAllFilteredQuestions} 
                      className="text-xs text-rose-650 hover:bg-rose-50 dark:text-rose-450 font-extrabold h-7 rounded-lg"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Question List container */}
                <div className="max-h-80 space-y-2.5 overflow-y-auto rounded-xl border border-slate-205 dark:border-slate-800 p-4 bg-slate-50/20 dark:bg-slate-950/20">
                  {filteredQuestionsForLinker.length > 0 ? (
                    filteredQuestionsForLinker.map((question) => {
                      const isSelected = formData.questionIds?.includes(question.id);
                      return (
                        <div 
                          key={question.id} 
                          onClick={() => toggleQuestionInLinker(question.id)}
                          className={`flex items-start gap-3 rounded-xl border p-3 bg-white dark:bg-slate-900 hover:border-indigo-400 hover-glow transition-all duration-350 cursor-pointer ${
                            isSelected 
                              ? "border-indigo-500/80 bg-indigo-50/5 dark:border-indigo-950/80" 
                              : "border-slate-100 dark:border-slate-850/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // toggling is handled by div click
                            className="mt-1 rounded border-slate-350 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0 pointer-events-none"
                          />
                          <div className="flex-1 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <Badge variant="secondary" className="text-[9px] font-bold py-0">{question.subject}</Badge>
                              <Badge variant="outline" className="text-[9px] font-bold py-0">{question.examType || "Objectives"}</Badge>
                              <Badge variant="outline" className="text-[9px] font-bold py-0 bg-slate-50">{question.difficulty}</Badge>
                              <Badge variant="outline" className="text-[9px] font-bold py-0 bg-slate-50">{question.classLevel}</Badge>
                            </div>
                            <p className="font-bold text-slate-700 dark:text-slate-300 leading-normal">{question.questionText}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-10 italic font-bold">
                      No questions in the bank match your search criteria. Try modifying your search filters or Subject field!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" size="lg" className="px-8" disabled={updateExamMutation.isPending}>
                {updateExamMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => setLocation("/admin/exams")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div >
  );
}
