import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, BookOpen, Eye, Pencil, Trash2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Exam, Question } from "@shared/schema";
import { TheoryStructureEditor, generateStructure, type TheorySlot } from "@/components/theory-structure-editor";

export default function AdminExams() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const { data: allExams } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const filteredExams = exams?.filter(exam =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.classLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exam.department && exam.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const deleteExamMutation = useMutation({
    mutationFn: (examId: string) => apiRequest("DELETE", `/api/exams/${examId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam deleted",
        description: "The exam has been successfully deleted.",
      });
    },
  });

  const toggleExamMutation = useMutation({
    mutationFn: ({ examId, isActive }: { examId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/exams/${examId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">
            Create and manage your examination papers
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-exam">
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <ExamForm
              questions={questions || []}
              exams={allExams || []}
              onSuccess={() => {
                setIsCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exams by title, subject, class, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : exams && exams.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class Level</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id} data-testid={`row-exam-${exam.id}`}>
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{exam.subject}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{exam.classLevel}</Badge>
                      {exam.department && (
                        <Badge variant="secondary" className="text-[10px] w-fit">
                          {exam.department}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{exam.duration} mins</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{exam.examType || "Objectives"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{exam.questionIds?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={exam.isActive}
                        onCheckedChange={(checked) =>
                          toggleExamMutation.mutate({
                            examId: exam.id,
                            isActive: checked,
                          })
                        }
                        data-testid={`switch-active-${exam.id}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {exam.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/exams/${exam.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-view-${exam.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deleteExamMutation.mutate(exam.id)
                        }
                        data-testid={`button-delete-${exam.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {searchQuery ? "No Exams Found" : "No Exams Yet"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "No exams match your search criteria. Try adjusting your search terms."
                : "Get started by creating your first exam."
              }
            </p>
            {searchQuery ? (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            ) : (
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-exam">
                <Plus className="mr-2 h-4 w-4" />
                Create First Exam
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

;

type ExamFormData = {
  title: string;
  description: string;
  subject: string;
  duration: number;
  passingScore: number;
  questionIds: string[];
  classLevel: string;
  term: string;
  department: string;
  subExamIds: string[];
  numberOfQuestionsToDisplay?: number;
  theoryInstructions: string;
  examMode: "single" | "composite";
  examType: "Objectives" | "Theory";
  compositeSubjectCount: number;
  compositeSubjects: Array<{
    subject: string;
    department: "General" | "Science" | "Art" | "Commercial" | "Others";
    duration: number;
    numberOfQuestions: number;
  }>;
  theoryConfig: {
    mode: "manual" | "auto";
    settings: {
      includeAlphabet: boolean;
      includeRoman: boolean;
      totalMainQuestions: number;
      randomizeComplexity: boolean;
    };
    structure: any[];
  };
};

function ExamForm({
  questions,
  exams,
  onSuccess,
}: {
  questions: Question[];
  exams: Exam[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    description: "",
    subject: "",
    duration: 60,
    passingScore: 60,
    questionIds: [] as string[],
    classLevel: "JSS1",
    term: "First Term",
    department: "" as string,
    subExamIds: [] as string[],
    numberOfQuestionsToDisplay: undefined as number | undefined,

    theoryInstructions: "",
    examMode: "single" as "single" | "composite",
    examType: "Objectives" as "Objectives" | "Theory",
    compositeSubjectCount: 0,
    compositeSubjects: [] as Array<{
      subject: string;
      department: "General" | "Science" | "Art" | "Commercial" | "Others";
      duration: number;
      numberOfQuestions: number;
    }>,
    theoryConfig: {
      mode: "manual",
      settings: {
        includeAlphabet: true,
        includeRoman: false,
        totalMainQuestions: 4,
        randomizeComplexity: false,
      },
      structure: [] as any[],
    },
  });
  const [useSubjectSelectionLogic, setUseSubjectSelectionLogic] = useState(false);
  const [assignRandomQuestions, setAssignRandomQuestions] = useState(false);
  const [selectedExamTypes, setSelectedExamTypes] = useState<Record<string, boolean>>({
    "Objectives": true,
    "Theory": true,
  });

  const availableQuestions = questions.filter((q) => {
    // Basic filters
    let match = (formData.subject ? q.subject === formData.subject : true) &&
      (formData.classLevel ? q.classLevel === formData.classLevel : true) &&
      (formData.term ? q.term === formData.term : true);

    // Department filter
    if (formData.department) {
      if (formData.department === "General") {
        match = match && (!q.department || q.department === "General");
      } else {
        match = match && q.department === formData.department;
      }
    }

    // Exam Type filter (checkboxes)
    if (match) {
      const type = q.examType || "Objectives";
      if (!selectedExamTypes[type]) return false;
    }

    return match;
  });

  const subjectOptions = Array.from(new Set(
    questions
      .filter(q => q.classLevel === formData.classLevel)
      .map(q => q.subject)
  ));

  const getSubjectQuestionPool = (sub: { subject: string; department: string }) => {
    if (!sub.subject) return [] as Question[];
    return questions.filter(q => {
      if (formData.classLevel && q.classLevel !== formData.classLevel) return false;
      if (q.subject !== sub.subject) return false;
      if (formData.term && q.term !== formData.term) return false;
      if (sub.department === "General") {
        if (q.department && q.department !== "General") return false;
      } else if (sub.department) {
        if (q.department !== sub.department) return false;
      }
      if (formData.examType === "Theory") {
        return q.examType === "Theory" || q.questionType === "theory";
      }
      return (q.examType || "Objectives") === "Objectives";
    });
  };

  const createExamMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/exams", { ...data, assignRandomQuestions }),
    onSuccess: () => {
      toast({
        title: "Exam created",
        description: "The exam has been successfully created.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.message || "Failed to create exam. Please try again.";
      toast({
        title: "Error",
        description: Array.isArray(errorMsg) ? errorMsg[0].message : errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { ...formData };

    if (formData.examMode === "composite" && formData.compositeSubjectCount > 0) {
      if (!formData.compositeSubjectCount || formData.compositeSubjectCount <= 0) {
        toast({ title: "Invalid composite setup", description: "Please set a valid number of subjects.", variant: "destructive" });
        return;
      }

      if (formData.compositeSubjects.length !== formData.compositeSubjectCount) {
        toast({ title: "Incomplete composite setup", description: "Please fill all subject entries.", variant: "destructive" });
        return;
      }

      for (const sub of formData.compositeSubjects) {
        if (!sub.subject || sub.duration <= 0 || sub.numberOfQuestions <= 0) {
          toast({ title: "Invalid subject configuration", description: "Each composite subject must have a name, duration and question count.", variant: "destructive" });
          return;
        }
      }

      const subExamIds: string[] = [];
      let totalDuration = 0;
      let totalPoints = 0;

      for (const sub of formData.compositeSubjects) {
        const subjectQuestions = questions.filter((q) => {
          if (q.classLevel !== formData.classLevel) return false;
          if (q.subject !== sub.subject) return false;
          if (formData.term && q.term !== formData.term) return false;

          if (sub.department === "General") {
            if (q.department && q.department !== "General") return false;
          } else if (sub.department) {
            if (q.department !== sub.department) return false;
          }

          if (formData.examType === "Theory") {
            return q.examType === "Theory" || q.questionType === "theory";
          }
          return (q.examType || "Objectives") === "Objectives";
        });

        if (subjectQuestions.length < sub.numberOfQuestions) {
          toast({
            title: "Not enough questions",
            description: `Not enough questions for ${sub.subject} (${subjectQuestions.length} available, ${sub.numberOfQuestions} requested).`,
            variant: "destructive",
          });
          return;
        }

        const shuffled = [...subjectQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selected = shuffled.slice(0, sub.numberOfQuestions);

        const subExamPayload = {
          title: `${formData.title} - ${sub.subject}`,
          description: formData.description,
          subject: sub.subject,
          duration: sub.duration,
          passingScore: formData.passingScore,
          questionIds: selected.map(q => q.id),
          classLevel: formData.classLevel,
          term: formData.term,
          department: sub.department === "General" ? "General" : sub.department,
          examType: formData.examType,
          subExamIds: [],
          isActive: true,
        };

        try {
          const createdSubExam = await apiRequest("POST", "/api/exams", subExamPayload);
          subExamIds.push((createdSubExam as Exam).id);
        } catch (error: any) {
          toast({
            title: "Error",
            description: (error?.message ?? "Failed to create sub exam."),
            variant: "destructive",
          });
          return;
        }

        totalDuration += sub.duration;
        totalPoints += selected.reduce((sum, q) => sum + (q.points || 1), 0);
      }

      dataToSubmit.questionIds = [];
      dataToSubmit.subExamIds = subExamIds;
      dataToSubmit.subject = "Composite";
      dataToSubmit.duration = totalDuration;
      dataToSubmit.totalPoints = totalPoints;
      dataToSubmit.department = "General";

      createExamMutation.mutate(dataToSubmit);
      return;
    }

    if (formData.subExamIds && formData.subExamIds.length > 0) {
      dataToSubmit.questionIds = [];
      const selectedSubExams = exams.filter((e) => formData.subExamIds.includes(e.id));
      dataToSubmit.duration = selectedSubExams.reduce((sum, e) => sum + (e.duration || 0), 0);
      dataToSubmit.totalPoints = selectedSubExams.reduce((sum, e) => sum + (e.totalPoints || 0), 0);
      dataToSubmit.subject = "Composite";
    }

    if (formData.examMode === "composite" && (!formData.subExamIds || formData.subExamIds.length === 0)) {
      toast({
        title: "No sub-exams selected",
        description: "Please select at least one sub-exam to create a composite exam.",
        variant: "destructive",
      });
      return;
    }

    if (formData.examType === "Theory") {
      // In manual mode, we already have the structure in state.
      // In auto mode, we re-generate it just to be sure (though preview should have done it).
      if (formData.theoryConfig.mode === "auto") {
        const matchingQuestions = questions.filter(q =>
          (q.examType === "Theory" || q.questionType === "theory") &&
          q.classLevel === formData.classLevel &&
          q.subject === formData.subject
        );

        if (matchingQuestions.length === 0) {
          toast({
            title: "No Matching Questions",
            description: `We couldn't find any theory questions for ${formData.subject} (${formData.classLevel}). Exam will be created without question content.`,
            variant: "destructive"
          });
        }
        dataToSubmit.theoryConfig.structure = generateStructure(formData.theoryConfig.settings, matchingQuestions);
      }

      // Extract all questionIds from structure for database indexing/querying
      const extractIds = (slots: TheorySlot[]): string[] => {
        let ids: string[] = [];
        slots.forEach(slot => {
          if (slot.questionId) ids.push(slot.questionId);
          if (slot.children && slot.children.length > 0) ids = [...ids, ...extractIds(slot.children)];
        });
        return ids;
      };

      dataToSubmit.questionIds = extractIds(dataToSubmit.theoryConfig.structure);

      // If auto mode and no questionIds extracted, that's fine, the system will select random matching ones during session?
      // Actually, for Theory auto-gen, we might want the server to pick questions for these slots.
      // For now, if no questionIds are assigned, we'll store null and handle it at exam start.
    } else {
      // Objectives logic
      const wantsServerSelection = !!formData.numberOfQuestionsToDisplay && formData.numberOfQuestionsToDisplay > 0;

      if (!wantsServerSelection && formData.questionIds.length === 0) {
        toast({
          title: "No questions selected",
          description: "Please select at least one question for the exam or set 'Number of Questions to Display'.",
          variant: "destructive",
        });
        return;
      }

      if (!dataToSubmit.numberOfQuestionsToDisplay) {
        delete dataToSubmit.numberOfQuestionsToDisplay;
      }

      if (wantsServerSelection) {
        delete dataToSubmit.questionIds;
      }
    }

    createExamMutation.mutate(dataToSubmit);
  };

  const toggleQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questionIds: prev.questionIds.includes(questionId)
        ? prev.questionIds.filter((id) => id !== questionId)
        : [...prev.questionIds, questionId],
    }));
  };

  const selectAllQuestions = () => {
    setFormData((prev) => ({
      ...prev,
      questionIds: availableQuestions.map((q) => q.id),
    }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Exam</DialogTitle>
        <DialogDescription>
          Fill in the details to create a new examination
        </DialogDescription>
      </DialogHeader>
      <form id="exam-form" onSubmit={handleSubmit}>
        <div className="space-y-6 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="examMode">Exam Mode *</Label>
            <select
              id="examMode"
              value={formData.examMode}
              onChange={e => setFormData({ ...formData, examMode: e.target.value as "single" | "composite" })}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-mode"
            >
              <option value="single">Single Exam</option>
              <option value="composite">Composite Exam (Multi-subject)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="examType">Exam Type *</Label>
            <select
              id="examType"
              value={formData.examType}
              onChange={e => setFormData({ ...formData, examType: e.target.value as any })}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-type"
            >
              <option value="Objectives">Objectives (Multiple Choice)</option>
              <option value="Theory">Theory (Nested Structure)</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="classLevel">Class Level *</Label>
            <select
              id="classLevel"
              value={formData.classLevel}
              onChange={e => {
                const level = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  classLevel: level,
                  subject: "",
                  questionIds: [],
                  department: "",
                }));
              }}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-class-level"
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
              onChange={e => setFormData({ ...formData, term: e.target.value, subject: '', questionIds: [] })}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-term"
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
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value, questionIds: [] })}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-department"
            >
              <option value="">Select Department</option>
              <option value="Science">Science</option>
              <option value="Commercial">Commercial</option>
              <option value="Art">Art</option>
              <option value="Others">Others</option>
              <option value="General">General</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Exam Title *</Label>
          <Input
            id="title"
            placeholder="e.g., Mathematics Final Exam"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            data-testid="input-exam-title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the exam"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            data-testid="textarea-exam-description"
          />
        </div>

        {formData.examMode === "single" ? (
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <select
              id="subject"
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value, questionIds: [] })}
              required
              className="border rounded px-2 py-1 w-full"
              data-testid="select-exam-subject"
            >
              <option value="">Select Subject</option>
              {Array.from(new Set(questions.filter(q => 
                q.classLevel === formData.classLevel && 
                (!formData.department || q.department === formData.department || (formData.department === "General" && (!q.department || q.department === "General")))
              ).map(q => q.subject))).map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Single exam: the selected subject and question set will be used.</p>
          </div>
        ) : (
          <div className="space-y-4 border rounded p-4 bg-muted/50">
            <p className="text-sm font-medium">Composite exam configuration</p>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="compositeSubjectCount">Number of subjects *</Label>
                <Input
                  id="compositeSubjectCount"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.compositeSubjectCount || ""}
                  onChange={e => {
                    const count = parseInt(e.target.value) || 0;
                    setFormData(prev => {
                      const adjusted = [...prev.compositeSubjects];
                      while (adjusted.length < count) {
                        adjusted.push({
                          subject: "",
                          department: "General",
                          duration: 10,
                          numberOfQuestions: 10,
                        });
                      }
                      while (adjusted.length > count) adjusted.pop();
                      return {
                        ...prev,
                        compositeSubjectCount: count,
                        compositeSubjects: adjusted,
                      };
                    });
                  }}
                  required
                />
              </div>
            </div>

            {formData.compositeSubjects.map((sub, index) => (
              <div key={index} className="space-y-2 rounded border p-3">
                <p className="font-semibold">Subject {index + 1}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Subject name *</Label>
                    <select
                      value={sub.subject}
                      onChange={e => setFormData(prev => {
                        const newSubjects = [...prev.compositeSubjects];
                        newSubjects[index].subject = e.target.value;
                        return { ...prev, compositeSubjects: newSubjects };
                      })}
                      className="border rounded px-2 py-1 w-full"
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjectOptions.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {sub.subject ? `${getSubjectQuestionPool(sub).length} questions available` : "Choose subject to see availability"}
                      {sub.subject && getSubjectQuestionPool(sub).length < sub.numberOfQuestions && (
                        <span className="text-destructive"> - not enough questions for requested number</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>General or Department</Label>
                    <select
                      value={sub.department}
                      onChange={e => setFormData(prev => {
                        const newSubjects = [...prev.compositeSubjects];
                        newSubjects[index].department = e.target.value as any;
                        return { ...prev, compositeSubjects: newSubjects };
                      })}
                      className="border rounded px-2 py-1 w-full"
                    >
                      <option value="General">General</option>
                      <option value="Science">Science</option>
                      <option value="Art">Art</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={sub.duration}
                      onChange={e => setFormData(prev => {
                        const newSubjects = [...prev.compositeSubjects];
                        newSubjects[index].duration = parseInt(e.target.value) || 0;
                        return { ...prev, compositeSubjects: newSubjects };
                      })}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Number of questions</Label>
                    <Input
                      type="number"
                      min={1}
                      value={sub.numberOfQuestions}
                      onChange={e => setFormData(prev => {
                        const newSubjects = [...prev.compositeSubjects];
                        newSubjects[index].numberOfQuestions = parseInt(e.target.value) || 0;
                        return { ...prev, compositeSubjects: newSubjects };
                      })}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </div>
                </div>
              </div>
            ))}

            <p className="text-xs text-muted-foreground">You can configure each SS1 subject as general or departmental plus duration and question count.</p>
          </div>
        )}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration || ""}
              onChange={(e) =>
                setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })
              }
              required
              data-testid="input-exam-duration"
            />
          </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="passingScore">Passing Score (%) *</Label>
            <Input
              id="passingScore"
              type="number"
              min="0"
              max="100"
              value={formData.passingScore || ""}
              onChange={(e) =>
                setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })
              }
              required
              data-testid="input-exam-passing-score"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfQuestionsToDisplay">Number of Questions to Display</Label>
            <Input
              id="numberOfQuestionsToDisplay"
              type="number"
              min="0"
              disabled={formData.examType === "Theory"}
              placeholder={formData.examType === "Theory" ? "Not applicable for Theory" : `Defaults to all ${formData.questionIds.length} selected questions`}
              value={formData.numberOfQuestionsToDisplay ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, numberOfQuestionsToDisplay: e.target.value ? parseInt(e.target.value) : undefined })
              }
              data-testid="input-exam-questions-to-display"
            />
            <p className="text-sm text-muted-foreground">
              {formData.examType === "Theory"
                ? "For Theory exams, the number of questions is determined by the structure configuration."
                : "If left blank or 0, all selected questions will be used. Otherwise, a random selection of this number of questions will be presented to the student."}
            </p>
          </div>
        </div>

        {formData.examType === "Theory" && (
          <div className="space-y-6 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Theory Configuration</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={formData.theoryConfig.mode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    theoryConfig: { ...prev.theoryConfig, mode: "manual" }
                  }))}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  variant={formData.theoryConfig.mode === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    theoryConfig: { ...prev.theoryConfig, mode: "auto" }
                  }))}
                >
                  Auto
                </Button>
              </div>
            </div>

            {formData.theoryConfig.mode === "auto" ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="totalMainQuestions">Total Main Questions</Label>
                    <Input
                      id="totalMainQuestions"
                      type="number"
                      min="1"
                      value={formData.theoryConfig.settings.totalMainQuestions || 1}
                      onChange={(e) => {
                        const total = parseInt(e.target.value) || 1;
                        setFormData(prev => {
                          const newSettings = { ...prev.theoryConfig.settings, totalMainQuestions: total };
                          return {
                            ...prev,
                            theoryConfig: {
                              ...prev.theoryConfig,
                              settings: newSettings,
                              structure: generateStructure(newSettings)
                            }
                          };
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.theoryConfig.settings.includeAlphabet}
                          onCheckedChange={(checked) => setFormData(prev => {
                            const newSettings = { ...prev.theoryConfig.settings, includeAlphabet: checked };
                            return {
                              ...prev,
                              theoryConfig: {
                                ...prev.theoryConfig,
                                settings: newSettings,
                                structure: generateStructure(newSettings)
                              }
                            };
                          })}
                        />
                        <span className="text-sm">Include Alphabet (a, b, c)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.theoryConfig.settings.includeRoman}
                          onCheckedChange={(checked) => setFormData(prev => {
                            const newSettings = { ...prev.theoryConfig.settings, includeRoman: checked };
                            return {
                              ...prev,
                              theoryConfig: {
                                ...prev.theoryConfig,
                                settings: newSettings,
                                structure: generateStructure(newSettings)
                              }
                            };
                          })}
                        />
                        <span className="text-sm">Include Roman Numerals (i, ii, iii)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.theoryConfig.settings.randomizeComplexity}
                          onCheckedChange={(checked) => setFormData(prev => {
                            const newSettings = { ...prev.theoryConfig.settings, randomizeComplexity: checked };
                            return {
                              ...prev,
                              theoryConfig: {
                                ...prev.theoryConfig,
                                settings: newSettings,
                                structure: generateStructure(newSettings)
                              }
                            };
                          })}
                        />
                        <span className="text-sm">Randomize Complexity</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block text-sm font-medium">Auto-generated Structure Preview</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2 rounded border bg-background p-3 text-xs">
                    {formData.theoryConfig.structure.length === 0 && (
                      <p className="text-muted-foreground italic">No structure generated yet.</p>
                    )}
                    {formData.theoryConfig.structure.map((main: TheorySlot) => (
                      <div key={main.id} className="space-y-1">
                        <div className="font-bold text-primary">Question {main.label}</div>
                        {main.children.map((sub: TheorySlot) => (
                          <div key={sub.id} className="ml-4 flex items-center gap-2">
                            <span className="font-semibold text-secondary">({sub.label})</span>
                            <div className="flex-1 border-b border-dotted" />
                            {sub.children.map((nested: TheorySlot) => (
                              <Badge key={nested.id} variant="outline" className="text-[10px] py-0">{nested.label}.</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <TheoryStructureEditor
                structure={formData.theoryConfig.structure}
                onChange={(structure) => setFormData(prev => ({
                  ...prev,
                  theoryConfig: { ...prev.theoryConfig, structure }
                }))}
                availableQuestions={questions.filter(q => q.examType === "Theory" && q.classLevel === formData.classLevel && q.subject === formData.subject)}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="theoryInstructions">Theory Instructions</Label>
              <Textarea
                id="theoryInstructions"
                placeholder="e.g., Answer all questions. Each question carries equal marks."
                value={formData.theoryInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, theoryInstructions: e.target.value })
                }
                data-testid="textarea-theory-instructions"
              />
            </div>
          </div>
        )}

        {/* Duplicate Number of Questions to Display removed from here */}

        <div className="space-y-2">
          <Label>Question Selection Logic</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="subject-selection-logic"
              checked={useSubjectSelectionLogic}
              onChange={e => setUseSubjectSelectionLogic(e.target.checked)}
              className="mr-2"
            />
            <Label htmlFor="subject-selection-logic">Enable: Question Bank → Select Subject → Select Questions by Subject → Sort Questions by Subject</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Randomize Questions</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="assign-random-questions"
              checked={assignRandomQuestions}
              onChange={e => setAssignRandomQuestions(e.target.checked)}
              className="mr-2"
            />
            <Label htmlFor="assign-random-questions">Assign random questions to each student</Label>
          </div>
        </div>

        {formData.examMode === "composite" ? (
          <div className="rounded-md border p-4 bg-muted/10">
            <p className="text-sm text-muted-foreground">
              Composite exam mode is active. Question-level selection is disabled; exam content comes from sub-exams.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Questions * ({availableQuestions.length} available)</Label>
              <div>
                <Button variant="ghost" size="sm" onClick={selectAllQuestions} data-testid="button-select-all-questions">Select All</Button>
              </div>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-4">
              {useSubjectSelectionLogic ? (
                <>
                  <div className="mb-2">
                    <Label>Filter by Subject:</Label>
                    <select
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="ml-2 border rounded px-2 py-1"
                    >
                      <option value="">All Subjects</option>
                      {Array.from(new Set(questions.map(q => q.subject))).map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  {availableQuestions.length > 0 ? (
                    availableQuestions
                      .sort((a, b) => a.subject.localeCompare(b.subject))
                      .map((question) => (
                        <div key={question.id} className="flex items-start gap-3 rounded-md border p-3 hover-elevate">
                          <input
                            type="checkbox"
                            id={`question-${question.id}`}
                            checked={formData.questionIds.includes(question.id)}
                            onChange={() => toggleQuestion(question.id)}
                            className="mt-1"
                            data-testid={`checkbox-question-${question.id}`}
                          />
                          <Label htmlFor={`question-${question.id}`} className="flex-1 cursor-pointer text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{question.subject}</Badge>
                              <Badge variant="outline" className="text-xs">{question.examType || "Objectives"}</Badge>
                              <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
                            </div>
                            <p className="mt-1">{question.questionText}</p>
                          </Label>
                        </div>
                      ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">No questions available for the selected Class Level and Subject.</p>
                  )}
                </>
              ) : (
                availableQuestions.length > 0 ? (
                  availableQuestions.map((question) => (
                    <div key={question.id} className="flex items-start gap-3 rounded-md border p-3 hover-elevate">
                      <input
                        type="checkbox"
                        id={`question-${question.id}`}
                        checked={formData.questionIds.includes(question.id)}
                        onChange={() => toggleQuestion(question.id)}
                        className="mt-1"
                        data-testid={`checkbox-question-${question.id}`}
                      />
                      <Label htmlFor={`question-${question.id}`} className="flex-1 cursor-pointer text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{question.subject}</Badge>
                          <Badge variant="outline" className="text-xs">{question.examType || "Objectives"}</Badge>
                          <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
                        </div>
                        <p className="mt-1">{question.questionText}</p>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground">No questions available for the selected Class Level and Subject.</p>
                )
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formData.questionIds.length} question(s) selected</p>
          </div>
        )}
      </div>
    </form>
    <DialogFooter>
      <Button
        type="submit"
        disabled={createExamMutation.isPending}
        data-testid="button-submit-exam"
        form="exam-form"
      >
        {createExamMutation.isPending ? "Creating..." : "Create Exam"}
      </Button>
    </DialogFooter>
    </>
  );
}

