import React, { useState } from "react";
import { useLocation } from "wouter";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    }
  }, [exam]);

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
                  onChange={e => setFormData({ ...formData, classLevel: e.target.value })}
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
                    availableQuestions={questions?.filter(q =>
                      q.examType === "Theory" &&
                      q.classLevel === formData.classLevel &&
                      q.subject === formData.subject
                    ) || []}
                  />
                </div>
              </div>
            )}

            <Card className="bg-muted/30">
              <CardHeader className="py-4">
                <CardTitle className="text-base">Selected Questions</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-sm px-3">
                    {formData.questionIds?.length || 0} Questions Linked
                  </Badge>
                  <p className="text-xs text-muted-foreground italic self-center">
                    Questions are managed in the main exam list or theory config editor.
                  </p>
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
    </div>
  );
}
