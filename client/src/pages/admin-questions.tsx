import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, X, Upload, HelpCircle, Download, MoreVertical, Edit, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Question, InsertQuestion } from "@shared/schema";
import { Loader2 } from "lucide-react";
// consolidated React hooks and removed duplicated Dialog import above

export default function AdminQuestions() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditDialog, setBulkEditDialog] = useState<{
    isOpen: boolean;
    subject: string;
    type: 'subjectName' | 'settings';
    value?: any;
  }>({ isOpen: false, subject: '', type: 'subjectName' });

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: string[], updates: Partial<Question> }) => {
      return apiRequest("PATCH", "/api/questions/bulk", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setBulkEditDialog(prev => ({ ...prev, isOpen: false }));
      toast({ title: "Updated successfully", description: "Questions have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update questions.", variant: "destructive" });
    },
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [csvClassLevel, setCsvClassLevel] = useState<string>("");
  const [csvSubject, setCsvSubject] = useState<string>("");
  const [csvTerm, setCsvTerm] = useState<string>("First Term");
  const [csvDepartment, setCsvDepartment] = useState<string>("");
  const [csvExamType, setCsvExamType] = useState<string>("Objectives");

  const [showClassLevelDialog, setShowClassLevelDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Bulk Image Upload State
  const [missingImages, setMissingImages] = useState<string[]>([]);
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [uploadedImageMap, setUploadedImageMap] = useState<Record<string, string>>({});
  const [imageUploadProgress, setImageUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    type: 'single' | 'selected' | 'all';
    id?: string; // for single
    count?: number; // for display
  }>({ isOpen: false, type: 'single' });

  // wire file input change
  useEffect(() => {
    const el = document.getElementById("questions-csv") as HTMLInputElement | null;
    if (!el) return;
    const onChange = async (e: Event) => {
      const input = e.currentTarget as HTMLInputElement;
      const file = input.files && input.files[0];
      if (!file) return;
      const text = await file.text();
      const rows: any[] = [];
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        toast({ title: "Error", description: "Empty CSV file", variant: "destructive" });
        return;
      }
      // detect header
      const headerParts = lines[0].split(",").map((p) => p.trim());
      const hasHeader = headerParts.some((h) =>
        /question/i.test(h) || /questionText/i.test(h) || /question_text/i.test(h) ||
        /class/i.test(h) || /subject/i.test(h)
      );

      const cols = hasHeader
        ? headerParts
        : ["questionText", "questionType", "difficulty", "options", "correctAnswer", "points", "imageUrl", "classLevel", "term", "examType", "subject", "department"];


      const foundImages = new Set<string>();

      const startIndex = hasHeader ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        // Handle CSV parsing more robustly strictly for commas
        // Ideally use a library but for now we try to respect quotes if simple
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        const line = lines[i];

        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());


        if (parts.length === 0) continue;
        const obj: any = {};
        for (let c = 0; c < cols.length; c++) {
          let val = parts[c] ?? "";
          // Remove surrounding quotes if present
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          }
          obj[cols[c]] = val;
        }

        // --- Normalization Logic ---

        // 1. Question Type: "Multiple Choice" -> "multiple-choice"
        if (obj.questionType) {
          const qt = obj.questionType.toLowerCase();
          if (qt.includes("multiple")) obj.questionType = "multiple-choice";
          else if (qt.includes("theory")) obj.questionType = "theory";
          else if (qt.includes("true")) obj.questionType = "true-false";
          else if (qt.includes("short")) obj.questionType = "short-answer";
        }

        // 2. Exam Type: "Objective" -> "Objectives"
        if (obj.examType) {
          const et = obj.examType.toLowerCase();
          if (et.includes("objective")) obj.examType = "Objectives";
          else if (et.includes("theory")) obj.examType = "Theory";
        }

        // 3. Options Parsing: "(a) Apple (b) Banana" -> ["(a) Apple", "(b) Banana"]
        if (obj.options && typeof obj.options === "string") {
          const v = obj.options;
          // Check for (a) ... (b) ... pattern
          if (/\([a-e]\)/.test(v)) {
            // Split by looking ahead for next option like (b)
            // We want to keep the delimiter. 
            // Regex strategy: match (x) and everything until next (y) or end
            // Simple approach: split by `(` but that removes it.
            // Better: matches
            const matches = v.match(/\([a-e]\)\s*[^()]+/g);
            if (matches && matches.length > 0) {
              obj.options = matches.map((s: string) => s.trim());
            } else {
              // Fallback catch-all
              try { obj.options = JSON.parse(v); } catch { obj.options = v.split("|").map((s: string) => s.trim()).filter(Boolean); }
            }
          } else {
            try { obj.options = JSON.parse(v); } catch { obj.options = v.split("|").map((s: string) => s.trim()).filter(Boolean); }
          }
        }

        // 4. Term Normalization
        if (obj.term) {
          const t = obj.term.toLowerCase();
          if (t.includes("1st") || t.includes("first")) obj.term = "First Term";
          else if (t.includes("2nd") || t.includes("second")) obj.term = "Second Term";
          else if (t.includes("3rd") || t.includes("third")) obj.term = "Third Term";
        }

        // 5. Class Level Normalization (Basic Mapping)
        if (obj.classLevel) {
          const cl = obj.classLevel.toUpperCase().replace(/\s/g, ''); // SSS1 -> SSS1
          // Map SSS to SS
          if (cl.startsWith("SSS")) obj.classLevel = cl.replace("SSS", "SS"); // SSS1 -> SS1
          else if (cl.startsWith("JSS")) obj.classLevel = cl; // JSS1 -> JSS1
        }


        // coerce points
        if (obj.points) obj.points = Number(obj.points) || 1;

        // Detect possible image filenames
        if (obj.imageUrl && typeof obj.imageUrl === "string" && !obj.imageUrl.startsWith("http")) {
          const val = obj.imageUrl.trim();
          if (val.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
            foundImages.add(val);
          }
        }

        rows.push(obj);
      }

      // Auto-fill global selects from first row if valid, to ease UI interaction
      if (rows.length > 0) {
        if (rows[0].classLevel && ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].includes(rows[0].classLevel)) setCsvClassLevel(rows[0].classLevel);
        if (rows[0].subject) setCsvSubject(rows[0].subject);
        if (rows[0].term) setCsvTerm(rows[0].term);
        if (rows[0].department) setCsvDepartment(rows[0].department);
        if (rows[0].examType) setCsvExamType(rows[0].examType);

      }

      // Show class level dialog before setting preview rows
      setPreviewRows(rows);
      setMissingImages(Array.from(foundImages));
      setUploadedImageMap({});
      setShowClassLevelDialog(true);
      input.value = "";
    };
    el.addEventListener("change", onChange as any);
    return () => el.removeEventListener("change", onChange as any);
  }, []);

  const uploadPreview = async (opts?: { chunkSize?: number }) => {
    let rows = previewRows;
    if (!rows || rows.length === 0) {
      toast({ title: "Error", description: "No rows to upload", variant: "destructive" });
      return;
    }
    // Assign selected class level and subject to all rows
    if (!csvClassLevel || !csvSubject || !csvTerm || !csvExamType) {
      toast({ title: "Error", description: "Please select class level, term, exam type, and subject before uploading.", variant: "destructive" });
      return;
    }

    const isSSS = ["SS1", "SS2", "SS3"].includes(csvClassLevel);
    if (isSSS && !csvDepartment) {
      toast({ title: "Error", description: "Please select a department for SSS classes.", variant: "destructive" });
      return;
    }


    // Apply uploaded image URLs
    rows = rows.map(row => {
      let imageUrl = row.imageUrl;
      if (imageUrl && uploadedImageMap[imageUrl]) {
        imageUrl = uploadedImageMap[imageUrl];
      }
      let rowOptions = row.options;
      let rowCorrectAnswer = row.correctAnswer;

      if (csvExamType === "Theory") {
        row.questionType = "theory";
        rowOptions = undefined; // No options for theory
        if (!rowCorrectAnswer || String(rowCorrectAnswer).trim() === "") {
          rowCorrectAnswer = "Theory Question"; // Default if missing
        }
      } else if (rowOptions?.length > 0 && rowCorrectAnswer) {
        // Validation/Normalization for Objective/Multiple Choice
        const normalizedCorrect = String(rowCorrectAnswer).trim();

        // 1. Try exact match (case insensitive)
        const exactMatch = rowOptions.find((o: string) => o.trim().toLowerCase() === normalizedCorrect.toLowerCase());

        if (exactMatch) {
          rowCorrectAnswer = exactMatch;
        } else {
          // 2. Try matching by index/letter (e.g. "a" matches "(a) ...", "A" matches "A. ...")
          // Common patterns: "a", "b", "c" OR "0", "1", "2"

          // Check if correct answer is a single letter (handles "a", "(a)", "a.", etc)
          const letterMatch = normalizedCorrect.match(/^\(?([a-eA-E])\)?\.?$/);
          const isLetter = !!letterMatch;
          // Check if correct answer is a number (1-based or 0-based?) - usually 0-based in array context but 1-based in user mind
          const isDigit = /^\d+$/.test(normalizedCorrect);

          let matchedOption: string | undefined;

          if (isLetter) {
            const letter = letterMatch![1].toLowerCase();
            const index = letter.charCodeAt(0) - 97; // 'a' -> 0

            // First check by direct index if within bounds
            if (index >= 0 && index < rowOptions.length) {
              // But wait, user might mean option starting with 'a' NOT index 0 necessarily if shuffled (though import assumes ordered)
              // Better to check prefixes
              matchedOption = rowOptions.find((o: string) => {
                const lower = o.toLowerCase().trim();
                return lower.startsWith(`(${letter})`) || lower.startsWith(`${letter}.`) || lower.startsWith(`${letter})`);
              });

              // Fallback to index if no prefix match found (assuming strict order A, B, C...)
              if (!matchedOption) {
                matchedOption = rowOptions[index];
              }
            }
          } else if (isDigit) {
            const idx = parseInt(normalizedCorrect, 10);
            // Assume 1-based if > 0? or 0-based? Let's assume 0-indexed if < length
            if (idx >= 0 && idx < rowOptions.length) {
              matchedOption = rowOptions[idx];
            }
          }

          // 3. Try matching "Letter Text" format (e.g. "C unrepentant")
          const compositeMatch = normalizedCorrect.match(/^([a-eA-E])\s+(.+)$/);
          if (compositeMatch && !matchedOption) {
            const letter = compositeMatch[1].toLowerCase();
            const textPart = compositeMatch[2].trim();
            const index = letter.charCodeAt(0) - 97;

            // Try to match text part first
            const textMatch = rowOptions.find((o: string) => o.trim().toLowerCase() === textPart.toLowerCase());
            if (textMatch) {
              matchedOption = textMatch;
            }
            // If text doesn't match exactly, fallback to using the letter as index
            else if (index >= 0 && index < rowOptions.length) {
              matchedOption = rowOptions[index];
            }
          }

          if (matchedOption) {
            rowCorrectAnswer = matchedOption;
          }
        }
      }

      return {
        ...row,
        // Prioritize row data if present, otherwise fall back to global selection
        classLevel: row.classLevel || csvClassLevel,
        subject: row.subject || csvSubject,
        term: row.term || csvTerm,
        department: row.department || csvDepartment,
        examType: row.examType || csvExamType,

        imageUrl,
        options: rowOptions,
        correctAnswer: rowCorrectAnswer
      };
    });

    const chunkSize = opts?.chunkSize ?? 100;
    let uploaded = 0;
    setUploadProgress({ uploaded, total: rows.length });
    const errors: any[] = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        const body = await apiRequest("POST", "/api/questions/bulk", chunk) as any;
        uploaded += body.insertedCount || 0;
        if (body.errors && body.errors.length) errors.push(...body.errors);
      } catch (e: any) {
        errors.push({ chunkIndex: i / chunkSize, error: e.message });
      }
      setUploadProgress({ uploaded, total: rows.length });
    }
    setUploadProgress(null);
    if (errors.length) {
      toast({
        title: "Upload Completed with Errors",
        description: `${errors.length} issues found. Check console for details.`,
        variant: "destructive"
      });
      // eslint-disable-next-line no-console
      console.error(errors);
    } else {
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${uploaded} questions.`
      });
    }
    setPreviewRows([]);
    setCsvClassLevel("");
    setCsvSubject("");
    setCsvTerm("First Term");
    setCsvDepartment("");
    setCsvExamType("Objectives");

    setShowClassLevelDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
  };

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      apiRequest("DELETE", `/api/questions/${questionId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Question deleted",
        description: "The question has been successfully deleted.",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest("DELETE", "/api/questions", { ids });
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setSelectedIds(new Set());
      toast({ title: "Questions deleted", description: `Deleted ${ids?.length || 0} question(s)` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete questions.", variant: "destructive" });
    },
  });

  const subjects = questions
    ? Array.from(new Set(questions.map((q) => q.subject)))
    : [];

  const filteredQuestions = questions?.filter((q) => {
    const subjectMatch = filterSubject && filterSubject !== "__all__" ? q.subject === filterSubject : true;
    const departmentMatch = filterDepartment && filterDepartment !== "__all__" ? q.department === filterDepartment : true;
    return subjectMatch && departmentMatch;
  });


  const questionsBySubject = filteredQuestions
    ? filteredQuestions.reduce((acc, question) => {
      const subject = question.subject || "Uncategorized";
      if (!acc[subject]) {
        acc[subject] = {
          questions: [],
          classLevels: new Set<string>(),
        };
      }
      acc[subject].questions.push(question);
      if (question.classLevel) {
        acc[subject].classLevels.add(question.classLevel);
      }
      return acc;
    }, {} as Record<string, { questions: Question[]; classLevels: Set<string> }>)
    : {};

  const handleConfirmDelete = () => {
    const { type, id } = deleteDialogState;
    if (type === 'single' && id) deleteQuestionMutation.mutate(id);
    if (type === 'selected') {
      const ids = Array.from(selectedIds);
      bulkDeleteMutation.mutate(ids);
    }
    if (type === 'all') {
      if (id && questions) {
        // Delete all in subject
        const subjectIds = questions.filter(q => q.subject === id).map(q => q.id);
        bulkDeleteMutation.mutate(subjectIds);
      } else if (questions) {
        // Delete ALL
        bulkDeleteMutation.mutate(questions.map(q => q.id));
      }
    }
    setDeleteDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const [subjectFilters, setSubjectFilters] = useState<Record<string, { classLevel: string; term: string; examType: string }>>({});

  // ... (previous code)

  const updateSubjectFilter = (subject: string, key: 'classLevel' | 'term' | 'examType', value: string) => {
    setSubjectFilters(prev => ({
      ...prev,
      [subject]: {
        ...(prev[subject] || { classLevel: "All", term: "All", examType: "All" }),
        [key]: value
      }
    }));
  };

  const downloadTemplate = (type: 'objectives' | 'theory') => {
    let headers = [
      "classLevel",
      "term",
      "examType",
      "subject",
      "questionText",
      "questionType",
      "difficulty",
      "points"
    ];

    if (type === 'objectives') {
      headers.push("correctAnswer", "options");
    }

    const csvContent = headers.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `question_template_${type}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">
              Manage your collection of exam questions
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-question">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <QuestionForm
                  onSuccess={() => {
                    setIsCreateOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("questions-csv")?.click()}
              disabled={!!uploadProgress}
            >
              {uploadProgress ? (
                `Uploading ${Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%`
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload CSV
                </>
              )}
            </Button>
            <input
              type="file"
              id="questions-csv"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelpDialog(true)}
            >
              <HelpCircle className="mr-2 h-4 w-4" /> CSV Help
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('objectives')}>
              <Download className="mr-2 h-4 w-4" /> Template (Obj)
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate('theory')}>
              <Download className="mr-2 h-4 w-4" /> Template (Theory)
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Art">Art</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>





          <div className="flex gap-2 ml-auto">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogState({ isOpen: true, type: 'selected', id: undefined })}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogState({ isOpen: true, type: 'all', id: undefined })}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete All
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showClassLevelDialog} onOpenChange={setShowClassLevelDialog}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Default Values for CSV Import</DialogTitle>
            <DialogDescription>
              Please select the class level, term, subject, and exam type for the imported questions.
              These values will be applied to all questions in the CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csv-class-level">Class Level *</Label>
              <select
                id="csv-class-level"
                value={csvClassLevel}
                onChange={e => setCsvClassLevel(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="">Select Class Level</option>
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
              <Label htmlFor="csv-term">Term *</Label>
              <select
                id="csv-term"
                value={csvTerm}
                onChange={e => setCsvTerm(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
                <option value="Others">Others</option>
              </select>
            </div>
            {["SS1", "SS2", "SS3"].includes(csvClassLevel) && (
              <div className="space-y-2">
                <Label htmlFor="csv-department">Department *</Label>
                <select
                  id="csv-department"
                  value={csvDepartment}
                  onChange={e => setCsvDepartment(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="">Select Department</option>
                  <option value="Science">Science</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Art">Art</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            )}
            <div className="space-y-2">

              <Label htmlFor="csv-exam-type">Exam Type *</Label>
              <select
                id="csv-exam-type"
                value={csvExamType}
                onChange={e => setCsvExamType(e.target.value)}
                className="border rounded px-2 py-1 w-full"
              >
                <option value="Objectives">Objectives</option>
                <option value="Theory">Theory</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-subject">Subject *</Label>
              <Input
                id="csv-subject"
                placeholder="e.g., Mathematics"
                value={csvSubject}
                onChange={e => setCsvSubject(e.target.value)}
              />
            </div>
            {previewRows.length > 0 && (
              <div className="rounded-md bg-muted p-4">
                <div className="text-sm font-medium mb-2">CSV Preview ({previewRows.length} rows)</div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {previewRows.slice(0, 3).map((row, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap border-b pb-1 last:border-0">
                      {Object.values(row).join(", ")}
                    </div>
                  ))}
                  {previewRows.length > 3 && (
                    <div className="text-muted-foreground italic">...and {previewRows.length - 3} more</div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Review parsed rows below before uploading. Invalid rows will be reported by the server.
                </p>
                <div className="text-sm font-medium mt-2">
                  Class: <Badge>{csvClassLevel}</Badge>, Term: <Badge>{csvTerm}</Badge>, Type: <Badge>{csvExamType}</Badge>, Subject: <Badge>{csvSubject}</Badge>
                  {csvDepartment && <>, Dept: <Badge>{csvDepartment}</Badge></>}
                </div>

              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassLevelDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              setShowClassLevelDialog(false);
              if (missingImages.length > 0) {
                setShowImageUploadDialog(true);
              } else {
                uploadPreview();
              }
            }} disabled={!csvClassLevel || !csvSubject || !csvTerm || !csvExamType || (["SS1", "SS2", "SS3"].includes(csvClassLevel) && !csvDepartment)}>
              Next
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageUploadDialog} onOpenChange={setShowImageUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Missing Images</DialogTitle>
            <DialogDescription>
              The CSV contains {missingImages.length} image references. Please select and upload these files from your computer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm bg-muted">
              <p className="font-semibold mb-2">Required Files:</p>
              <ul className="list-disc pl-5">
                {missingImages.map((img, i) => (
                  <li key={i} className={uploadedImageMap[img] ? "text-green-600 line-through" : "text-red-500"}>
                    {img} {uploadedImageMap[img] && "(Ready)"}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Select Images</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  if (!e.target.files?.length) return;
                  const files = Array.from(e.target.files);
                  const newMap = { ...uploadedImageMap };
                  let count = 0;

                  setImageUploadProgress({ current: 0, total: files.length });

                  for (const file of files) {
                    // Check if this file is needed
                    if (missingImages.includes(file.name)) {
                      try {
                        const formData = new FormData();
                        formData.append("file", file);

                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: formData
                        });

                        if (!res.ok) throw new Error("Upload failed");

                        const data = await res.json();
                        newMap[file.name] = data.url;
                        count++;
                      } catch (err: any) {
                        console.error(`Failed to upload ${file.name}`, err);
                        toast({
                          title: "Upload Error",
                          description: `Failed to upload ${file.name}: ${err.message}`,
                          variant: "destructive"
                        });
                      }
                    }
                    setImageUploadProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
                  }

                  setUploadedImageMap(newMap);
                  setImageUploadProgress(null);
                  toast({
                    title: "Images Processed",
                    description: `Matched and uploaded ${count} images.`,
                  });
                }}
              />
              {imageUploadProgress && (
                <div className="text-xs text-muted-foreground">
                  Uploading... {imageUploadProgress.current} / {imageUploadProgress.total}
                </div>
              )}
            </div>

            <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
              Note: Unmatched images will be ignored. Rows with missing images will save without an image.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageUploadDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              setShowImageUploadDialog(false);
              uploadPreview();
            }}>
              Continue Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Filter by subject..."
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="max-w-sm"
        />
        {filterSubject && (
          <Button
            variant="ghost"
            onClick={() => setFilterSubject("")}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredQuestions && filteredQuestions.length > 0 ? (
        <Accordion type="multiple" className="w-full">
          {Object.entries(questionsBySubject).map(([subject, { questions: subjectQuestions, classLevels }]) => {
            const currentFilters = subjectFilters[subject] || { classLevel: "All", term: "All", examType: "All" };

            const displayQuestions = subjectQuestions.filter(q => {
              const matchClass = currentFilters.classLevel === "All" || q.classLevel === currentFilters.classLevel;
              const matchTerm = currentFilters.term === "All" || (q.term || "First Term") === currentFilters.term;
              const matchType = currentFilters.examType === "All" || (q.examType || "Objectives") === currentFilters.examType;
              return matchClass && matchTerm && matchType;
            });

            return (
              <AccordionItem value={subject} key={subject} className="mb-4 rounded-lg border bg-card">
                <AccordionTrigger className="p-6 text-left hover:no-underline">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full items-center justify-between pr-6">
                      <h3 className="text-lg font-semibold text-card-foreground">{subject}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setBulkEditDialog({ isOpen: true, subject, type: 'subjectName', value: subject });
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Subject Name
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setBulkEditDialog({ isOpen: true, subject, type: 'settings' });
                          }}>
                            <Settings className="mr-2 h-4 w-4" />
                            Bulk Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialogState({
                                isOpen: true,
                                type: 'all',
                                count: subjectQuestions.length,
                                id: subject // Using id to store subject name for context if needed
                              });
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All in Subject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subjectQuestions.length} Questions | Class Levels: {Array.from(classLevels).join(', ')}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                  <div className="mb-4 flex flex-wrap gap-4">
                    <div className="w-40">
                      <Label className="text-xs mb-1 block">Class</Label>
                      <Select
                        value={currentFilters.classLevel}
                        onValueChange={(val) => updateSubjectFilter(subject, 'classLevel', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All</SelectItem>
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
                    <div className="w-40">
                      <Label className="text-xs mb-1 block">Term</Label>
                      <Select
                        value={currentFilters.term}
                        onValueChange={(val) => updateSubjectFilter(subject, 'term', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="First Term">1st</SelectItem>
                          <SelectItem value="Second Term">2nd</SelectItem>
                          <SelectItem value="Third Term">3rd</SelectItem>
                          <SelectItem value="Others">Oth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-40">
                      <Label className="text-xs mb-1 block">Type</Label>
                      <Select
                        value={currentFilters.examType}
                        onValueChange={(val) => updateSubjectFilter(subject, 'examType', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="Objectives">Obj</SelectItem>
                          <SelectItem value="Theory">Theory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {displayQuestions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              aria-label={`select-all-${subject}`}
                              checked={displayQuestions.length > 0 && displayQuestions.every(q => selectedIds.has(q.id))}
                              onChange={(e) => {
                                const newSelectedIds = new Set(selectedIds);
                                const subjectQuestionIds = displayQuestions.map(q => q.id);
                                if (e.currentTarget.checked) {
                                  subjectQuestionIds.forEach(id => newSelectedIds.add(id));
                                } else {
                                  subjectQuestionIds.forEach(id => newSelectedIds.delete(id));
                                }
                                setSelectedIds(newSelectedIds);
                              }}
                            />
                          </TableHead>
                          <TableHead className="w-1/2">Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayQuestions.map((question) => (
                          <TableRow key={question.id} data-testid={`row-question-${question.id}`}>
                            <TableCell>
                              <input
                                type="checkbox"
                                aria-label={`select-question-${question.id}`}
                                checked={selectedIds.has(question.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedIds);
                                  if (e.currentTarget.checked) next.add(question.id);
                                  else next.delete(question.id);
                                  setSelectedIds(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {question.imageUrl && (
                                  <img
                                    src={question.imageUrl}
                                    alt="Question Image"
                                    className="mb-2 h-16 w-auto object-contain rounded border bg-muted"
                                  />
                                )}
                                <span>{question.questionText}</span>
                              </div>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{question.classLevel}</Badge>
                                {question.department && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    {question.department}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{(question.term === "First Term" ? "1st" : question.term === "Second Term" ? "2nd" : question.term === "Third Term" ? "3rd" : "Oth")}</Badge>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{(question.examType === "Objectives" ? "Obj" : "Theory")}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[100px] truncate">
                              <Badge variant="outline" className="truncate max-w-full">{question.questionType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  question.difficulty === "easy"
                                    ? "default"
                                    : question.difficulty === "medium"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {question.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell>{question.term || "First Term"}</TableCell>
                            <TableCell>{question.points}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingQuestion(question)}
                                  data-testid={`button-edit-${question.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteDialogState({ isOpen: true, type: 'single', id: question.id })}
                                  data-testid={`button-delete-${question.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No questions match the selected filters.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Plus className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {filterSubject ? "No Questions Found" : "No Questions Yet"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {filterSubject
                ? `No questions found for ${filterSubject}`
                : "Get started by adding your first question."}
            </p>
            {!filterSubject && (
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-question">
                <Plus className="mr-2 h-4 w-4" />
                Add First Question
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog kept as is */}
      <AlertDialog open={deleteDialogState.isOpen} onOpenChange={(open) => setDeleteDialogState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogState.type === 'single' && "This will permanently delete the selected question."}
              {deleteDialogState.type === 'selected' && `This will permanently delete ${deleteDialogState.count} selected questions.`}
              {deleteDialogState.type === 'all' && `This will permanently delete ALL ${deleteDialogState.count} questions. This action implies a total reset of the question bank.`}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Question Dialog */}
      <Dialog open={editingQuestion !== null} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <QuestionForm
            initialData={editingQuestion!}
            onSuccess={() => {
              setEditingQuestion(null);
              queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Subject Name Dialog */}
      <Dialog
        open={bulkEditDialog.isOpen && bulkEditDialog.type === 'subjectName'}
        onOpenChange={(open) => !open && setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject Name</DialogTitle>
            <DialogDescription>
              This will update the subject name for all questions in "{bulkEditDialog.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Subject Name</Label>
              <Input
                value={bulkEditDialog.value || ""}
                onChange={(e) => setBulkEditDialog(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter new subject name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button
              disabled={bulkUpdateMutation.isPending || !bulkEditDialog.value}
              onClick={() => {
                const subjectQuestions = questions?.filter(q => q.subject === bulkEditDialog.subject) || [];
                bulkUpdateMutation.mutate({
                  ids: subjectQuestions.map(q => q.id),
                  updates: { subject: bulkEditDialog.value }
                });
              }}
            >
              {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Settings Dialog */}
      <Dialog
        open={bulkEditDialog.isOpen && bulkEditDialog.type === 'settings'}
        onOpenChange={(open) => !open && setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Settings</DialogTitle>
            <DialogDescription>
              Update Class Level, Term, or Exam Type for all questions in "{bulkEditDialog.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Level</Label>
                <Select
                  value={bulkEditDialog.value?.classLevel || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), classLevel: val } }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  value={bulkEditDialog.value?.term || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), term: val } }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                  <SelectContent>
                    {["First Term", "Second Term", "Third Term", "Others"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select
                  value={bulkEditDialog.value?.examType || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), examType: val } }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    {["Objectives", "Theory"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={bulkEditDialog.value?.department || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), department: val } }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {["Science", "Commercial", "Art", "Others"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button
              disabled={bulkUpdateMutation.isPending || !bulkEditDialog.value}
              onClick={() => {
                const subjectQuestions = questions?.filter(q => q.subject === bulkEditDialog.subject) || [];
                bulkUpdateMutation.mutate({
                  ids: subjectQuestions.map(q => q.id),
                  updates: bulkEditDialog.value
                });
              }}
            >
              {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

function QuestionForm({ onSuccess, initialData }: { onSuccess: () => void; initialData?: Question }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertQuestion & { classLevel?: string; term?: string; examType?: string; department?: string }>({
    questionText: initialData?.questionText || "",
    questionType: (initialData?.questionType as any) || "multiple-choice",
    subject: initialData?.subject || "",
    difficulty: (initialData?.difficulty as any) || "medium",
    options: initialData?.options || ["", "", "", ""],
    correctAnswer: initialData?.correctAnswer || "",
    points: initialData?.points || 1,
    classLevel: (initialData?.classLevel as any) || "JSS1",
    term: (initialData?.term as any) || "First Term",
    examType: (initialData?.examType as any) || "Objectives",
    department: (initialData?.department as any) || "",
    imageUrl: initialData?.imageUrl || "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const questionMutation = useMutation({
    mutationFn: (data: InsertQuestion) => {
      if (initialData?.id) {
        return apiRequest("PATCH", `/api/questions/${initialData.id}`, data);
      }
      return apiRequest("POST", "/api/questions", data);
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Question updated" : "Question added",
        description: initialData
          ? "The question has been successfully updated."
          : "The question has been successfully added to the bank.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${initialData ? "update" : "add"} question. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = { ...formData };

    // Handle Theory Questions
    if (formData.examType === "Theory") {
      submitData.questionType = "theory" as any;
      submitData.options = undefined;
      // Set a placeholder correct answer if none provided (since it's not applicable for theory)
      if (!submitData.correctAnswer || submitData.correctAnswer.trim() === "") {
        submitData.correctAnswer = "Theory Question";
      }
    } else if (formData.questionType === "true-false") {
      submitData.options = undefined;
    } else if (formData.questionType === "short-answer") {
      submitData.options = undefined;
    } else {
      submitData.options = formData.options?.filter((o) => o.trim());
      if (!submitData.options || submitData.options.length < 2) {
        toast({
          title: "Invalid options",
          description: "Please provide at least 2 options for multiple choice questions.",
          variant: "destructive",
        });
        return;
      }
    }

    questionMutation.mutate(submitData);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if ((formData.options || []).length < 5) {
      setFormData({ ...formData, options: [...(formData.options || []), ""] });
    }
  };

  const removeOption = (index: number) => {
    const newOptions = (formData.options || []).filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast({ title: "Image uploaded", description: "Image has been attached to the question." });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit Question" : "Add New Question"}</DialogTitle>
        <DialogDescription>
          {initialData ? "Update the question details" : "Create a new question for your question bank"}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 py-6">
        <div className="space-y-2">
          <Label htmlFor="questionText">Question Text *</Label>
          <Textarea
            id="questionText"
            placeholder="Enter your question here"
            value={formData.questionText}
            onChange={(e) =>
              setFormData({ ...formData, questionText: e.target.value })
            }
            required
            data-testid="textarea-question-text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Question Image (Optional)</Label>
          <div className="flex items-center gap-4">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="cursor-pointer"
            />
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {formData.imageUrl && (
            <div className="mt-2 relative inline-block">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="h-32 w-auto object-contain rounded border bg-muted"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => setFormData({ ...formData, imageUrl: "" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type *</Label>
            <Select
              value={formData.questionType}
              onValueChange={(value: any) =>
                setFormData({ ...formData, questionType: value })
              }
            >
              <SelectTrigger data-testid="select-question-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="true-false">True/False</SelectItem>
                <SelectItem value="short-answer">Short Answer</SelectItem>
                <SelectItem value="theory">Theory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="e.g., Mathematics"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
              data-testid="input-question-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="classLevel">Class Level *</Label>
            <Select
              value={formData.classLevel}
              onValueChange={(value: any) =>
                setFormData({ ...formData, classLevel: value })

              }
            >
              <SelectTrigger data-testid="select-class-level">
                <SelectValue placeholder="Select class level" />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={formData.department}
            onValueChange={(value: any) =>
              setFormData({ ...formData, department: value })
            }
          >
            <SelectTrigger data-testid="select-department">
              <SelectValue placeholder="Select dept" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Others">Others</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <div className="space-y-2">
            <Label htmlFor="term">Term *</Label>
            <Select
              value={formData.term}
              onValueChange={(value: any) =>
                setFormData({ ...formData, term: value })
              }
            >
              <SelectTrigger data-testid="select-term">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="First Term">First Term</SelectItem>
                <SelectItem value="Second Term">Second Term</SelectItem>
                <SelectItem value="Third Term">Third Term</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="examType">Exam Type *</Label>
            <Select
              value={formData.examType}
              onValueChange={(value: any) =>
                setFormData({ ...formData, examType: value })
              }
            >
              <SelectTrigger data-testid="select-exam-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Objectives">Objectives</SelectItem>
                <SelectItem value="Theory">Theory</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty *</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value: any) =>
                setFormData({ ...formData, difficulty: value })
              }
            >
              <SelectTrigger data-testid="select-difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Points *</Label>
            <Input
              id="points"
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) =>
                setFormData({ ...formData, points: parseInt(e.target.value) || 1 })
              }
              required
              data-testid="input-question-points"
            />
          </div>
        </div>

        {formData.questionType === "multiple-choice" && (
          <div className="space-y-4">
            <Label>Options *</Label>
            <div className="grid gap-4">
              {formData.options?.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    required
                    data-testid={`input-option-${index}`}
                  />
                  {index > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              disabled={(formData.options || []).length >= 5}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        )}

        {formData.examType !== "Theory" && (
          <div className="space-y-2">
            <Label htmlFor="correctAnswer">Correct Answer *</Label>
            {formData.questionType === "true-false" ? (
              <Select
                value={formData.correctAnswer}
                onValueChange={(value) =>
                  setFormData({ ...formData, correctAnswer: value })
                }
              >
                <SelectTrigger data-testid="select-correct-answer">
                  <SelectValue placeholder="Select correct answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            ) : formData.questionType === "multiple-choice" ? (
              <Select
                value={formData.correctAnswer}
                onValueChange={(value) =>
                  setFormData({ ...formData, correctAnswer: value })
                }
              >
                <SelectTrigger data-testid="select-correct-answer">
                  <SelectValue placeholder="Select correct answer" />
                </SelectTrigger>
                <SelectContent>
                  {formData.options
                    ?.filter((o) => o && o.trim().length > 0)
                    .map((option, index) => (
                      <SelectItem key={index} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  {(!formData.options || formData.options.filter((o) => o && o.trim().length > 0).length === 0) && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No options added yet
                    </div>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="correctAnswer"
                placeholder="Enter the correct answer"
                value={formData.correctAnswer}
                onChange={(e) =>
                  setFormData({ ...formData, correctAnswer: e.target.value })
                }
                required
                data-testid="input-correct-answer"
              />
            )}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={questionMutation.isPending}
          data-testid="button-submit-question"
        >
          {questionMutation.isPending
            ? (initialData ? "Updating..." : "Adding...")
            : (initialData ? "Save Changes" : "Add Question")}
        </Button>
      </DialogFooter>
    </form >
  );
}
