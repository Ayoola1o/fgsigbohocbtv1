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
import type { Question, SubjectSlot, SlotType, DepartmentSubjectMapping } from "@shared/schema";
import { departments } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { TheoryStructureEditor, generateStructure, type TheorySlot } from "@/components/theory-structure-editor";
import { PrintReportTemplate } from "@/components/PrintReportTemplate";
import { createRoot } from "react-dom/client";
import { Printer, RefreshCw, Sparkles, Plus, Check, Layers, Settings2, BookOpen, ArrowRight } from "lucide-react";
import { SubjectTagInput } from "@/components/SubjectTagInput";

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
  const [useSubjectSlots, setUseSubjectSlots] = useState(false);

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
        theoryConfig: exam.theoryConfig || {
          mode: "manual",
          settings: {
            includeAlphabet: true,
            includeRoman: false,
            totalMainQuestions: 4,
            randomizeComplexity: false,
          },
          structure: [],
        },
        subjectSlots: exam.subjectSlots || [],
      });
      setUseSubjectSlots(Array.isArray(exam.subjectSlots) && exam.subjectSlots.length > 0);
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

  const handleSyncQuestionBank = (targetSubject?: string) => {
    if (!formData || !questions) return;
    const currentIds = new Set<string>(formData.questionIds || []);
    
    const subjectsToMatch = targetSubject 
      ? [targetSubject.trim().toLowerCase()]
      : (formData.subject || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);

    const isTheory = formData.examType === "Theory";

    const matchingQuestions = questions.filter(q => {
      const matchClass = !formData.classLevel || q.classLevel === formData.classLevel;
      const matchType = isTheory
        ? (q.examType === "Theory" || q.questionType === "theory")
        : (q.examType === "Objectives" || q.questionType === "objectives" || !q.examType);
      const qSubj = (q.subject || "General").trim().toLowerCase();
      const matchSubj = subjectsToMatch.length === 0 || subjectsToMatch.some((s: string) => qSubj.includes(s) || s.includes(qSubj));
      return matchClass && matchType && matchSubj;
    });

    const newQuestionIdsToAdd = matchingQuestions.map(q => q.id).filter(id => !currentIds.has(id));

    if (newQuestionIdsToAdd.length === 0) {
      toast({
        title: "Exam Pool Up to Date",
        description: targetSubject 
          ? `All matching questions from the bank for "${targetSubject}" are already linked.`
          : "All matching questions from the Question Bank are already linked to this exam paper."
      });
      return;
    }

    const updatedIds = [...(formData.questionIds || []), ...newQuestionIdsToAdd];
    setFormData({ ...formData, questionIds: updatedIds });

    toast({
      title: "Question Bank Synced",
      description: `Successfully fetched and linked ${newQuestionIdsToAdd.length} new question(s) from the Question Bank!`,
    });
  };

  const handleQuickSetQuestionCount = (targetCount: number) => {
    if (!formData) return;
    const currentCount = formData.questionIds?.length || 0;
    
    let updatedFormData = { ...formData, numberOfQuestionsToDisplay: targetCount };

    if (currentCount < targetCount && questions) {
      const currentIds = new Set<string>(formData.questionIds || []);
      const subjectsToMatch = (formData.subject || "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const isTheory = formData.examType === "Theory";

      const unlinkedMatching = questions.filter(q => {
        const matchClass = !formData.classLevel || q.classLevel === formData.classLevel;
        const matchType = isTheory
          ? (q.examType === "Theory" || q.questionType === "theory")
          : (q.examType === "Objectives" || q.questionType === "objectives" || !q.examType);
        const qSubj = (q.subject || "General").trim().toLowerCase();
        const matchSubj = subjectsToMatch.length === 0 || subjectsToMatch.some((s: string) => qSubj.includes(s) || s.includes(qSubj));
        return matchClass && matchType && matchSubj && !currentIds.has(q.id);
      });

      if (unlinkedMatching.length > 0) {
        const needed = targetCount - currentCount;
        const autoAddedIds = unlinkedMatching.slice(0, needed).map(q => q.id);
        updatedFormData.questionIds = [...(formData.questionIds || []), ...autoAddedIds];
        toast({
          title: `Question Pool Expanded to ${targetCount}`,
          description: `Auto-linked ${autoAddedIds.length} matching question(s) from the Question Bank.`
        });
      } else {
        toast({
          title: `Question Display Count Set to ${targetCount}`,
          description: `Currently ${currentCount} questions are linked in the pool.`
        });
      }
    } else {
      toast({
        title: `Question Display Count Updated`,
        description: `Students will receive a random subset of ${targetCount} questions.`
      });
    }

    setFormData(updatedFormData);
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
              const dataToSubmit = { ...formData };

              if (formData.examType !== "Theory" && useSubjectSlots) {
                if (!formData.subjectSlots || formData.subjectSlots.length === 0) {
                  toast({
                    title: "Validation Error",
                    description: "Please configure at least one subject slot or disable dynamic subject slots.",
                    variant: "destructive",
                  });
                  return;
                }

                // Validate slots
                const allSubjects = new Set<string>();
                for (const slot of formData.subjectSlots) {
                  if (!slot.name) {
                    toast({
                      title: "Validation Error",
                      description: "All subject slots must have a name.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!slot.questionCount || Number(slot.questionCount) <= 0) {
                    toast({
                      title: "Validation Error",
                      description: `Slot '${slot.name}' must have a question count greater than 0.`,
                      variant: "destructive",
                    });
                    return;
                  }

                  if (slot.type === "common") {
                    if (!slot.subject) {
                      toast({
                        title: "Validation Error",
                        description: `Common slot '${slot.name}' must have a subject assigned.`,
                        variant: "destructive",
                      });
                      return;
                    }
                    allSubjects.add(slot.subject);
                  } else {
                    // Elective slot
                    for (const dept of departments) {
                      const mapping = slot.departmentMappings?.find(
                        (m: any) => m.department.toLowerCase() === dept.toLowerCase()
                      );
                      if (!mapping || !mapping.subjects || mapping.subjects.length === 0) {
                        toast({
                          title: "Validation Error",
                          description: `Elective slot '${slot.name}' is missing a subject mapping for department '${dept}'. All departments must be mapped.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      mapping.subjects.forEach((subj: string) => allSubjects.add(subj));
                    }
                  }
                }

                // Collate subjects
                dataToSubmit.subject = Array.from(allSubjects).join(", ");
                dataToSubmit.subjectConfig = {};
                formData.subjectSlots.forEach((slot: any) => {
                  if (slot.type === "common" && slot.subject) {
                    dataToSubmit.subjectConfig[slot.subject] = slot.questionCount;
                  }
                });

                // Sum total questions
                const totalSlotQuestions = formData.subjectSlots.reduce(
                  (sum: number, slot: any) => sum + (Number(slot.questionCount) || 0),
                  0
                );
                dataToSubmit.numberOfQuestionsToDisplay = totalSlotQuestions;
                dataToSubmit.subjectSlots = formData.subjectSlots;

                // Sync matching question IDs from bank
                const filteredQIds = (questions || [])
                  .filter(
                    (q) =>
                      q.classLevel === formData.classLevel &&
                      Array.from(allSubjects).some(
                        (s) => s.toLowerCase() === q.subject.toLowerCase()
                      )
                  )
                  .map((q) => q.id);

                if (filteredQIds.length === 0) {
                  toast({
                    title: "No Questions Available",
                    description: "No matching questions were found in the bank for the slot subjects.",
                    variant: "destructive",
                  });
                  return;
                }
                dataToSubmit.questionIds = filteredQIds;
              } else {
                dataToSubmit.subjectSlots = null;
                const hasSubjectLimits = dataToSubmit.subjectConfig && Object.keys(dataToSubmit.subjectConfig).length > 1;
                if (hasSubjectLimits) {
                  const totalSubjectQuestions = Object.values(dataToSubmit.subjectConfig).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
                  dataToSubmit.numberOfQuestionsToDisplay = totalSubjectQuestions;
                } else if (!dataToSubmit.numberOfQuestionsToDisplay || Number(dataToSubmit.numberOfQuestionsToDisplay) <= 0) {
                  delete dataToSubmit.numberOfQuestionsToDisplay;
                }
              }

              updateExamMutation.mutate(dataToSubmit);
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

            <div className="space-y-2">
              <Label htmlFor="subject">Subject(s) *</Label>
              <SubjectTagInput
                value={formData.subject}
                onChange={newSubj => setFormData({ ...formData, subject: newSubj })}
                availableQuestions={questions}
                placeholder="Select or type subject tag..."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="classLevel">Class Level *</Label>
                <select
                  id="classLevel"
                  value={formData.classLevel}
                  onChange={e => {
                    const newClass = e.target.value;
                    const isSenior = ["SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].includes(newClass);
                    setFormData({
                      ...formData,
                      classLevel: newClass,
                      department: isSenior ? (formData.department || "General") : ""
                    });
                  }}
                  className="w-full border rounded-md px-3 py-2 bg-background font-semibold text-xs h-10"
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
                  className="w-full border rounded-md px-3 py-2 bg-background font-semibold text-xs h-10"
                  required
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {["SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].includes(formData.classLevel) && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department (Senior Secondary) *</Label>
                  <select
                    id="department"
                    value={formData.department || "General"}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 bg-background font-semibold text-xs h-10"
                    required
                  >
                    <option value="General">General</option>
                    <option value="Science">Science</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Art">Art</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              )}
            </div>

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
                value={formData.subjectConfig && Object.keys(formData.subjectConfig).length > 1 
                  ? (Object.values(formData.subjectConfig).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) || "")
                  : (formData.numberOfQuestionsToDisplay || "")}
                onChange={e => setFormData({ ...formData, numberOfQuestionsToDisplay: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Leave blank to show all selected questions"
                disabled={formData.examType === "Theory" || (formData.subjectConfig && Object.keys(formData.subjectConfig).length > 1)}
              />
              <p className="text-xs text-muted-foreground">
                {formData.examType === "Theory"
                  ? "Determined by theory structure for Theory exams."
                  : "If set, students will be given a random subset of this many questions from the total selected."}
              </p>
              {formData.examType !== "Theory" && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">Quick Presets:</span>
                  {[10, 20, 30, 40, 50, 60].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSetQuestionCount(preset)}
                      className={`h-7 px-2.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 ${
                        formData.numberOfQuestionsToDisplay === preset
                          ? "bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-600"
                          : "hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {preset} Qs
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, numberOfQuestionsToDisplay: undefined })}
                    className="h-7 px-2.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  >
                    Show All ({formData.questionIds?.length || 0})
                  </Button>
                </div>
              )}
            </div>

            {/* Department-Based Dynamic Subject Slots Toggle & configurator */}
            {formData.examType !== "Theory" && (
              <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50/20 dark:border-slate-800 dark:bg-slate-950/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Department-Based Dynamic Subject Slots</Label>
                    <p className="text-xs text-muted-foreground">Map different subjects to different student departments within this exam</p>
                  </div>
                  <Switch
                    checked={useSubjectSlots}
                    onCheckedChange={(checked) => {
                      setUseSubjectSlots(checked);
                      if (checked && (!formData.subjectSlots || formData.subjectSlots.length === 0)) {
                        setFormData((prev: any) => ({
                          ...prev,
                          subjectSlots: [
                            {
                              id: "slot-" + Date.now() + "-1",
                              name: "Mathematics (Common)",
                              type: "common",
                              subject: "Mathematics",
                              questionCount: 20
                            },
                            {
                              id: "slot-" + Date.now() + "-2",
                              name: "Elective Slot 1",
                              type: "elective",
                              questionCount: 20,
                              departmentMappings: departments.map(d => ({
                                department: d,
                                subjects: d === "Science" ? ["Chemistry"] : ["Government"]
                              }))
                            }
                          ]
                        }));
                      }
                    }}
                  />
                </div>

                {useSubjectSlots && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Subject Slots</span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold rounded-lg border-slate-200"
                          onClick={() => {
                            const newSlot: SubjectSlot = {
                              id: "slot-" + Date.now(),
                              name: "Common Slot " + (formData.subjectSlots.length + 1),
                              type: "common",
                              subject: "",
                              questionCount: 15
                            };
                            setFormData((prev: any) => ({
                              ...prev,
                              subjectSlots: [...prev.subjectSlots, newSlot]
                            }));
                          }}
                        >
                          + Common Slot
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold rounded-lg border-slate-200"
                          onClick={() => {
                            const newSlot: SubjectSlot = {
                              id: "slot-" + Date.now(),
                              name: "Elective Slot " + (formData.subjectSlots.length + 1),
                              type: "elective",
                              questionCount: 15,
                              departmentMappings: departments.map(d => ({
                                department: d,
                                subjects: []
                              }))
                            };
                            setFormData((prev: any) => ({
                              ...prev,
                              subjectSlots: [...prev.subjectSlots, newSlot]
                            }));
                          }}
                        >
                          + Elective Slot
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {formData.subjectSlots?.map((slot: any, index: number) => {
                        const uniqueSubjects = Array.from(new Set(questions?.filter(q => q.classLevel === formData.classLevel).map(q => q.subject) || [])).filter(Boolean);
                        return (
                          <div key={slot.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 relative space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={slot.type === "common" ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wide">
                                Slot #{index + 1}: {slot.type === "common" ? "Common Subject" : "Department Elective"}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg absolute top-2 right-2 font-bold text-lg"
                                onClick={() => {
                                  setFormData((prev: any) => ({
                                    ...prev,
                                    subjectSlots: prev.subjectSlots.filter((s: any) => s.id !== slot.id)
                                  }));
                                }}
                              >
                                ×
                              </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Slot Label / Name</Label>
                                <Input
                                  value={slot.name}
                                  onChange={(e) => {
                                    const newSlots = [...formData.subjectSlots];
                                    newSlots[index].name = e.target.value;
                                    setFormData((prev: any) => ({ ...prev, subjectSlots: newSlots }));
                                  }}
                                  className="h-8 text-xs font-semibold"
                                  placeholder="e.g. Mathematics, Science Elective A"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Question Limit</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={slot.questionCount}
                                  onChange={(e) => {
                                    const newSlots = [...formData.subjectSlots];
                                    newSlots[index].questionCount = parseInt(e.target.value) || 0;
                                    setFormData((prev: any) => ({ ...prev, subjectSlots: newSlots }));
                                  }}
                                  className="h-8 text-xs font-semibold"
                                />
                              </div>
                            </div>

                            {slot.type === "common" ? (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Subject</Label>
                                <select
                                  value={slot.subject || ""}
                                  onChange={(e) => {
                                    const newSlots = [...formData.subjectSlots];
                                    newSlots[index].subject = e.target.value;
                                    setFormData((prev: any) => ({ ...prev, subjectSlots: newSlots }));
                                  }}
                                  className="w-full border rounded-lg h-8 text-xs px-2 bg-background font-semibold"
                                >
                                  <option value="">Select subject...</option>
                                  {uniqueSubjects.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/60 pt-2.5 mt-2">
                                {(() => {
                                  const subjectMap = new Map<string, string[]>();
                                  (slot.departmentMappings || []).forEach((m: any) => {
                                    (m.subjects || []).forEach((subj: string) => {
                                      if (!subjectMap.has(subj)) subjectMap.set(subj, []);
                                      if (!subjectMap.get(subj)!.includes(m.department)) {
                                        subjectMap.get(subj)!.push(m.department);
                                      }
                                    });
                                  });
                                  const subjectOptions = Array.from(subjectMap.entries()).map(([subj, depts]) => ({ subject: subj, departments: depts }));

                                  const updateMappings = (newOptions: { subject: string; departments: string[] }[]) => {
                                    const newSlots = [...formData.subjectSlots];
                                    newSlots[index].departmentMappings = departments.map(dept => {
                                      const assignedSubjects = newOptions
                                        .filter(opt => opt.departments.some(d => d.toLowerCase() === dept.toLowerCase()))
                                        .map(opt => opt.subject);
                                      return { department: dept, subjects: assignedSubjects };
                                    });
                                    setFormData((prev: any) => ({ ...prev, subjectSlots: newSlots }));
                                  };

                                  return (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">Elective Subjects & Assigned Departments</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 rounded-md"
                                          onClick={() => {
                                            const unusedSubj = uniqueSubjects.find(s => !subjectOptions.some(o => o.subject === s)) || "";
                                            updateMappings([...subjectOptions, { subject: unusedSubj, departments: [] }]);
                                          }}
                                        >
                                          + Add Subject Option
                                        </Button>
                                      </div>

                                      {subjectOptions.length === 0 && (
                                        <div className="text-center py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                                          <p className="text-[11px] text-slate-400 font-medium">No elective subjects added to this slot yet.</p>
                                          <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="text-xs text-indigo-600 font-bold p-0 h-auto mt-1"
                                            onClick={() => {
                                              const unusedSubj = uniqueSubjects.find(s => !subjectOptions.some(o => o.subject === s)) || "";
                                              updateMappings([...subjectOptions, { subject: unusedSubj, departments: [] }]);
                                            }}
                                          >
                                            + Add First Subject Option
                                          </Button>
                                        </div>
                                      )}

                                      <div className="space-y-2.5">
                                        {subjectOptions.map((opt, optIdx) => (
                                          <div key={optIdx} className="p-2.5 bg-slate-50/70 dark:bg-slate-900/60 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 flex-1">
                                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Elective Subject:</Label>
                                                <select
                                                  value={opt.subject}
                                                  onChange={(e) => {
                                                    const newSubj = e.target.value;
                                                    const newOptions = [...subjectOptions];
                                                    newOptions[optIdx].subject = newSubj;
                                                    updateMappings(newOptions);
                                                  }}
                                                  className="flex-1 border rounded-lg h-7.5 text-xs px-2 bg-background font-semibold"
                                                >
                                                  <option value="">Select subject...</option>
                                                  {uniqueSubjects.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded font-bold"
                                                onClick={() => {
                                                  const newOptions = subjectOptions.filter((_, i) => i !== optIdx);
                                                  updateMappings(newOptions);
                                                }}
                                              >
                                                ×
                                              </Button>
                                            </div>

                                            <div className="space-y-1">
                                              <Label className="text-[9px] font-bold text-slate-400 uppercase">Departments taking this subject:</Label>
                                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {departments.map(dept => {
                                                  const isSelected = opt.departments.some(d => d.toLowerCase() === dept.toLowerCase());
                                                  return (
                                                    <Badge
                                                      key={dept}
                                                      variant={isSelected ? "default" : "outline"}
                                                      className={`cursor-pointer text-[10px] font-bold transition-all ${
                                                        isSelected
                                                          ? "bg-indigo-650 hover:bg-indigo-700 text-white"
                                                          : "hover:bg-slate-100 text-slate-600 dark:text-slate-400"
                                                      }`}
                                                      onClick={() => {
                                                        const newOptions = [...subjectOptions];
                                                        if (isSelected) {
                                                          newOptions[optIdx].departments = newOptions[optIdx].departments.filter(d => d.toLowerCase() !== dept.toLowerCase());
                                                        } else {
                                                          newOptions[optIdx].departments = [...newOptions[optIdx].departments, dept];
                                                        }
                                                        updateMappings(newOptions);
                                                      }}
                                                    >
                                                      {isSelected ? `✓ ${dept}` : `+ ${dept}`}
                                                    </Badge>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Preview Summary Card */}
                    <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-150/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                        <span>Live Mapping Preview Summary</span>
                      </div>
                      <div className="space-y-2.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-355">
                        {departments.map(dept => {
                          const deptSubjects: { name: string; count: number; type: string }[] = [];
                          formData.subjectSlots?.forEach((slot: any) => {
                            if (slot.type === "common" && slot.subject) {
                              deptSubjects.push({ name: slot.subject, count: slot.questionCount, type: "common" });
                            } else if (slot.type === "elective") {
                              const mapping = slot.departmentMappings?.find((m: any) => m.department.toLowerCase() === dept.toLowerCase());
                              if (mapping && mapping.subjects && mapping.subjects.length > 0) {
                                mapping.subjects.forEach((s: string) => {
                                  deptSubjects.push({ name: s, count: Math.ceil(slot.questionCount / mapping.subjects.length), type: "elective" });
                                });
                              }
                            }
                          });

                          const totalQuestions = deptSubjects.reduce((sum, s) => sum + s.count, 0);

                          return (
                            <div key={dept} className="flex justify-between items-start border-b border-indigo-100/30 pb-2 last:border-0 last:pb-0">
                              <div>
                                <span className="font-bold text-indigo-900 dark:text-indigo-300 block">{dept} Stream</span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {deptSubjects.length > 0 
                                    ? deptSubjects.map(s => `${s.name} (${s.count} Qs, ${s.type})`).join(" + ")
                                    : "No slots mapped yet."
                                  }
                                </span>
                              </div>
                              <Badge className="bg-indigo-650 hover:bg-indigo-650 font-bold text-[10px] text-white py-0 px-2 rounded-full">
                                {totalQuestions} Qs
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Subject Limits (Standard Multi-Subject Exam) */}
            {!useSubjectSlots && formData.examType !== "Theory" && formData.subject && formData.subject.split(",").map((s: string) => s.trim()).filter(Boolean).length > 1 && (
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider block">Question Limits & Auto-Sync per Subject</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSyncQuestionBank()}
                    className="h-7 text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Sync All Subjects
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {formData.subject.split(",").map((s: string) => s.trim()).filter(Boolean).map((subj: string) => (
                    <div key={subj} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`subject-limit-${subj}`} className="text-xs font-bold text-slate-600 dark:text-slate-400 min-w-[90px] truncate">{subj}:</Label>
                        <Input
                          id={`subject-limit-${subj}`}
                          type="number"
                          min="1"
                          placeholder="All"
                          value={formData.subjectConfig?.[subj] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            const newConfig = { ...(formData.subjectConfig || {}) };
                            if (val > 0) {
                              newConfig[subj] = val;
                            } else {
                              delete newConfig[subj];
                            }
                            setFormData({ ...formData, subjectConfig: newConfig });
                          }}
                          className="h-8 text-xs font-bold w-20 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncQuestionBank(subj)}
                        className="h-7 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 rounded-md flex items-center gap-1 shrink-0"
                        title={`Sync new ${subj} questions from bank`}
                      >
                        <RefreshCw className="h-3 w-3" /> Sync {subj}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the exact number of random questions to draw from the pool for each subject. Click <strong>Sync</strong> to automatically fetch new questions added to the bank for that subject.
                </p>
              </div>
            )}

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                      Link Questions from Question Bank
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                      Select objective or theory questions to compose this exam paper pool.
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => handleSyncQuestionBank()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Sync & Fetch New Questions
                      </Button>
                      <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold text-sm py-1.5 px-3">
                        {formData.questionIds?.length || 0} Questions Linked
                      </Badge>
                    </div>

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
