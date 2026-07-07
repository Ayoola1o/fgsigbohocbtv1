import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { 
  Plus, 
  Clock, 
  BookOpen, 
  Eye, 
  Pencil, 
  Trash2, 
  Sparkles, 
  ChevronRight, 
  Award,
  ToggleLeft,
  Settings,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Exam, Question } from "@shared/schema";
import { TheoryStructureEditor, generateStructure, type TheorySlot } from "@/components/theory-structure-editor";

export default function AdminExams() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Top Filtering & Pagination States
  const [filterTerm, setFilterTerm] = useState<string>("__all__");
  const [filterDept, setFilterDept] = useState<string>("__all__");
  const [filterClass, setFilterClass] = useState<string>("__all__");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterExamType, setFilterExamType] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");
  const [filterMultiple, setFilterMultiple] = useState<string>("__all__");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const deleteExamMutation = useMutation({
    mutationFn: (examId: string) => apiRequest("DELETE", `/api/exams/${examId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam Deleted",
        description: "The exam paper has been removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Delete",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    }
  });

  const toggleExamMutation = useMutation({
    mutationFn: ({ examId, isActive }: { examId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/exams/${examId}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Status Updated",
        description: "Exam availability updated successfully.",
      });
    },
  });

  // Custom Subject badge colors
  const getSubjectBadge = (subj: string, isMulti: boolean = false) => {
    if (isMulti) {
      return <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40 font-bold">{subj}</Badge>;
    }
    const s = subj.toLowerCase();
    if (s.includes("math")) return <Badge className="bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40 font-bold">Mathematics</Badge>;
    if (s.includes("english")) return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40 font-bold">English</Badge>;
    if (s.includes("physics") || s.includes("chem") || s.includes("bio")) return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 font-bold">{subj}</Badge>;
    return <Badge variant="secondary" className="font-bold">{subj}</Badge>;
  };

  // Filter & Pagination Calculations
  const filteredExams = exams.filter((exam) => {
    const matchTerm = filterTerm === "__all__" || exam.term === filterTerm;
    const matchDept = filterDept === "__all__" || (exam.department || "General") === filterDept;
    const matchClass = filterClass === "__all__" || exam.classLevel === filterClass;
    const matchSubject = !filterSubject || exam.subject.toLowerCase().includes(filterSubject.toLowerCase());
    const matchType = filterExamType === "__all__" || (exam.examType || "Objectives") === filterExamType;
    const matchStatus = filterStatus === "__all__" || 
      (filterStatus === "active" ? exam.isActive : !exam.isActive);
    
    // Check if it's a multiple subject exam (comma-separated subjects)
    const isMultipleSubject = exam.subject.includes(",");
    const matchMultiple = filterMultiple === "__all__" ||
      (filterMultiple === "multiple" ? isMultipleSubject : !isMultipleSubject);
      
    return matchTerm && matchDept && matchClass && matchSubject && matchType && matchStatus && matchMultiple;
  });

  const totalItems = filteredExams.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedExams = filteredExams.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-glass border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-100/10 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Settings className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Institution Data Center</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Examination Papers
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Draft Objectives/Theory examination papers, configure display constraints, and set question criteria.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-create-exam"
              className="shadow-md shadow-indigo-500/10 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold transition-all hover:scale-[1.03] duration-300 flex items-center gap-2 px-4 h-10 rounded-xl"
            >
              <Plus className="h-4 w-4" /> Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <ExamForm
              questions={questions}
              onSuccess={() => {
                setIsCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Premium Multi-Variable Filter Panel */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-100/10 dark:shadow-none animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider">
            Active Query Filters
          </Badge>
          <div className="h-px bg-slate-100 dark:bg-slate-800/40 flex-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {/* Term Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">School Term</label>
            <select
              value={filterTerm}
              onChange={e => { setFilterTerm(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Terms</option>
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Classroom Level Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Class</label>
            <select
              value={filterClass}
              onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Classes</option>
              {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Department</label>
            <select
              value={filterDept}
              onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Departments</option>
              <option value="General">General</option>
              <option value="Science">Science</option>
              <option value="Commercial">Commercial</option>
              <option value="Art">Art</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Subject Filter (Searchable) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Subject Search</label>
            <Input
              placeholder="Search subject..."
              value={filterSubject}
              onChange={e => { setFilterSubject(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 text-xs border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 font-bold"
            />
          </div>

          {/* Exam Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Exam Type</label>
            <select
              value={filterExamType}
              onChange={e => { setFilterExamType(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Types</option>
              <option value="Objectives">Objectives (MCQ)</option>
              <option value="Theory">Theory</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Status</label>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive / Draft</option>
            </select>
          </div>

          {/* Subject Format Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Subject Format</label>
            <select
              value={filterMultiple}
              onChange={e => { setFilterMultiple(e.target.value); setCurrentPage(1); }}
              className="border rounded-xl px-3 py-1.5 w-full bg-slate-50/50 dark:bg-slate-950/40 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-9 font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="__all__">All Formats</option>
              <option value="single">Single Subject</option>
              <option value="multiple">Multiple Subjects</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table view */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : exams.length > 0 ? (
        <Card className="border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/40">
                <TableRow>
                  <TableHead className="font-bold py-4 px-6 text-xs text-slate-400 uppercase tracking-widest">Exam Title</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest">Subject</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest text-center">Class / Dept</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest text-center">Duration</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest text-center">Type</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest text-center">Questions</TableHead>
                  <TableHead className="font-bold py-4 px-4 text-xs text-slate-400 uppercase tracking-widest text-center">Status</TableHead>
                  <TableHead className="font-bold py-4 px-6 text-xs text-slate-400 uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {paginatedExams.length > 0 ? (
                  paginatedExams.map((exam) => (
                    <TableRow 
                      key={exam.id} 
                      data-testid={`row-exam-${exam.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors group"
                    >
                      {/* Exam Title */}
                      <TableCell className="font-extrabold text-slate-800 dark:text-slate-205 text-sm py-4.5 px-6 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {exam.title}
                      </TableCell>

                      {/* Subject */}
                      <TableCell className="py-4.5 px-4">
                        <div className="flex flex-col gap-1.5">
                          {getSubjectBadge(
                            exam.subject.includes(",") ? exam.title : exam.subject,
                            exam.subject.includes(",")
                          )}
                          {exam.subject.includes(",") && (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {exam.subject.split(",").map(s => s.trim()).filter(Boolean).map(subj => {
                                const count = exam.questionIds?.filter(qId => {
                                  const q = questions.find(question => question.id === qId);
                                  return q && q.subject.toLowerCase() === subj.toLowerCase();
                                }).length || 0;
                                return (
                                  <Badge key={subj} variant="outline" className="text-[9px] font-bold px-1 py-0 border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50">
                                    {subj}: {count}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Class & Dept */}
                      <TableCell className="py-4.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <Badge className={
                            exam.classLevel.toUpperCase().includes("JSS1") || exam.classLevel.toUpperCase().includes("JSS2")
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/40 font-extrabold text-[10px]"
                              : exam.classLevel.toUpperCase().includes("JSS3") || exam.classLevel.toUpperCase().includes("SS1")
                              ? "bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-450 dark:border-sky-900/40 font-extrabold text-[10px]"
                              : exam.classLevel.toUpperCase().includes("SS2") || exam.classLevel.toUpperCase().includes("SS3")
                              ? "bg-amber-50 text-amber-850 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/40 font-extrabold text-[10px]"
                              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/40 font-extrabold text-[10px]"
                          }>
                            {exam.classLevel}
                          </Badge>
                          {exam.department && (
                            <Badge variant="outline" className={
                              exam.department.toLowerCase().includes("science")
                                ? "bg-emerald-50/50 text-emerald-800 border border-emerald-200/50 dark:bg-emerald-950/10 dark:text-emerald-400 text-[9px] uppercase font-bold"
                                : exam.department.toLowerCase().includes("commercial")
                                ? "bg-sky-50/50 text-sky-800 border border-sky-200/50 dark:bg-sky-950/10 dark:text-sky-400 text-[9px] uppercase font-bold"
                                : exam.department.toLowerCase().includes("art")
                                ? "bg-amber-50/50 text-amber-850 border border-amber-200/50 dark:bg-amber-950/10 dark:text-amber-400 text-[9px] uppercase font-bold"
                                : "bg-rose-50/50 text-rose-805 border border-rose-200/50 dark:bg-rose-950/10 dark:text-rose-400 text-[9px] uppercase font-bold"
                            }>
                              {exam.department}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Duration */}
                      <TableCell className="py-4.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-950/40 px-2 py-1 rounded-md text-xs font-bold text-slate-655 dark:text-slate-400 border border-slate-200/10">
                          <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>{exam.duration}m</span>
                        </div>
                      </TableCell>

                      {/* Exam Type */}
                      <TableCell className="py-4.5 px-4 text-center">
                        <Badge 
                          variant="outline"
                          className={`font-black text-[10px] uppercase border tracking-wider ${
                            (exam.examType || "Objectives") === "Theory"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40"
                              : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/40"
                          }`}
                        >
                          {exam.examType || "Objectives"}
                        </Badge>
                      </TableCell>

                      {/* Questions */}
                      <TableCell className="py-4.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-350 font-bold text-sm">
                          <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{exam.questionIds?.length || 0}</span>
                        </div>
                      </TableCell>

                      {/* Status Toggle */}
                      <TableCell className="py-4.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={exam.isActive}
                            onCheckedChange={(checked) =>
                              toggleExamMutation.mutate({
                                examId: exam.id,
                                isActive: checked,
                              })
                            }
                            data-testid={`switch-active-${exam.id}`}
                            className="data-[state=checked]:bg-indigo-650"
                          />
                          <span className={`text-xs font-bold uppercase ${exam.isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                            {exam.isActive ? "Active" : "Draft"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4.5 px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/exams/${exam.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-view-${exam.id}`}
                              className="h-8.5 w-8.5 rounded-xl text-indigo-655 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:text-indigo-400"
                              title="Inspect Exam Paper"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExamMutation.mutate(exam.id)}
                            data-testid={`button-delete-${exam.id}`}
                            className="h-8.5 w-8.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-455"
                            title="Trash Paper"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-450 italic font-bold">
                      No exams found matching the active query filters. Try adjusting your school term, target class, or search keywords!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginated Footer */}
          <div className="bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/40 px-6 py-4 flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">
              Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} exam{totalItems !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="h-8 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="h-8 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-2xl">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-800" />
            <h3 className="mb-2 text-lg font-black text-slate-700 dark:text-slate-350">No Exam Papers Yet</h3>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Get started by creating your first objectives or theory question paper sheet.
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              data-testid="button-create-first-exam"
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl"
            >
              <Plus className="mr-2 h-4.5 w-4.5" />
              Create First Exam
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExamForm({
  questions,
  onSuccess,
}: {
  questions: Question[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    duration: 60,
    passingScore: 60,
    questionIds: [] as string[],
    classLevel: "JSS1",
    term: "First Term",
    department: "" as string,
    numberOfQuestionsToDisplay: undefined as number | undefined,

    theoryInstructions: "",
    examType: "Objectives" as "Objectives" | "Theory",
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
    subjectConfig: {} as Record<string, number>,
  });
  const [useSubjectSelectionLogic, setUseSubjectSelectionLogic] = useState(false);
  const [assignRandomQuestions, setAssignRandomQuestions] = useState(false);
  const [selectedExamTypes, setSelectedExamTypes] = useState<Record<string, boolean>>({
    "Objectives": true,
    "Theory": true,
  });

  const availableQuestions = questions.filter((q) => {
    const selectedSubjects = formData.subject
      ? formData.subject.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const qDepts = q.department ? q.department.split(",").map(d => d.trim()).filter(Boolean) : [];
    const matchDept = !formData.department || formData.department === "General"
      ? (qDepts.length === 0 || qDepts.includes("General"))
      : (qDepts.length === 0 || qDepts.includes("General") || qDepts.includes(formData.department));

    const matchSubject = selectedSubjects.length > 0
      ? selectedSubjects.map(s => s.toLowerCase()).includes((q.subject || "").toLowerCase())
      : true;

    let match = matchSubject &&
      (formData.classLevel ? q.classLevel === formData.classLevel : true) &&
      (formData.term ? q.term === formData.term : true) &&
      matchDept;

    if (match) {
      const type = q.examType || "Objectives";
      if (!selectedExamTypes[type]) return false;
    }

    return match;
  });

  const createExamMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/exams", { ...data, assignRandomQuestions }),
    onSuccess: () => {
      toast({
        title: "Exam Created",
        description: "The examination paper sheet has been registered.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.message || "Failed to save exam paper.";
      toast({
        title: "Failed to Create",
        description: Array.isArray(errorMsg) ? errorMsg[0].message : errorMsg,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSubmit: any = { ...formData };

    if (formData.examType === "Theory") {
      if (formData.theoryConfig.mode === "auto") {
        const selectedSubjects = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
        const matchingQuestions = questions.filter(q =>
          (q.examType === "Theory" || q.questionType === "theory") &&
          q.classLevel === formData.classLevel &&
          (selectedSubjects.length === 0 || selectedSubjects.includes(q.subject))
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

      const extractIds = (slots: TheorySlot[]): string[] => {
        let ids: string[] = [];
        slots.forEach(slot => {
          if (slot.questionId) ids.push(slot.questionId);
          if (slot.children && slot.children.length > 0) ids = [...ids, ...extractIds(slot.children)];
        });
        return ids;
      };

      dataToSubmit.questionIds = extractIds(dataToSubmit.theoryConfig.structure);
    } else {
      const wantsServerSelection = !!formData.numberOfQuestionsToDisplay && formData.numberOfQuestionsToDisplay > 0;

      // If subjectConfig has multiple entries, calculate total and override wantsServerSelection
      const hasSubjectLimits = dataToSubmit.subjectConfig && Object.keys(dataToSubmit.subjectConfig).length > 1;
      let totalSubjectQuestions = 0;
      if (hasSubjectLimits) {
        totalSubjectQuestions = Object.values(dataToSubmit.subjectConfig).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        dataToSubmit.numberOfQuestionsToDisplay = totalSubjectQuestions;
      }

      const isDynamic = wantsServerSelection || totalSubjectQuestions > 0;

      if (!isDynamic && formData.questionIds.length === 0) {
        toast({
          title: "No Questions Selected",
          description: "Please pick at least one objective question or enable server selection.",
          variant: "destructive",
        });
        return;
      }

      if (!dataToSubmit.numberOfQuestionsToDisplay) {
        delete dataToSubmit.numberOfQuestionsToDisplay;
      }

      if (isDynamic && formData.questionIds.length === 0) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-xl font-black bg-gradient-to-r from-indigo-650 to-indigo-800 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" /> Create New Exam Paper
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          Configure title, duration constraints, objective/theory formats and selection.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 pt-3 max-h-[60vh] overflow-y-auto pr-2">
        <div className="space-y-1">
          <Label htmlFor="examType" className="text-xs font-bold text-slate-500 dark:text-slate-400">Exam Formatting Type *</Label>
          <select
            id="examType"
            value={formData.examType}
            onChange={e => setFormData({ ...formData, examType: e.target.value as any })}
            required
            className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-300"
            data-testid="select-exam-type"
          >
            <option value="Objectives">Objectives (Multiple Choice)</option>
            <option value="Theory">Theory (Nested Structure)</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="classLevel" className="text-xs font-bold text-slate-500 dark:text-slate-400">Target Classroom *</Label>
            <select
              id="classLevel"
              value={formData.classLevel}
              onChange={e => setFormData({ ...formData, classLevel: e.target.value, subject: '', questionIds: [], department: '', subjectConfig: {} })}
              required
              className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-300"
              data-testid="select-exam-class-level"
            >
              {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="term" className="text-xs font-bold text-slate-500 dark:text-slate-400">School Term *</Label>
            <select
              id="term"
              value={formData.term}
              onChange={e => setFormData({ ...formData, term: e.target.value, subject: '', questionIds: [], subjectConfig: {} })}
              required
              className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-300"
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
          <div className="space-y-1 animate-in fade-in duration-300">
            <Label htmlFor="department" className="text-xs font-bold text-slate-500 dark:text-slate-400">SS Department</Label>
            <select
              id="department"
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value, questionIds: [] })}
              required
              className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-550 h-10 font-bold text-slate-700 dark:text-slate-300"
              data-testid="select-exam-department"
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
          <Label htmlFor="title" className="text-xs font-bold text-slate-500 dark:text-slate-400">Exam Title *</Label>
          <Input
            id="title"
            placeholder="e.g., Mathematics Second Term Examination"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-550 bg-slate-50/50 dark:bg-slate-950/40"
            data-testid="input-exam-title"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs font-bold text-slate-500 dark:text-slate-400">Instructions / Guidelines</Label>
          <Textarea
            id="description"
            placeholder="Review exam parameters before student commencement."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-550 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
            data-testid="textarea-exam-description"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Subject selections */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Subject Filters *</Label>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50/30 dark:bg-slate-950/30">
              {Array.from(new Set(questions.filter(q => q.classLevel === formData.classLevel).map(q => q.subject))).map(subject => {
                const selectedList = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
                const isChecked = selectedList.includes(subject);
                return (
                  <div key={subject} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id={`subject-select-${subject}`}
                      checked={isChecked}
                      onChange={(e) => {
                        let newList;
                        const newConfig = { ...(formData.subjectConfig || {}) };
                        if (e.target.checked) {
                          newList = [...selectedList, subject];
                          newConfig[subject] = 10;
                        } else {
                          newList = selectedList.filter(s => s !== subject);
                          delete newConfig[subject];
                        }
                        setFormData({ ...formData, subject: newList.join(", "), questionIds: [], subjectConfig: newConfig });
                      }}
                      className="rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500"
                    />
                    <Label htmlFor={`subject-select-${subject}`} className="text-xs font-medium cursor-pointer select-none text-slate-700 dark:text-slate-350">
                      {subject}
                    </Label>
                  </div>
                );
              })}
              {questions.filter(q => q.classLevel === formData.classLevel).length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No existing questions found for this class.</p>
              )}
            </div>
            {/* Custom subject */}
            <div className="flex gap-2 items-center mt-2">
              <Input
                placeholder="Or type a custom subject name..."
                id="custom-subject"
                className="h-8.5 text-xs flex-1 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      const selectedList = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
                      if (!selectedList.includes(val)) {
                        const newConfig = { ...(formData.subjectConfig || {}), [val]: 10 };
                        setFormData({ ...formData, subject: [...selectedList, val].join(", "), questionIds: [], subjectConfig: newConfig });
                      }
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800"
                onClick={() => {
                  const input = document.getElementById("custom-subject") as HTMLInputElement | null;
                  const val = input?.value.trim();
                  if (val) {
                    const selectedList = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
                    if (!selectedList.includes(val)) {
                      const newConfig = { ...(formData.subjectConfig || {}), [val]: 10 };
                      setFormData({ ...formData, subject: [...selectedList, val].join(", "), questionIds: [], subjectConfig: newConfig });
                    }
                    if (input) input.value = "";
                  }
                }}
              >
                Add
              </Button>
            </div>
            {formData.subject && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.subject.split(",").map(s => s.trim()).filter(Boolean).map(subj => (
                  <Badge key={subj} variant="secondary" className="text-[9px] py-0.5 pr-1 flex items-center gap-1 font-bold">
                    {subj}
                    <button
                      type="button"
                      onClick={() => {
                        const selectedList = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
                        const newList = selectedList.filter(s => s !== subj);
                        const newConfig = { ...(formData.subjectConfig || {}) };
                        delete newConfig[subj];
                        setFormData({ ...formData, subject: newList.join(", "), questionIds: [], subjectConfig: newConfig });
                      }}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full text-xs font-bold leading-none"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <input type="hidden" value={formData.subject} required />
          </div>

          <div className="space-y-4">
            {/* Duration */}
            <div className="space-y-1">
              <Label htmlFor="duration" className="text-xs font-bold text-slate-500 dark:text-slate-400">Duration (Minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                required
                className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-550 bg-slate-50/50 dark:bg-slate-950/40 font-bold"
                data-testid="input-exam-duration"
              />
            </div>

            {/* Passing Score */}
            <div className="space-y-1">
              <Label htmlFor="passingScore" className="text-xs font-bold text-slate-500 dark:text-slate-400">Passing Score Limit (%) *</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={formData.passingScore || ""}
                onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                required
                className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-550 bg-slate-50/50 dark:bg-slate-950/40 font-bold"
                data-testid="input-exam-passing-score"
              />
            </div>
          </div>
        </div>

        {/* Display limit */}
        <div className="space-y-1">
          <Label htmlFor="numberOfQuestionsToDisplay" className="text-xs font-bold text-slate-500 dark:text-slate-400">Question Display Pool Limit</Label>
          <Input
            id="numberOfQuestionsToDisplay"
            type="number"
            min="0"
            disabled={formData.examType === "Theory" || Object.keys(formData.subjectConfig || {}).length > 1}
            placeholder={formData.examType === "Theory" ? "Not applicable for Theory" : Object.keys(formData.subjectConfig || {}).length > 1 ? "Calculated from subject limits" : `Defaults to all ${formData.questionIds.length} selected`}
            value={Object.keys(formData.subjectConfig || {}).length > 1 
              ? (Object.values(formData.subjectConfig || {}).reduce((sum, val) => sum + (Number(val) || 0), 0) || "")
              : (formData.numberOfQuestionsToDisplay ?? "")}
            onChange={(e) => setFormData({ ...formData, numberOfQuestionsToDisplay: e.target.value ? parseInt(e.target.value) : undefined })}
            className="h-10 border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40"
            data-testid="input-exam-questions-to-display"
          />
          <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1">
            If configured, the server presents a randomized subset of this limit size to the student.
          </p>
        </div>

        {/* Custom Subject Limits */}
        {formData.examType !== "Theory" && formData.subject && formData.subject.split(",").map(s => s.trim()).filter(Boolean).length > 1 && (
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 animate-in fade-in duration-300">
            <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Question Limits per Subject</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {formData.subject.split(",").map(s => s.trim()).filter(Boolean).map(subj => (
                <div key={subj} className="flex items-center gap-2">
                  <Label htmlFor={`subject-limit-${subj}`} className="text-xs font-bold text-slate-600 dark:text-slate-400 min-w-[120px] truncate">{subj}:</Label>
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
                    className="h-8.5 text-xs font-bold w-24 rounded-lg border-slate-200 dark:border-slate-800 bg-white"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Set the exact number of random questions to draw from the pool for each subject. Leave blank or 0 to include all selected questions.
            </p>
          </div>
        )}

        {/* Theory structures */}
        {formData.examType === "Theory" && (
          <div className="space-y-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 p-4.5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2 mb-4">
              <Label className="text-sm font-black text-slate-700 dark:text-slate-350">Theory Structure Builder</Label>
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40">
                <Button
                  type="button"
                  variant="ghost"
                  className={`h-7 px-3 text-xs font-bold rounded-lg ${formData.theoryConfig.mode === "manual" ? "bg-white dark:bg-slate-800 text-indigo-650 shadow-sm" : "text-slate-500"}`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    theoryConfig: { ...prev.theoryConfig, mode: "manual" }
                  }))}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={`h-7 px-3 text-xs font-bold rounded-lg ${formData.theoryConfig.mode === "auto" ? "bg-white dark:bg-slate-800 text-indigo-650 shadow-sm" : "text-slate-500"}`}
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
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="totalMainQuestions" className="text-xs font-bold text-slate-500">Total Main Questions</Label>
                    <Input
                      id="totalMainQuestions"
                      type="number"
                      min="1"
                      value={formData.theoryConfig.settings.totalMainQuestions || 1}
                      className="h-10 rounded-xl"
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
                    <Label className="text-xs font-bold text-slate-500">Structure Rules</Label>
                    <div className="space-y-2 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-655 dark:text-slate-400">Alphabet numbering (a,b,c)</span>
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
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-655 dark:text-slate-400">Roman numbering (i,ii,iii)</span>
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
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                  <Label className="mb-2 block text-xs font-bold text-slate-500">Auto-Generated Structure Preview</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2.5 rounded-xl border bg-slate-950 p-4 text-[11px] font-mono text-slate-300">
                    {formData.theoryConfig.structure.length === 0 && (
                      <p className="text-slate-500 italic">Configure rules to preview nestings.</p>
                    )}
                    {formData.theoryConfig.structure.map((main: TheorySlot) => (
                      <div key={main.id} className="space-y-1">
                        <div className="font-extrabold text-indigo-400">Question {main.label}</div>
                        {main.children.map((sub: TheorySlot) => (
                          <div key={sub.id} className="ml-4 flex items-center gap-2">
                            <span className="font-bold text-emerald-400">({sub.label})</span>
                            <div className="flex-1 border-b border-slate-800 border-dotted" />
                            {sub.children.map((nested: TheorySlot) => (
                              <Badge key={nested.id} variant="outline" className="text-[9px] py-0 border-slate-800 text-slate-400">{nested.label}.</Badge>
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
                availableQuestions={questions.filter(q => {
                  const selectedSubjects = formData.subject ? formData.subject.split(",").map(s => s.trim()).filter(Boolean) : [];
                  return q.examType === "Theory" &&
                         q.classLevel === formData.classLevel &&
                         (selectedSubjects.length === 0 || selectedSubjects.includes(q.subject));
                })}
              />
            )}

            <div className="space-y-1">
              <Label htmlFor="theoryInstructions" className="text-xs font-bold text-slate-500">Theory Instructions</Label>
              <Textarea
                id="theoryInstructions"
                placeholder="e.g., Answer any four questions. All questions carry equal marks."
                value={formData.theoryInstructions}
                onChange={(e) => setFormData({ ...formData, theoryInstructions: e.target.value })}
                className="h-16 border-slate-200 dark:border-slate-800 rounded-xl"
                data-testid="textarea-theory-instructions"
              />
            </div>
          </div>
        )}

        {/* Selection logic checkbox */}
        <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/40">
          <input
            type="checkbox"
            id="subject-selection-logic"
            checked={useSubjectSelectionLogic}
            onChange={e => setUseSubjectSelectionLogic(e.target.checked)}
            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0"
          />
          <Label htmlFor="subject-selection-logic" className="text-xs font-bold text-slate-655 dark:text-slate-400 cursor-pointer">
            Filter: Group available questions alphabetically by Subject
          </Label>
        </div>

        {/* Randomize checkbox */}
        <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/40">
          <input
            type="checkbox"
            id="assign-random-questions"
            checked={assignRandomQuestions}
            onChange={e => setAssignRandomQuestions(e.target.checked)}
            className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0"
          />
          <Label htmlFor="assign-random-questions" className="text-xs font-bold text-slate-655 dark:text-slate-400 cursor-pointer">
            Randomize question sheet indices for each candidate
          </Label>
        </div>

        {/* Select questions block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2 mb-2">
            <Label className="text-xs font-black text-slate-700">Select Question Content ({availableQuestions.length} Match)</Label>
            <Button type="button" variant="ghost" size="sm" onClick={selectAllQuestions} className="text-xs text-indigo-650 hover:bg-indigo-50 font-bold h-7 rounded-lg" data-testid="button-select-all-questions">
              Select All
            </Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-250 dark:border-slate-800 p-4 bg-slate-50/20 dark:bg-slate-950/20">
            {useSubjectSelectionLogic ? (
              <>
                <div className="mb-3 flex items-center gap-2 text-xs">
                  <Label className="font-bold text-slate-500">Group Focus:</Label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="border rounded-lg px-2 py-1 bg-white dark:bg-slate-900 border-slate-200"
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
                      <div key={question.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-850/60 p-3 bg-white dark:bg-slate-900 hover:border-indigo-400 hover-glow transition-all duration-300">
                        <input
                          type="checkbox"
                          id={`question-${question.id}`}
                          checked={formData.questionIds.includes(question.id)}
                          onChange={() => toggleQuestion(question.id)}
                          className="mt-1 rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0"
                          data-testid={`checkbox-question-${question.id}`}
                        />
                        <Label htmlFor={`question-${question.id}`} className="flex-1 cursor-pointer text-xs">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <Badge variant="secondary" className="text-[9px] font-bold py-0">{question.subject}</Badge>
                            <Badge variant="outline" className="text-[9px] font-bold py-0">{question.examType || "Objectives"}</Badge>
                            <Badge variant="outline" className="text-[9px] font-bold py-0 bg-slate-50">{question.difficulty}</Badge>
                          </div>
                          <p className="font-medium text-slate-700 dark:text-slate-300 leading-normal">{question.questionText}</p>
                        </Label>
                      </div>
                    ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-6 italic">No questions match the current subject scope.</p>
                )}
              </>
            ) : (
              availableQuestions.length > 0 ? (
                availableQuestions.map((question) => (
                  <div key={question.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-850/60 p-3 bg-white dark:bg-slate-900 hover:border-indigo-400 hover-glow transition-all duration-300">
                    <input
                      type="checkbox"
                      id={`question-${question.id}`}
                      checked={formData.questionIds.includes(question.id)}
                      onChange={() => toggleQuestion(question.id)}
                      className="mt-1 rounded text-indigo-650 focus:ring-indigo-500 h-4 w-4 shrink-0"
                      data-testid={`checkbox-question-${question.id}`}
                    />
                    <Label htmlFor={`question-${question.id}`} className="flex-1 cursor-pointer text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge variant="secondary" className="text-[9px] font-bold py-0">{question.subject}</Badge>
                        <Badge variant="outline" className="text-[9px] font-bold py-0">{question.examType || "Objectives"}</Badge>
                        <Badge variant="outline" className="text-[9px] font-bold py-0 bg-slate-50">{question.difficulty}</Badge>
                      </div>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-normal">{question.questionText}</p>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-6 italic">No questions match the current classroom level.</p>
              )
            )}
          </div>
          <div className="flex flex-col gap-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <p className="text-xs font-black text-slate-700 dark:text-slate-300">
              {formData.questionIds.length} question(s) active in exam sheet pool
            </p>
            {formData.subject && formData.subject.split(",").map(s => s.trim()).filter(Boolean).length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.subject.split(",").map(s => s.trim()).filter(Boolean).map(subj => {
                  const count = formData.questionIds.filter(qId => {
                    const q = questions.find(question => question.id === qId);
                    return q && q.subject.toLowerCase() === subj.toLowerCase();
                  }).length;
                  return (
                    <Badge key={subj} variant="outline" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[10px] font-bold py-0.5 px-2">
                      {subj}: {count} Qs
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="border-t border-slate-100 dark:border-slate-850 pt-4 gap-2">
        <Button 
          type="submit" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 h-9 rounded-xl text-xs" 
          disabled={createExamMutation.isPending}
          data-testid="button-submit-exam"
        >
          {createExamMutation.isPending ? "Drafting..." : "Create Exam Paper"}
        </Button>
      </DialogFooter>
    </form>
  );
}
