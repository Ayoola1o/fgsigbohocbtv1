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
import { Plus, Trash2, X, Upload, HelpCircle, Download, MoreVertical, Edit, Settings, Sparkles, FileText, BookOpen, AlertTriangle } from "lucide-react";
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Local filters for detailed class questions view
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [subTermFilter, setSubTermFilter] = useState("All");
  const [subTypeFilter, setSubTypeFilter] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");

  // Smart Importer Dialog & Parser state
  const [showImporterOpen, setShowImporterOpen] = useState(false);
  const [importerTab, setImporterTab] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [parsingEngine, setParsingEngine] = useState<'regex' | 'gemini'>('regex');
  const [isParsingAI, setIsParsingAI] = useState(false);

  // Auto Exam creation states
  const [autoCreateExam, setAutoCreateExam] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examDuration, setExamDuration] = useState(30);
  const [examPassingScore, setExamPassingScore] = useState(50);

  const extractSameLineOptions = (text: string) => {
    // 1. Try parenthesized: (a) OptionText (b) OptionText...
    let matches = Array.from(text.matchAll(/\(([a-eA-E])\)\s*([^\s].*?)(?=\s+\(([a-eA-E])\)|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0]
      }));
    }

    // 2. Try bracketed: a) OptionText b) OptionText...
    matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\)\s*([^\s].*?)(?=\s+[a-eA-E]\)|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0].trim()
      }));
    }

    // 3. Try dotted: a. OptionText b. OptionText...
    // Resilient: \.\s* instead of \.\s+
    matches = Array.from(text.matchAll(/(?:\s|^)([a-eA-E])\.\s*([^\s].*?)(?=\s+[a-eA-E]\.|$)/g));
    if (matches.length > 0) {
      return matches.map(m => ({
        letter: m[1],
        val: m[2],
        full: m[0].trim()
      }));
    }

    return [];
  };

  const parseTextToQuestions = (text: string) => {
    const lines = text.split(/\r?\n/);
    const questionsList: any[] = [];
    let currentQuestion: any = null;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for Question start: "1. ", "Question 1: ", "1) "
      const questionMatch = trimmed.match(/^(?:question\s*(\d+)[:.]?|(\d+)[\s.)\]:-]+)\s*(.+)/i);
      if (questionMatch) {
        if (currentQuestion) {
          questionsList.push(currentQuestion);
        }
        
        const restOfText = questionMatch[3].trim();
        currentQuestion = {
          questionText: restOfText,
          options: [] as string[],
          correctAnswer: "",
          questionType: "multiple-choice",
          difficulty: "medium",
          points: 1,
        };

        // Check for same-line options using sequential parser
        const optMatches = extractSameLineOptions(restOfText);
        if (optMatches.length > 0) {
          const firstOptIndex = restOfText.indexOf(optMatches[0].full);
          currentQuestion.questionText = restOfText.substring(0, firstOptIndex).trim();
          for (const m of optMatches) {
            currentQuestion.options.push(`(${m.letter.toLowerCase()}) ${m.val.trim()}`);
          }
        }
        continue;
      }

      if (!currentQuestion) continue;

      // Check for correct answer start: "Answer: ", "Correct: ", "Ans. "
      const answerMatch = trimmed.match(/^\s*(?:correct\s*|key\s*|correct\s*option\s*)?ans(?:wer)?\s*[:.=-]*\s*(.+)/i);
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch[1].trim();
        continue;
      }

      // Check for options start: "A. OptionText" or "(A) OptionText" or "A) OptionText"
      // Extremely robust check to ensure it actually starts with a valid option prefix
      const isOptionStart = /^\s*(?:\(([a-eA-E])\)|([a-eA-E])[.)\]:-]+)/i.test(trimmed);
      if (isOptionStart) {
        const optMatches = Array.from(trimmed.matchAll(/(?:\(?([a-eA-E])\)?[\s.)\]:-]+)\s*([^\s].*?)(?=\s+(?:\(?([a-eA-E])\)?[\s.)\]:-]+)|$)/g));
        if (optMatches.length > 0) {
          for (const m of optMatches) {
            const letter = m[1].toUpperCase();
            const optionVal = m[2].trim();
            currentQuestion.options.push(`(${letter.toLowerCase()}) ${optionVal}`);
          }
          continue;
        }
      }

      // Otherwise, treat as continuation of question text
      if (currentQuestion.options.length === 0 && !currentQuestion.correctAnswer) {
        currentQuestion.questionText += "\n" + trimmed;
      }
    }

    if (currentQuestion) {
      questionsList.push(currentQuestion);
    }

    // Normalize post-process
    return questionsList.map(q => {
      const lowerOpts = q.options.map((o: string) => o.toLowerCase());
      const isTrueFalse = q.options.length === 2 &&
        lowerOpts.some((o: string) => o.includes("true")) &&
        lowerOpts.some((o: string) => o.includes("false"));

      if (isTrueFalse) {
        q.questionType = "true-false";
        q.options = undefined;
      } else if (q.options.length === 0) {
        q.questionType = "theory";
        q.options = undefined;
        if (!q.correctAnswer) q.correctAnswer = "Theory Question";
      }

      return q;
    });
  };

  const handleAIParsing = async () => {
    if (!pastedText.trim()) {
      toast({
        title: "No text to parse",
        description: "Please paste your exam text first or load a file.",
        variant: "destructive"
      });
      return;
    }
    
    setIsParsingAI(true);
    try {
      const response = await fetch("/api/questions/import-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: pastedText,
          classLevel: csvClassLevel,
          subject: csvSubject,
          term: csvTerm,
          examType: csvExamType,
          department: csvDepartment
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "AI Parsing request failed.");
      }
      
      const data = await response.json();
      const parsed = data.questions ? data.questions : data;
      
      if (!Array.isArray(parsed)) {
        throw new Error("Invalid response format from parser.");
      }

      // Clean up options inside parsed questions (convert multiple_choice to multiple-choice, fill_in_the_blank/essay to theory)
      const normalized = parsed.map((q: any) => {
        let type = q.questionType;
        if (type === "multiple_choice") type = "multiple-choice";
        if (type === "fill_in_the_blank" || type === "essay") type = "theory";
        
        let opts = q.options;
        if (type === "theory") opts = undefined;
        
        return {
          questionText: q.questionText,
          questionType: type,
          correctAnswer: q.correctAnswer || (type === "theory" ? "Theory Question" : "Answer"),
          options: opts,
          difficulty: q.difficulty || "medium",
          points: q.points || 1
        };
      });
      
      setParsedQuestions(normalized);
      toast({
        title: "AI Parsing Complete",
        description: `Successfully extracted ${normalized.length} questions using Google Gemini AI!`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "AI Parsing Failed",
        description: err.message || "Could not reach the AI parser service.",
        variant: "destructive"
      });
    } finally {
      setIsParsingAI(false);
    }
  };

  const removeParsedQuestion = (indexToRemove: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  useEffect(() => {
    if (importerTab === 'paste' && parsingEngine === 'regex') {
      const parsed = parseTextToQuestions(pastedText);
      setParsedQuestions(parsed);
    }
  }, [pastedText, importerTab, parsingEngine]);

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
        ? headerParts.map((h) => {
            const normalized = h.toLowerCase().trim();
            if (normalized === "image" || normalized === "imageurl" || normalized === "image_url" || normalized === "image_name" || normalized === "imagename" || normalized === "imagepath" || normalized === "image_path") {
              return "imageUrl";
            }
            if (normalized === "dept" || normalized === "dept_name" || normalized === "department_name") {
              return "department";
            }
            return h;
          })
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

  const handleSmartImportSubmit = async () => {
    if (parsedQuestions.length === 0) {
      toast({
        title: "No questions parsed",
        description: "Please check your input formatting or paste some questions first.",
        variant: "destructive"
      });
      return;
    }

    if (!csvClassLevel || !csvSubject || !csvTerm || !csvExamType) {
      toast({
        title: "Missing Metadata",
        description: "Please select Class Level, Subject, Term, and Exam Type.",
        variant: "destructive"
      });
      return;
    }

    if (autoCreateExam && !examTitle) {
      toast({
        title: "Missing Exam Title",
        description: "Please enter a title for the automatic exam.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);

    try {
      // 1. Prepare questions array
      const questionsToUpload = parsedQuestions.map(q => ({
        ...q,
        classLevel: csvClassLevel,
        subject: csvSubject,
        term: csvTerm,
        examType: csvExamType,
        department: csvDepartment || undefined,
        points: q.points || 1,
      }));

      // 2. Perform bulk upload
      const uploadedQuestions = await apiRequest<Question[]>("POST", "/api/questions/bulk", questionsToUpload);
      
      toast({
        title: "Questions Imported",
        description: `Successfully uploaded ${uploadedQuestions.length} questions to the bank.`,
      });

      // 3. Auto create exam if checked
      if (autoCreateExam) {
        const questionIds = uploadedQuestions.map(q => q.id);
        const examPayload = {
          title: examTitle,
          classLevel: csvClassLevel,
          subject: csvSubject,
          term: csvTerm,
          department: csvDepartment || undefined,
          examType: csvExamType,
          duration: examDuration,
          passingScore: examPassingScore,
          questionIds,
          numberOfQuestionsToDisplay: questionIds.length,
          assignRandomQuestions: false,
          theoryConfig: csvExamType === "Theory" ? {
            mode: "manual",
            structure: [{
              sectionTitle: "Section A",
              instruction: "Answer all questions in this section",
              questionCount: questionIds.length,
              requiredAnswers: questionIds.length,
              questionIds: questionIds,
              pointsPerQuestion: 10
            }]
          } : undefined
        };

        const createdExam = await apiRequest<any>("POST", "/api/exams", examPayload);
        toast({
          title: "Exam Created",
          description: `Exam "${createdExam.title}" was successfully created with these questions!`,
        });
      }

      // Cleanup
      setPastedText("");
      setParsedQuestions([]);
      setAutoCreateExam(false);
      setExamTitle("");
      setShowImporterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Import Failed",
        description: err.message || "An unexpected error occurred during import.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
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

  const questionsBySubject: Record<string, { questions: Question[]; classLevels: Set<string> }> = questions
    ? questions.reduce((acc, question) => {
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
      "points",
      "imageUrl",
      "department"
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
    <div className="space-y-8 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Question Repository</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Question Bank
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Register and structure Objective/Theory questions, import bulk worksheets, and map media assets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={showImporterOpen} onOpenChange={setShowImporterOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="shadow-sm border-indigo-250 text-indigo-650 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-400 dark:hover:bg-indigo-950/30 transition-all font-bold rounded-xl h-10 px-4 flex items-center gap-2"
              >
                <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Smart Importer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Sparkles className="h-5.5 w-5.5 animate-bounce" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-500 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      FIA Smart Question Importer
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                      Resiliently parse questions from Word documents, Notepad files, or plain text, and optionally auto-create an exam.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 relative">
                {isParsingAI && (
                  <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-[2px] z-50 rounded-2xl flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
                    <div className="relative flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full border-4 border-indigo-500/30 border-t-indigo-600 animate-spin" />
                      <Sparkles className="absolute h-5 w-5 text-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-black text-white tracking-wide uppercase">AI Extraction in Progress</h4>
                      <p className="text-[11px] text-slate-200 max-w-[280px] mt-1 font-semibold leading-relaxed">
                        Gemini AI is analyzing, formatting, and structuring your exam document...
                      </p>
                    </div>
                  </div>
                )}

                {/* Left Column - Configuration & Inputs */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-805 pb-1">1. Global Default Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Class Level *</Label>
                        <Select value={csvClassLevel} onValueChange={setCsvClassLevel}>
                          <SelectTrigger className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-150">
                            {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Term *</Label>
                        <Select value={csvTerm} onValueChange={setCsvTerm}>
                          <SelectTrigger className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Select Term" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-150">
                            {["First Term", "Second Term", "Third Term"].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Exam Type *</Label>
                        <Select value={csvExamType} onValueChange={setCsvExamType}>
                          <SelectTrigger className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-150">
                            {["Objectives", "Theory"].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500">Subject *</Label>
                        <Input
                          placeholder="e.g. Mathematics"
                          value={csvSubject}
                          onChange={(e) => setCsvSubject(e.target.value)}
                          className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800 h-10 text-sm font-bold text-slate-700 dark:text-slate-300"
                        />
                      </div>

                      {["SS1", "SS2", "SS3"].includes(csvClassLevel) && (
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs font-bold text-slate-500">Department</Label>
                          <Select value={csvDepartment} onValueChange={setCsvDepartment}>
                            <SelectTrigger className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Select Department" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-150">
                              {["Science", "Commercial", "Art", "Others", "General"].map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Input Content</h3>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setImporterTab('paste')}
                          className={`px-3 py-1 rounded-xl transition-all ${importerTab === 'paste' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                        >
                          Paste Text
                        </button>
                        <label className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer transition-all flex items-center gap-1 font-bold">
                          <Upload className="h-3 w-3" /> Load File (.txt / .csv / .docx / .doc)
                          <input
                            type="file"
                            accept=".txt,.csv,.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
                                try {
                                  const arrayBuffer = await file.arrayBuffer();
                                  let mammothLib = (window as any).mammoth;
                                  if (!mammothLib) {
                                    try {
                                      await new Promise<void>((resolve, reject) => {
                                        const script = document.createElement("script");
                                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js";
                                        script.onload = () => resolve();
                                        script.onerror = () => reject(new Error("Failed to load local Word library or external CDN."));
                                        document.head.appendChild(script);
                                      });
                                      mammothLib = (window as any).mammoth;
                                    } catch (err) {
                                      throw new Error("Word parser library not yet loaded. Please ensure you have internet access to download the parser or copy-paste your text directly.");
                                    }
                                  }
                                  if (!mammothLib) {
                                    throw new Error("Word parser library not yet loaded. Please try again in a moment.");
                                  }
                                  const result = await mammothLib.extractRawText({ arrayBuffer });
                                  const text = result.value;
                                  setPastedText(text);
                                  setImporterTab('paste');
                                  toast({
                                    title: "Word File Loaded",
                                    description: `Extracted text from "${file.name}" successfully.`,
                                  });
                                } catch (error: any) {
                                  console.error("Error reading Word file:", error);
                                  toast({
                                    title: "Error Reading Word Document",
                                    description: error.message || "Failed to extract text. If it is an old binary .doc file, please convert it to .docx first or copy-paste the text directly.",
                                    variant: "destructive",
                                  });
                                }
                              } else {
                                const text = await file.text();
                                setPastedText(text);
                                setImporterTab('paste');
                                toast({
                                  title: "File Loaded",
                                  description: `Loaded file "${file.name}" for parsing.`,
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Parser engine selection toggle */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Extraction Engine</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">Local Regex parser vs Google Gemini AI</span>
                      </div>
                      <div className="flex gap-1 bg-slate-150 dark:bg-slate-800 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setParsingEngine('regex')}
                          className={`px-2.5 py-1 text-[10px] rounded-md transition-all font-bold ${
                            parsingEngine === 'regex'
                              ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-405 shadow-sm'
                              : 'text-slate-550 hover:text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          Local Regex
                        </button>
                        <button
                          type="button"
                          onClick={() => setParsingEngine('gemini')}
                          className={`px-2.5 py-1 text-[10px] rounded-md transition-all font-bold ${
                            parsingEngine === 'gemini'
                              ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-indigo-405 shadow-sm'
                              : 'text-slate-550 hover:text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          Gemini AI ✨
                        </button>
                      </div>
                    </div>

                    {importerTab === 'paste' ? (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <Textarea
                          placeholder={`Paste exam document here. Example format:\n\n1. What is the CPU?\nA. Core Processing Unit\nB. Central Processing Unit\nC. Centralised Processor\nD. Computer Power Unit\nAnswer: B`}
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          disabled={isParsingAI}
                          className="min-h-[220px] max-h-[300px] font-mono text-xs bg-slate-50/50 dark:bg-slate-950/40 rounded-xl resize-y border-slate-200 dark:border-slate-800 focus:ring-indigo-550"
                        />
                        
                        {parsingEngine === 'gemini' && (
                          <Button
                            type="button"
                            onClick={handleAIParsing}
                            disabled={isParsingAI || !pastedText.trim()}
                            className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 text-white font-black text-xs py-2 px-4 rounded-xl shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 group transition-all duration-300 h-9.5"
                          >
                            {isParsingAI ? (
                              <>
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                Gemini is Extracting questions...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 text-amber-300 group-hover:scale-110 transition-transform" />
                                Extract Questions with Gemini AI ✨
                              </>
                            )}
                          </Button>
                        )}

                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium italic leading-normal">
                          {parsingEngine === 'gemini' 
                            ? "* Gemini AI parses unstructured papers using advanced language intelligence. Make sure class & subject metadata are correct before processing."
                            : "* Supports standard multiple choice option blocks (A, B, C, D) and answer tags. Unlabeled questions default to Theory."
                          }
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Auto Exam creation form */}
                  <div className="space-y-4 p-4 border border-indigo-150 bg-indigo-50/30 dark:border-indigo-950/40 dark:bg-indigo-950/20 rounded-2xl transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-xs font-black uppercase tracking-wider text-indigo-750 dark:text-indigo-400 cursor-pointer" htmlFor="auto-exam-check">
                          3. Auto-Create Exam
                        </Label>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          Automatically create a CBT exam with these questions.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        id="auto-exam-check"
                        checked={autoCreateExam}
                        onChange={(e) => setAutoCreateExam(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {autoCreateExam && (
                      <div className="space-y-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs font-bold text-slate-655 dark:text-slate-400">Exam Title *</Label>
                          <Input
                            placeholder="e.g. Midterm General Mathematics"
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-655 dark:text-slate-400">Duration (mins)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={examDuration}
                            onChange={(e) => setExamDuration(parseInt(e.target.value) || 0)}
                            className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-655 dark:text-slate-400">Passing Score (%)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={examPassingScore}
                            onChange={(e) => setExamPassingScore(parseInt(e.target.value) || 0)}
                            className="h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Live Parser Preview */}
                <div className="lg:col-span-7 flex flex-col h-full border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="bg-slate-50/80 dark:bg-slate-950/60 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      Live Preview <Badge variant="secondary" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200">{parsedQuestions.length} parsed</Badge>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Updates in real-time</span>
                  </div>

                  <div className="p-4 overflow-y-auto space-y-4 max-h-[50vh] min-h-[300px] lg:max-h-[60vh] flex-1">
                    {parsedQuestions.length > 0 ? (
                      parsedQuestions.map((q, idx) => (
                        <Card key={idx} className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                <span className="text-indigo-650">Q{idx + 1}.</span>
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 uppercase font-black bg-slate-50 text-slate-500">
                                  {q.questionType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-455">
                                <span>{q.difficulty} | {q.points} pt</span>
                                <button
                                  type="button"
                                  onClick={() => removeParsedQuestion(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded"
                                  title="Prune this question"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <p className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {q.questionText}
                            </p>

                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt: string, optIdx: number) => {
                                  const lowerOpt = opt.toLowerCase();
                                  const lowerAns = q.correctAnswer?.toLowerCase().trim();
                                  
                                  const isCorrect = lowerAns && (
                                    lowerOpt.startsWith(`(${lowerAns})`) || 
                                    lowerOpt.startsWith(`${lowerAns}.`) || 
                                    lowerOpt.startsWith(`${lowerAns})`) ||
                                    lowerOpt.replace(/^\([a-e]\)\s*/, "").trim() === lowerAns
                                  );

                                  return (
                                    <div 
                                      key={optIdx} 
                                      className={`text-[11px] px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all ${
                                        isCorrect 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 font-bold shadow-sm shadow-emerald-500/5' 
                                          : 'bg-slate-50/50 border-slate-100 text-slate-500 dark:bg-slate-900 dark:border-slate-800'
                                      }`}
                                    >
                                      <span className="font-extrabold text-indigo-500">{opt.substring(0, 3)}</span>
                                      <span className="flex-1 font-medium">{opt.substring(4)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.correctAnswer && (
                              <div className="text-[10px] flex items-center gap-1.5 text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg w-fit border border-slate-100/60 dark:border-slate-800/40">
                                <span className="font-bold uppercase tracking-wider text-slate-455">Correct Key:</span>
                                <span className="font-mono text-indigo-650 dark:text-indigo-400 font-extrabold px-1 rounded">
                                  {q.correctAnswer}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-400 space-y-3">
                        <FileText className="h-10 w-10 text-slate-300 dark:text-slate-850 stroke-[1.5]" />
                        <div>
                          <p className="font-black text-sm text-slate-655 dark:text-slate-400">No parsed questions yet</p>
                          <p className="text-xs text-slate-400 max-w-sm mt-1 font-medium leading-normal">
                            Start typing, paste an exam document, or load a text file to see the interactive live preview here.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <Button variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={() => setShowImporterOpen(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSmartImportSubmit} 
                  disabled={isImporting || parsedQuestions.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-9 rounded-xl text-xs shadow-lg shadow-indigo-500/10"
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {autoCreateExam ? "Import & Create Exam" : `Import ${parsedQuestions.length} Questions`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="button-add-question"
                className="shadow-md shadow-indigo-500/10 bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-[1.03] duration-300 h-10 px-4 rounded-xl flex items-center gap-2"
              >
                <Plus className="h-4.5 w-4.5" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
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

      {/* Control Tools bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("questions-csv")?.click()}
            disabled={!!uploadProgress}
            className="h-8.5 rounded-lg border-slate-200 dark:border-slate-800 font-bold text-xs"
          >
            {uploadProgress ? (
              `Uploading ${Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)}%`
            ) : (
              <>
                <Upload className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Upload CSV
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
            className="h-8.5 rounded-lg border-slate-200 dark:border-slate-800 font-bold text-xs"
          >
            <HelpCircle className="mr-2 h-3.5 w-3.5 text-slate-400" /> CSV Help
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadTemplate('objectives')} className="h-8.5 rounded-lg border-slate-200 dark:border-slate-800 font-bold text-xs">
            <Download className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Template (Obj)
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadTemplate('theory')} className="h-8.5 rounded-lg border-slate-200 dark:border-slate-800 font-bold text-xs">
            <Download className="mr-2 h-3.5 w-3.5 text-rose-500" /> Template (Theory)
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[180px] h-8.5 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="__all__">All Departments</SelectItem>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Science">Science</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Others">Others</SelectItem>
            </SelectContent>
          </Select>

          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogState({ isOpen: true, type: 'selected', id: undefined })}
              className="h-8.5 rounded-lg font-bold text-xs"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogState({ isOpen: true, type: 'all', id: undefined })}
            className="h-8.5 rounded-lg font-bold text-xs"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Reset Repository
          </Button>
        </div>
      </div>

      <Dialog open={showClassLevelDialog} onOpenChange={setShowClassLevelDialog}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border-slate-100 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-850">Select Default Values for CSV Import</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 leading-normal mt-1">
              Please select the class level, term, subject, and exam type for the imported questions.
              These values will be applied to all questions in the CSV file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="csv-class-level" className="text-xs font-bold text-slate-550">Class Level *</Label>
              <select
                id="csv-class-level"
                value={csvClassLevel}
                onChange={e => setCsvClassLevel(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-350"
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
            <div className="space-y-1">
              <Label htmlFor="csv-term" className="text-xs font-bold text-slate-550">Term *</Label>
              <select
                id="csv-term"
                value={csvTerm}
                onChange={e => setCsvTerm(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-350"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
                <option value="Others">Others</option>
              </select>
            </div>
            {["SS1", "SS2", "SS3"].includes(csvClassLevel) && (
              <div className="space-y-1">
                <Label htmlFor="csv-department" className="text-xs font-bold text-slate-550">Department *</Label>
                <select
                  id="csv-department"
                  value={csvDepartment}
                  onChange={e => setCsvDepartment(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-350"
                >
                  <option value="">Select Department</option>
                  <option value="General">General</option>
                  <option value="Science">Science</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Art">Art</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="csv-exam-type" className="text-xs font-bold text-slate-550">Exam Type *</Label>
              <select
                id="csv-exam-type"
                value={csvExamType}
                onChange={e => setCsvExamType(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-350"
              >
                <option value="Objectives">Objectives</option>
                <option value="Theory">Theory</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="csv-subject" className="text-xs font-bold text-slate-550">Subject *</Label>
              <Input
                id="csv-subject"
                placeholder="e.g., Mathematics"
                value={csvSubject}
                onChange={e => setCsvSubject(e.target.value)}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
            {previewRows.length > 0 && (
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850">
                <div className="text-xs font-black uppercase text-slate-455 mb-2">CSV Preview ({previewRows.length} rows)</div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1 font-medium text-slate-600">
                  {previewRows.slice(0, 3).map((row, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap border-b border-slate-100 dark:border-slate-850 pb-1 last:border-0">
                      {Object.values(row).join(", ")}
                    </div>
                  ))}
                  {previewRows.length > 3 && (
                    <div className="text-slate-400 italic">...and {previewRows.length - 3} more</div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  Review parsed rows below before uploading. Invalid rows will be reported by the server.
                </p>
                <div className="text-xs font-bold mt-2.5 flex flex-wrap gap-1">
                  Class: <Badge className="font-bold py-0">{csvClassLevel}</Badge>
                  Term: <Badge className="font-bold py-0">{csvTerm}</Badge>
                  Type: <Badge className="font-bold py-0">{csvExamType}</Badge>
                  Subject: <Badge className="font-bold py-0">{csvSubject}</Badge>
                  {csvDepartment && <>Dept: <Badge className="font-bold py-0">{csvDepartment}</Badge></>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setShowClassLevelDialog(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              onClick={() => {
                setShowClassLevelDialog(false);
                if (missingImages.length > 0) {
                  setShowImageUploadDialog(true);
                } else {
                  uploadPreview();
                }
              }} 
              disabled={!csvClassLevel || !csvSubject || !csvTerm || !csvExamType || (["SS1", "SS2", "SS3"].includes(csvClassLevel) && !csvDepartment)}
            >
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageUploadDialog} onOpenChange={setShowImageUploadDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-850">Upload Missing Images</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
              The CSV contains {missingImages.length} image references. Please select and upload these files from your computer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="max-h-40 overflow-y-auto border border-slate-200/50 rounded-2xl p-3 text-xs bg-slate-50/50">
              <p className="font-extrabold text-slate-700 mb-2">Required Files:</p>
              <ul className="list-disc pl-5 space-y-1 font-medium text-slate-600">
                {missingImages.map((img, i) => (
                  <li key={i} className={uploadedImageMap[img] ? "text-green-600 line-through font-bold" : "text-rose-500 font-bold"}>
                    {img} {uploadedImageMap[img] && "(Ready)"}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Select Images</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                className="h-10 rounded-xl"
                onChange={async (e) => {
                  if (!e.target.files?.length) return;
                  const files = Array.from(e.target.files) as File[];
                  const newMap = { ...uploadedImageMap };
                  let count = 0;

                  setImageUploadProgress({ current: 0, total: files.length });

                  for (const file of files) {
                    const matchedImageKey = missingImages.find(img => img.toLowerCase().trim() === file.name.toLowerCase().trim());
                    if (matchedImageKey) {
                      try {
                        let downloadUrl = "";

                        // 1. Try Firebase Storage first (ideal for standard cloud production)
                        try {
                          const { storage: fbStorage } = await import("@/lib/firebase");
                          const { ref: fbRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
                          if (fbStorage) {
                            const storageRef = fbRef(fbStorage, `question_images/${Date.now()}-${file.name}`);
                            const snapshot = await uploadBytes(storageRef, file);
                            downloadUrl = await getDownloadURL(snapshot.ref);
                          }
                        } catch (fbErr) {
                          console.warn("Firebase Storage upload failed, falling back to local server upload:", fbErr);
                        }

                        // 2. Fallback to Express backend /api/upload
                        if (!downloadUrl) {
                          const formData = new FormData();
                          formData.append("file", file);

                          const res = await fetch("/api/upload", {
                            method: "POST",
                            body: formData
                          });

                          if (!res.ok) throw new Error("Upload failed");

                          const data = await res.json();
                          downloadUrl = data.url;
                        }

                        newMap[matchedImageKey] = downloadUrl;
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
                <div className="text-[11px] text-slate-455 font-bold animate-pulse">
                  Uploading... {imageUploadProgress.current} / {imageUploadProgress.total}
                </div>
              )}
            </div>

            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200/50 p-3 rounded-xl font-medium">
              Note: Unmatched images will be ignored. Rows with missing images will save without an image.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setShowImageUploadDialog(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              onClick={() => {
                setShowImageUploadDialog(false);
                uploadPreview();
              }}
            >
              Continue Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl max-w-md shadow-sm">
        <Input
          placeholder="Quick search by subject..."
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="h-9 border-none bg-slate-50 dark:bg-slate-950 focus-visible:ring-indigo-550 rounded-xl font-medium"
        />
        {filterSubject && (
          <Button
            variant="ghost"
            onClick={() => setFilterSubject("")}
            className="h-8 px-3 text-xs text-slate-500 rounded-lg hover:bg-slate-100"
          >
            Reset
            <X className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* STEP 1: SUBJECTS GRID VIEW */}
          {!selectedSubject && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-200">Subjects Directory</h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Select a subject to view target classes and questions.</p>
                </div>
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold px-3 py-1">
                  {Object.keys(questionsBySubject).length} Subjects Active
                </Badge>
              </div>

              {Object.keys(questionsBySubject).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(questionsBySubject)
                    .filter(([subject]) => {
                      if (!filterSubject) return true;
                      return subject.toLowerCase().includes(filterSubject.toLowerCase());
                    })
                    .map(([subject, { questions: subjectQuestions, classLevels }]) => {
                      const sName = subject.toLowerCase();
                      const sStyle = sName.includes("math") || sName.includes("phys") || sName.includes("chem") || sName.includes("bio") || sName.includes("agric") || sName.includes("science") || sName.includes("computer")
                        ? {
                            card: "bg-emerald-50/60 border-emerald-100/80 dark:bg-emerald-950/10 dark:border-emerald-900/30 hover:border-emerald-450",
                            stripe: "bg-emerald-500",
                            icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
                            badge: "bg-emerald-100 text-emerald-800 border-emerald-250/60 dark:bg-emerald-950/30 dark:text-emerald-400"
                          }
                        : sName.includes("english") || sName.includes("literature") || sName.includes("history") || sName.includes("crs") || sName.includes("irs") || sName.includes("civic")
                        ? {
                            card: "bg-sky-50/60 border-sky-100/80 dark:bg-sky-950/10 dark:border-sky-900/30 hover:border-sky-450",
                            stripe: "bg-sky-500",
                            icon: "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
                            badge: "bg-sky-100 text-sky-800 border-sky-250/60 dark:bg-sky-950/30 dark:text-sky-400"
                          }
                        : sName.includes("acc") || sName.includes("comm") || sName.includes("econ") || sName.includes("bus") || sName.includes("geo")
                        ? {
                            card: "bg-amber-50/60 border-amber-100/80 dark:bg-amber-950/10 dark:border-amber-900/30 hover:border-amber-450",
                            stripe: "bg-amber-500",
                            icon: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
                            badge: "bg-amber-100 text-amber-800 border-amber-250/60 dark:bg-amber-950/30 dark:text-amber-400"
                          }
                        : {
                            card: "bg-rose-50/60 border-rose-100/80 dark:bg-rose-955/10 dark:border-rose-900/30 hover:border-rose-450",
                            stripe: "bg-rose-500",
                            icon: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
                            badge: "bg-rose-105 text-rose-800 border-rose-250/60 dark:bg-rose-955/30 dark:text-rose-400"
                          };
                      return (
                        <Card 
                          key={subject}
                          onClick={() => {
                            setSelectedSubject(subject);
                            setSelectedClass(null);
                            setSubTermFilter("All");
                          }}
                          className={`relative overflow-hidden group border rounded-2xl hover:shadow-xl transition-all duration-350 cursor-pointer ${sStyle.card}`}
                        >
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${sStyle.stripe}`} />
                          
                          <CardHeader className="py-5 px-6">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${sStyle.icon}`}>
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-base font-extrabold text-slate-800 dark:text-slate-200 transition-colors">
                                  {subject}
                                </CardTitle>
                              </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-150">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setBulkEditDialog({ isOpen: true, subject, type: 'subjectName', value: subject });
                                }}>
                                  <Edit className="mr-2 h-4 w-4 text-indigo-500" />
                                  Edit Subject Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setBulkEditDialog({ isOpen: true, subject, type: 'settings' });
                                }}>
                                  <Settings className="mr-2 h-4 w-4 text-indigo-550" />
                                  Bulk Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialogState({
                                      isOpen: true,
                                      type: 'all',
                                      count: subjectQuestions.length,
                                      id: subject
                                    });
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete All in Subject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>

                        <CardContent className="px-6 pb-6 pt-0 space-y-4">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                            <span>Questions Pool</span>
                            <Badge className={`font-extrabold ${sStyle.badge}`}>{subjectQuestions.length} Questions</Badge>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Available Classes</span>
                            <div className="flex flex-wrap gap-1.5">
                              {classLevels.size > 0 ? (
                                Array.from(classLevels).map(cls => {
                                  const cName = cls.toUpperCase();
                                  const cClass = cName.includes("JSS1") || cName.includes("JSS2")
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                                    : cName.includes("JSS3") || cName.includes("SS1")
                                    ? "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400"
                                    : cName.includes("SS2") || cName.includes("SS3")
                                    ? "bg-amber-50 text-amber-850 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                                    : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-955/20 dark:text-rose-450";
                                  return (
                                    <Badge key={cls} variant="outline" className={`text-[9px] font-extrabold px-2 py-0.5 border ${cClass}`}>
                                      {cls}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-400 italic">No classes linked yet</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-2xl">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <BookOpen className="mb-4 h-12 w-12 text-slate-350 dark:text-slate-800" />
                    <h3 className="mb-2 text-lg font-black text-slate-700 dark:text-slate-350">No Subjects Found</h3>
                    <p className="mb-5 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                      Try adding a question or uploading a CSV worksheet to seed the repository database.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* STEP 2: CLASS DIRECTORY VIEW */}
          {selectedSubject && !selectedClass && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              {/* Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="hover:text-indigo-600 cursor-pointer" onClick={() => setSelectedSubject(null)}>Question Bank</span>
                    <span>/</span>
                    <span className="text-slate-600">{selectedSubject}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-200">
                    Select Target Classroom Level
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Select a target level to view, edit, or reset questions.</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Term filter at class list page */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1.5">Term:</span>
                    <select
                      value={subTermFilter}
                      onChange={(e) => setSubTermFilter(e.target.value)}
                      className="border-none rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-xs font-extrabold text-slate-700 focus:outline-none h-7 shadow-sm cursor-pointer"
                    >
                      <option value="All">All Terms</option>
                      <option value="First Term">1st Term</option>
                      <option value="Second Term">2nd Term</option>
                      <option value="Third Term">3rd Term</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSubject(null)}
                    className="rounded-xl border-slate-200 font-extrabold text-xs h-9.5"
                  >
                    ← Back to Subjects
                  </Button>
                </div>
              </div>

              {/* Class Cards Grid */}
              {(() => {
                const classList = Array.from(questionsBySubject[selectedSubject]?.classLevels || []);
                const matchingClasses = classList.filter(cls => {
                  if (subTermFilter === "All") return true;
                  return questionsBySubject[selectedSubject]?.questions.some(
                    q => q.classLevel === cls && (q.term || "First Term") === subTermFilter
                  );
                });

                if (matchingClasses.length > 0) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {matchingClasses.map(cls => {
                        const classQuestions = questionsBySubject[selectedSubject]?.questions.filter(
                          q => q.classLevel === cls && (subTermFilter === "All" || (q.term || "First Term") === subTermFilter)
                        ) || [];
                        const objectivesCount = classQuestions.filter(q => q.examType === "Objectives" || q.questionType !== "theory").length;
                        const theoryCount = classQuestions.filter(q => q.examType === "Theory" || q.questionType === "theory").length;

                        return (
                          <Card 
                            key={cls}
                            onClick={() => {
                              setSelectedClass(cls);
                              setSubSearchQuery("");
                              setSubTermFilter("All");
                            }}
                            className="group border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all duration-350 overflow-hidden cursor-pointer"
                          >
                            <CardHeader className="py-4 px-5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/40">
                              <CardTitle className="text-base font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                                {cls}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-3">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                <span>Total Questions</span>
                                <Badge variant="secondary" className="font-extrabold text-[10px] bg-indigo-50 text-indigo-700">{classQuestions.length} Questions</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50/30 dark:bg-slate-950/10 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-850">
                                <div>
                                  <span className="block text-slate-400 text-[8px] uppercase">Objectives</span>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-extrabold">{objectivesCount} Obj</span>
                                </div>
                                <div className="border-l border-slate-150 pl-3">
                                  <span className="block text-slate-400 text-[8px] uppercase">Theory</span>
                                  <span className="text-xs text-slate-700 dark:text-slate-300 font-extrabold">{theoryCount} slots</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-2xl">
                    <CardContent className="flex flex-col items-center py-16 text-center">
                      <BookOpen className="mb-4 h-12 w-12 text-slate-350 dark:text-slate-800" />
                      <h3 className="mb-2 text-lg font-black text-slate-700 dark:text-slate-350">No Classes Found</h3>
                      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                        No uploaded classes match your selected school term ({subTermFilter}). Try another term filter!
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* STEP 3: CLASS QUESTIONS TABLE LIST */}
          {selectedSubject && selectedClass && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              {/* Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="hover:text-indigo-650 cursor-pointer" onClick={() => { setSelectedSubject(null); setSelectedClass(null); }}>Question Bank</span>
                    <span>/</span>
                    <span className="hover:text-indigo-655 cursor-pointer" onClick={() => setSelectedClass(null)}>{selectedSubject}</span>
                    <span>/</span>
                    <span className="text-slate-600">{selectedClass}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-200">
                    Questions Directory for {selectedClass}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage details, delete questions, or upload additional assets.</p>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setSelectedClass(null)}
                  className="rounded-xl border-slate-200 font-extrabold text-xs h-9.5 self-start sm:self-center"
                >
                  ← Back to Classes
                </Button>
              </div>

              {/* Local Filter panel */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">School Term</label>
                  <select
                    value={subTermFilter}
                    onChange={(e) => setSubTermFilter(e.target.value)}
                    className="border rounded-lg px-2.5 py-1.5 w-full bg-white dark:bg-slate-900 text-xs border-slate-200 focus:outline-none h-8 font-bold text-slate-700"
                  >
                    <option value="All">All Terms</option>
                    <option value="First Term">1st Term</option>
                    <option value="Second Term">2nd Term</option>
                    <option value="Third Term">3rd Term</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Type</label>
                  <select
                    value={subTypeFilter}
                    onChange={(e) => setSubTypeFilter(e.target.value)}
                    className="border rounded-lg px-2.5 py-1.5 w-full bg-white dark:bg-slate-900 text-xs border-slate-200 focus:outline-none h-8 font-bold text-slate-700"
                  >
                    <option value="All">All Types</option>
                    <option value="Objectives">Objectives (MCQ)</option>
                    <option value="Theory">Theory</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Search Text</label>
                  <Input
                    placeholder="Search keywords..."
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                    className="h-8 text-xs font-bold rounded-lg border-slate-200 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Bulk Actions Toolbar inside final Table view */}
              <div className="flex justify-between items-center bg-slate-50/20 px-3 py-2 rounded-lg border border-slate-100/50">
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogState({ isOpen: true, type: 'selected', count: selectedIds.size })}
                      className="h-8 rounded-lg font-bold text-xs"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Selected ({selectedIds.size})
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const allIdsInClass = (questionsBySubject[selectedSubject]?.questions.filter(
                        q => q.classLevel === selectedClass
                      ) || []).map(q => q.id);
                      setDeleteDialogState({ isOpen: true, type: 'selected', count: allIdsInClass.length, id: undefined });
                      setSelectedIds(new Set(allIdsInClass));
                    }}
                    className="h-8 rounded-lg font-bold text-xs"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Reset Class Pool
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              {(() => {
                const classQuestionsList = questionsBySubject[selectedSubject]?.questions.filter(q => {
                  const matchClass = q.classLevel === selectedClass;
                  const matchTerm = subTermFilter === "All" || (q.term || "First Term") === subTermFilter;
                  const matchType = subTypeFilter === "All" || (
                    subTypeFilter === "Theory" 
                      ? (q.examType === "Theory" || q.questionType === "theory")
                      : (q.examType === "Objectives" || q.questionType !== "theory")
                  );
                  const matchSearch = !subSearchQuery || q.questionText?.toLowerCase().includes(subSearchQuery.toLowerCase());
                  
                  return matchClass && matchTerm && matchType && matchSearch;
                }) || [];

                if (classQuestionsList.length > 0) {
                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-805 bg-white dark:bg-slate-900">
                      <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-950/40">
                          <TableRow>
                            <TableHead className="w-12 py-3">
                              <input
                                type="checkbox"
                                checked={classQuestionsList.every(q => selectedIds.has(q.id))}
                                onChange={(e) => {
                                  const next = new Set(selectedIds);
                                  if (e.currentTarget.checked) {
                                    classQuestionsList.forEach(q => next.add(q.id));
                                  } else {
                                    classQuestionsList.forEach(q => next.delete(q.id));
                                  }
                                  setSelectedIds(next);
                                }}
                                className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                              />
                            </TableHead>
                            <TableHead className="w-1/2 py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Question Context</TableHead>
                            <TableHead className="py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Type</TableHead>
                            <TableHead className="py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Difficulty</TableHead>
                            <TableHead className="py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Term</TableHead>
                            <TableHead className="py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Points</TableHead>
                            <TableHead className="text-right py-3 font-bold text-xs text-slate-400 uppercase tracking-wider">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100/50 dark:divide-slate-805">
                          {classQuestionsList.map((question) => (
                            <TableRow key={question.id} data-testid={`row-question-${question.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                              <TableCell className="py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(question.id)}
                                  onChange={(e) => {
                                    const next = new Set(selectedIds);
                                    if (e.currentTarget.checked) next.add(question.id);
                                    else next.delete(question.id);
                                    setSelectedIds(next);
                                  }}
                                  className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4"
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-2">
                                  {question.imageUrl && (
                                    <div className="inline-block rounded-xl overflow-hidden border border-slate-200/50 bg-slate-50/50 p-1">
                                      <img
                                        src={question.imageUrl}
                                        alt="Question Image"
                                        className="h-16 w-auto object-contain rounded-lg"
                                      />
                                    </div>
                                  )}
                                  <p className="font-bold text-xs text-slate-700 dark:text-slate-350 leading-relaxed max-w-xl">{question.questionText}</p>
                                </div>
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] py-0.2 px-1.5 font-bold uppercase">{question.classLevel}</Badge>
                                  {question.department && (
                                    <Badge variant="outline" className="text-[9px] py-0.2 px-1.5 font-bold border-slate-200">
                                      {question.department}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[9px] py-0.2 px-1.5 font-bold bg-slate-100 text-slate-600 font-extrabold">{(question.term === "First Term" ? "1st Term" : question.term === "Second Term" ? "2nd Term" : question.term === "Third Term" ? "3rd Term" : "Oth")}</Badge>
                                  <Badge variant="outline" className="text-[9px] py-0.2 px-1.5 font-bold border-slate-250 text-slate-500">{(question.examType === "Objectives" ? "Objectives" : "Theory")}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge className="bg-slate-50 border border-slate-200/60 text-slate-600 dark:bg-slate-900/60 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider">{question.questionType}</Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge
                                  className={`text-[9px] font-black tracking-wider uppercase border ${
                                    question.difficulty === "easy"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400"
                                      : question.difficulty === "medium"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/20 dark:text-indigo-400"
                                        : "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-455"
                                  }`}
                                >
                                  {question.difficulty}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 font-semibold text-xs text-slate-655">{question.term || "First Term"}</TableCell>
                              <TableCell className="py-3 font-extrabold text-xs text-indigo-650">{question.points}</TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingQuestion(question)}
                                    className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-550"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteDialogState({ isOpen: true, type: 'single', id: question.id })}
                                    className="h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-650"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                }

                return (
                  <div className="text-center py-16 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 text-xs italic font-medium bg-white dark:bg-slate-900">
                    No questions in {selectedClass} match these active keyword/term filters.
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* Delete Dialog kept as is */}
      <AlertDialog open={deleteDialogState.isOpen} onOpenChange={(open) => setDeleteDialogState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-slate-900 p-6 border-slate-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-slate-855">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">
              {deleteDialogState.type === 'single' && "This will permanently delete the selected question."}
              {deleteDialogState.type === 'selected' && `This will permanently delete ${deleteDialogState.count} selected questions.`}
              {deleteDialogState.type === 'all' && `This will permanently delete ALL ${deleteDialogState.count} questions. This action implies a total reset of the question bank.`}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-9.5 text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl h-9.5 text-xs">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Question Dialog */}
      <Dialog open={editingQuestion !== null} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-855">Edit Question Context</DialogTitle>
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
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl p-6 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-855">Edit Subject Name</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
              This will update the subject name for all questions in "{bulkEditDialog.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">New Subject Name</Label>
              <Input
                value={bulkEditDialog.value || ""}
                onChange={(e) => setBulkEditDialog(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter new subject name"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
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
        <DialogContent className="bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl p-6 shadow-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-855">Bulk Update Settings</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-1">
              Update Class Level, Term, or Exam Type for all questions in "{bulkEditDialog.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Class Level</Label>
                <Select
                  value={bulkEditDialog.value?.classLevel || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), classLevel: val } }))}
                >
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Term</Label>
                <Select
                  value={bulkEditDialog.value?.term || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), term: val } }))}
                >
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Term" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["First Term", "Second Term", "Third Term", "Others"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Exam Type</Label>
                <Select
                  value={bulkEditDialog.value?.examType || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), examType: val } }))}
                >
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["Objectives", "Theory"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Department</Label>
                <Select
                  value={bulkEditDialog.value?.department || ""}
                  onValueChange={(val) => setBulkEditDialog(prev => ({ ...prev, value: { ...(prev.value || {}), department: val } }))}
                >
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["Science", "Commercial", "Art", "Others", "General"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setBulkEditDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
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
    </div>
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

    try {
      let downloadUrl = "";

      // 1. Try Firebase Storage first (ideal for standard cloud production)
      try {
        const { storage: fbStorage } = await import("@/lib/firebase");
        const { ref: fbRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
        if (fbStorage) {
          const storageRef = fbRef(fbStorage, `question_images/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          downloadUrl = await getDownloadURL(snapshot.ref);
        }
      } catch (fbErr) {
        console.warn("Firebase Storage upload failed, falling back to local server upload:", fbErr);
      }

      // 2. Fallback to Express backend /api/upload
      if (!downloadUrl) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        downloadUrl = data.url;
      }

      setFormData((prev) => ({ ...prev, imageUrl: downloadUrl }));
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
              <SelectItem value="General">General</SelectItem>
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
