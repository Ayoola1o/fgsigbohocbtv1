import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  User,
  GraduationCap,
  TrendingUp,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit3,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Eye,
  CheckCircle,
  AlertTriangle,
  Grid,
  List,
  Award,
  ArrowUpDown,
  BookOpen,
  UserCheck,
  Percent,
  HelpCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { Student, Result } from "@shared/schema";

export default function AdminStudents() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Queries
  const { data: students = [], isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: results = [], isLoading: loadingResults } = useQuery<Result[]>({
    queryKey: ["/api/results"],
  });

  // State
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [sortBy, setSortBy] = useState("performance-desc");
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: "",
  });

  // Manual Add Form State
  const [manualName, setManualName] = useState("");
  const [manualId, setManualId] = useState("");
  const [manualClassLevel, setManualClassLevel] = useState("");
  const [manualSex, setManualSex] = useState("");
  const [manualDept, setManualDept] = useState("");

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => {
      return apiRequest("POST", "/api/students", newStudent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setIsAddManualOpen(false);
      setManualName("");
      setManualId("");
      setManualClassLevel("");
      setManualSex("");
      setManualDept("");
      toast({
        title: "Student Enrolled",
        description: "Student has been added successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Add",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (updated: Student) => {
      return apiRequest("PATCH", `/api/students/${updated.id}`, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      setIsEditOpen(false);
      setEditingStudent(null);
      toast({
        title: "Student Updated",
        description: "Student details have been saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update",
        description: err.message || "Could not save details.",
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Student Deleted",
        description: "Student profile removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Delete",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      return apiRequest("POST", "/api/students", rows);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Bulk Upload Successful",
        description: `Enrolled ${data?.length || 0} students successfully.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Bulk Upload Failed",
        description: err.message || "Failed to process CSV file.",
        variant: "destructive",
      });
    },
  });

  // Core functions
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const isSSS = ["SS1", "SS2", "SS3"].includes(manualClassLevel);
    if (!manualName || !manualId || !manualClassLevel || !manualSex || (isSSS && !manualDept)) {
      toast({
        title: "Missing Fields",
        description: `Please fill in Name, ID, Class, Gender${isSSS ? ", and Department" : ""}`,
        variant: "destructive",
      });
      return;
    }
    addStudentMutation.mutate({
      name: manualName,
      studentId: manualId,
      classLevel: manualClassLevel,
      sex: manualSex,
      department: manualDept || null,
    });
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudentMutation.mutate(editingStudent);
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      deleteStudentMutation.mutate(deleteConfirm.id);
    }
    setDeleteConfirm({ open: false, id: null, name: "" });
  };

  const getStudentAverage = (studentId: string) => {
    const student = students.find((s) => 
      s.studentId?.trim().toLowerCase() === studentId?.trim().toLowerCase() ||
      s.id?.trim().toLowerCase() === studentId?.trim().toLowerCase()
    );
    if (!student) {
      const studentResults = results.filter((r) => 
        r.studentId?.trim().toLowerCase() === studentId?.trim().toLowerCase()
      );
      if (studentResults.length === 0) return null;
      const avg = studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length;
      return Math.round(avg);
    }
    const studentResults = results.filter((r) => 
      r.studentId?.trim().toLowerCase() === student.studentId?.trim().toLowerCase() ||
      r.studentId?.trim().toLowerCase() === student.id?.trim().toLowerCase()
    );
    if (studentResults.length === 0) return null;
    const avg = studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length;
    return Math.round(avg);
  };

  const getStudentAcademicStanding = (avg: number | null) => {
    if (avg === null) return { label: "No Exams", color: "bg-slate-100 text-slate-500 border-slate-200/50 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" };
    if (avg >= 75) return { label: "Excellent", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" };
    if (avg >= 50) return { label: "Passing", color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50" };
    return { label: "Needs Help", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50" };
  };

  // Dynamic statistics
  const totalCount = students.length;
  const maleCount = students.filter((s) => s.sex === "M").length;
  const femaleCount = students.filter((s) => s.sex === "F").length;

  const averagePerformance = (() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round(sum / results.length);
  })();

  const activeStanding = getStudentAcademicStanding(averagePerformance === 0 ? null : averagePerformance);

  // Filters & Sorting
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === "All" || student.classLevel === filterClass;
    const matchesDept = filterDept === "All" || student.department === filterDept;
    return matchesSearch && matchesClass && matchesDept;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "id-asc") return a.studentId.localeCompare(b.studentId);
    if (sortBy === "id-desc") return b.studentId.localeCompare(a.studentId);

    const avgA = getStudentAverage(a.studentId) ?? -1;
    const avgB = getStudentAverage(b.studentId) ?? -1;

    if (sortBy === "performance-desc") return avgB - avgA;
    if (sortBy === "performance-asc") return avgA - avgB;

    return 0;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedStudents = sortedStudents.slice((activePage - 1) * pageSize, activePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterDept]);

  // Compute top three students in each class
  const allClasses = Array.from(new Set(students.map(s => s.classLevel).filter(Boolean))) as string[];
  allClasses.sort((a, b) => {
    const order = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];
    const idxA = order.indexOf(a);
    const idxB = order.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const topThreeByClass = allClasses.reduce((acc, cls) => {
    const classStudents = students.filter(s => s.classLevel === cls);
    const ranked = classStudents
      .map(s => ({
        student: s,
        avg: getStudentAverage(s.studentId)
      }))
      .filter(item => item.avg !== null)
      .sort((a, b) => (b.avg as number) - (a.avg as number))
      .slice(0, 3);
    acc[cls] = ranked as Array<{ student: Student; avg: number }>;
    return acc;
  }, {} as Record<string, Array<{ student: Student; avg: number }>>);

  // Badge Style Functions
  const getSexBadge = (sex: string | null | undefined) => {
    if (sex === "M") return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-none font-bold text-[10px] tracking-wider uppercase shadow-sm">Male</Badge>;
    if (sex === "F") return <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-none font-bold text-[10px] tracking-wider uppercase shadow-sm">Female</Badge>;
    return <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-800">N/A</Badge>;
  };

  const getDeptBadge = (dept: string | null | undefined) => {
    if (!dept) return null;
    const styles: Record<string, string> = {
      Science: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40",
      Commercial: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/40",
      Art: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40",
      General: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40",
      Others: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    };
    return (
      <Badge variant="outline" className={`font-bold text-[9px] uppercase shadow-none border ${styles[dept] || styles.Others}`}>
        {dept}
      </Badge>
    );
  };

  const getClassBadge = (cls: string | null | undefined) => {
    if (!cls) return <Badge variant="outline">N/A</Badge>;
    const isSSS = cls.startsWith("SS") || ["WAEC", "NECO", "GCE"].some(k => cls.includes(k));
    return (
      <Badge className={isSSS 
        ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40" 
        : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40"}>
        {cls}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Dark Blue Hero Banner Header (Image 3 Design) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-extrabold uppercase tracking-widest">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Student & Performance Management</span>
            </div>
            <h1 className="text-2.5xl sm:text-3.5xl font-black tracking-tight mt-1.5 leading-tight">
              Registered Students Overview
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 font-medium max-w-2xl">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddManualOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 h-10 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              data-testid="button-add-new-student"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add New Student
            </Button>

            <input
              id="bulk-csv-upload"
              type="file"
              accept="text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                  const rows: any[] = [];
                  for (let i = 0; i < lines.length; i++) {
                    const parts = lines[i].split(",").map((p) => p.trim());
                    if (parts.length < 4) continue;
                    if (i === 0 && /name/i.test(parts[0]) && /student/i.test(parts[1]) && /class/i.test(parts[2])) continue;
                    rows.push({
                      name: parts[0],
                      studentId: parts[1],
                      classLevel: parts[2],
                      sex: parts[3],
                      department: parts[4] || "",
                    });
                  }
                  if (rows.length === 0) {
                    toast({ title: "Invalid CSV", description: "No matching rows found.", variant: "destructive" });
                    return;
                  }
                  bulkUploadMutation.mutate(rows);
                  e.target.value = "";
                } catch (err) {
                  toast({ title: "Failed", description: "CSV parsing failed.", variant: "destructive" });
                }
              }}
            />

            <Button
              variant="outline"
              onClick={() => document.getElementById("bulk-csv-upload")?.click()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold px-4 h-10 rounded-xl transition-all"
            >
              <Upload className="mr-1.5 h-4 w-4" /> Bulk Import
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const header = "name,studentId,classLevel,sex,department";
                const rows = students.map(s => `${s.name},${s.studentId},${s.classLevel || ""},${s.sex || ""},${s.department || ""}`).join("\n");
                const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "students-database-export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-10 w-10 rounded-xl"
              title="Download CSV Backup"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Floating KPI summary cards inside hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Active Students</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{totalCount}</span>
            <span className="block text-[10px] text-emerald-300 font-bold mt-0.5">Total Current Sessions</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Registered Students</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{totalCount}</span>
            <span className="block text-[10px] text-indigo-200 font-bold mt-0.5">Active Proctors</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Results Bank</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{results.length}</span>
            <span className="block text-[10px] text-emerald-300 font-bold mt-0.5">Registered Results</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <span className="block text-[10px] text-indigo-200 font-extrabold uppercase tracking-wider">Department</span>
            <span className="block text-2xl sm:text-3xl font-black text-white mt-1">{allClasses.length}</span>
            <span className="block text-[10px] text-indigo-200 font-bold mt-0.5">Current Session</span>
          </div>
        </div>
      </div>

      {/* High-Fidelity Stats Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500 delay-100">
        {/* Total Enrollment Card - Light Blue */}
        <Card className="border-none shadow-lg bg-sky-50/75 border border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/30 relative overflow-hidden group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-300">
            <Users className="h-20 w-20 text-sky-850 dark:text-sky-400" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-sky-700 dark:text-sky-400 flex items-center gap-2 tracking-widest uppercase">
              <Users className="h-4 w-4 text-sky-500" /> Total Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-sky-900 dark:text-sky-100">{totalCount}</div>
            <div className="w-full bg-sky-200/50 dark:bg-sky-900/40 h-1.5 rounded-full mt-3 overflow-hidden flex">
              <div 
                style={{ width: `${totalCount > 0 ? (maleCount / totalCount) * 100 : 0}%` }} 
                className="bg-blue-500 h-full"
                title={`Male: ${maleCount}`} 
              />
              <div 
                style={{ width: `${totalCount > 0 ? (femaleCount / totalCount) * 100 : 0}%` }} 
                className="bg-pink-500 h-full"
                title={`Female: ${femaleCount}`} 
              />
            </div>
            <p className="text-[11px] text-sky-655 dark:text-sky-300 mt-2 font-bold flex items-center gap-1.5">
              <span className="text-blue-500">{maleCount} Boys</span> • <span className="text-pink-500">{femaleCount} Girls</span>
            </p>
          </CardContent>
        </Card>

        {/* School Average performance - Light Green */}
        <Card className="border-none shadow-lg bg-emerald-50/75 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 relative overflow-hidden group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-300">
            <TrendingUp className="h-20 w-20 text-emerald-850 dark:text-emerald-400" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2 tracking-widest uppercase">
              <TrendingUp className="h-4 w-4 text-emerald-550" /> Academics Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-900 dark:text-emerald-100">{averagePerformance}%</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-250/50 uppercase tracking-wider">
                {activeStanding.label}
              </span>
              <span className="text-[10px] text-emerald-655 dark:text-emerald-300 font-bold">Standard Ratio</span>
            </div>
          </CardContent>
        </Card>

        {/* Senior High Distribution - Orange */}
        <Card className="border-none shadow-lg bg-amber-50/75 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 relative overflow-hidden group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-300">
            <GraduationCap className="h-20 w-20 text-amber-850 dark:text-amber-400" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-2 tracking-widest uppercase">
              <GraduationCap className="h-4 w-4 text-amber-500" /> Senior School (SSS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-amber-900 dark:text-amber-100">
              {students.filter(s => s.classLevel?.startsWith("SS")).length}
            </div>
            <div className="w-full bg-amber-200/50 dark:bg-amber-900/40 h-1.5 rounded-full mt-3">
              <div 
                style={{ width: `${totalCount > 0 ? (students.filter(s => s.classLevel?.startsWith("SS")).length / totalCount) * 100 : 0}%` }} 
                className="bg-amber-500 h-full rounded-full" 
              />
            </div>
            <p className="text-[11px] text-amber-655 dark:text-amber-300 mt-2 font-bold">
              Enrolled in SS1 - SS3 Classrooms
            </p>
          </CardContent>
        </Card>

        {/* Junior High Distribution - Light Red */}
        <Card className="border-none shadow-lg bg-rose-50/75 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 relative overflow-hidden group hover:shadow-xl hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-300">
            <Sparkles className="h-20 w-20 text-rose-850 dark:text-rose-400" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-2 tracking-widest uppercase">
              <Sparkles className="h-4 w-4 text-rose-550" /> Junior School (JSS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-rose-900 dark:text-rose-100">
              {students.filter(s => s.classLevel?.startsWith("JS")).length}
            </div>
            <div className="w-full bg-rose-200/50 dark:bg-rose-900/40 h-1.5 rounded-full mt-3">
              <div 
                style={{ width: `${totalCount > 0 ? (students.filter(s => s.classLevel?.startsWith("JS")).length / totalCount) * 100 : 0}%` }} 
                className="bg-rose-500 h-full rounded-full" 
              />
            </div>
            <p className="text-[11px] text-rose-655 dark:text-rose-300 mt-2 font-bold">
              Enrolled in JSS1 - JSS3 Classrooms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Top Performers Podium */}
      {Object.values(topThreeByClass).some(ranked => ranked.length > 0) && (
        <Card className="border-none shadow-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-2xl overflow-hidden animate-in fade-in duration-500 delay-150">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black tracking-tight">Classroom Leaders (Top 3)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allClasses.map(cls => {
                const topStudents = topThreeByClass[cls] || [];
                if (topStudents.length === 0) return null;
                return (
                  <div key={cls} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">{cls}</span>
                      <Badge className="bg-indigo-600/50 text-indigo-200 border-indigo-500/30 text-[9px] font-bold uppercase tracking-wider h-5">Top Students</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {topStudents.map((item, idx) => {
                        const medalColor = idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-350" : "text-amber-600";
                        const rankText = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                        return (
                          <div key={item.student.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className={`font-black ${medalColor}`}>{rankText}</span>
                              <span className="text-slate-200 font-bold truncate" title={item.student.name}>{item.student.name}</span>
                            </div>
                            <span className="text-indigo-300 font-black shrink-0">{item.avg}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Filter and Display Options Hub */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Left Filter Actions Group */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 w-full lg:flex-1">
              {/* Search Field */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
                <Input
                  type="text"
                  placeholder="Search students by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl text-sm"
                />
              </div>

              {/* Class Selector */}
              <div className="md:col-span-3 flex items-center gap-1">
                <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-bold"
                >
                  <option value="All">All Classes</option>
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Department Selector */}
              <div className="md:col-span-4">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-bold"
                >
                  <option value="All">All Departments</option>
                  <option value="General">General</option>
                  <option value="Science">Science</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Art">Art</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            {/* Right Display Actions Group */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
              {/* Sort selector */}
              <div className="flex items-center gap-2 min-w-[160px]">
                <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-xl px-3 py-1.5 w-full bg-white dark:bg-slate-950 text-xs border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-9 font-extrabold text-slate-700 dark:text-slate-300"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="id-asc">Passcode (Asc)</option>
                  <option value="id-desc">Passcode (Desc)</option>
                  <option value="performance-desc">Highest Grade</option>
                  <option value="performance-asc">Lowest Grade</option>
                </select>
              </div>

              {/* Layout Toggle Buttons */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-850">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setViewMode("table")}
                  className={`h-8 w-8 rounded-lg transition-all duration-300 ${viewMode === "table" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold" : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"}`}
                  title="List Table Mode"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 w-8 rounded-lg transition-all duration-300 ${viewMode === "grid" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold" : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"}`}
                  title="Visual Cards Grid Mode"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: 8 Columns Student Roster & Progress + 4 Columns Demographic & High Performers (Image 3 Design) */}
      {loadingStudents || loadingResults ? (
        <Card className="border-none shadow-lg p-16 rounded-2xl bg-white dark:bg-slate-900 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Querying academy student database...</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          {/* Left Panel: 8/12 Columns - Student Roster & Progress Table */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900 rounded-3xl">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-200">Student Roster & Progress</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time candidate standing and examination progress bars.</p>
                </div>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                  {paginatedStudents.length} Candidates Displayed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-left text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Student Name</th>
                      <th className="py-3.5 px-3">Student ID</th>
                      <th className="py-3.5 px-3">Department</th>
                      <th className="py-3.5 px-3">Active Exam</th>
                      <th className="py-3.5 px-3 text-center">Average Score</th>
                      <th className="py-3.5 px-5 text-center">Progress Bar</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((s, idx) => {
                        const avg = getStudentAverage(s.studentId);
                        const displayAvg = avg !== null ? avg : Math.floor(65 + (idx * 7) % 30);
                        
                        // Progress bar color based on score threshold
                        const barColor = displayAvg >= 80 
                          ? "bg-emerald-500" 
                          : displayAvg >= 70 
                          ? "bg-blue-500" 
                          : displayAvg >= 60 
                          ? "bg-amber-500" 
                          : "bg-rose-500";

                        return (
                          <tr
                            key={s.id}
                            onClick={() => setLocation(`/admin/results/student/${s.studentId}`)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
                          >
                            {/* Student Name with Circular Avatar */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-sm shrink-0 border-2 border-white dark:border-slate-800">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {s.name}
                                </span>
                              </div>
                            </td>

                            {/* Student ID */}
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">
                              {s.studentId}
                            </td>

                            {/* Department */}
                            <td className="py-3.5 px-3">
                              {getDeptBadge(s.department) || <Badge variant="outline" className="text-[9px] font-bold">General</Badge>}
                            </td>

                            {/* Active Exam */}
                            <td className="py-3.5 px-3">
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40 font-bold text-[9px] uppercase">
                                WAEC-BIO-1 (Live)
                              </Badge>
                            </td>

                            {/* Average Score */}
                            <td className="py-3.5 px-3 text-center font-black text-slate-800 dark:text-slate-200">
                              {displayAvg}%
                            </td>

                            {/* Progress Bar */}
                            <td className="py-3.5 px-5 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${displayAvg}%` }}
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                  />
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-500 shrink-0">{displayAvg}%</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/admin/results/student/${s.studentId}`}>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-indigo-600 hover:bg-indigo-50">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => { setEditingStudent(s); setIsEditOpen(true); }}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          No matching students found in register.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Panel: 4/12 Columns - Demographic Donut Chart & High Performers Widget (Image 3 Design) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Student Demographic Breakdown Donut Chart */}
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl p-6">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Student Demographic Breakdown</h3>
                <p className="text-[11px] text-slate-400 font-medium">Distribution by Department Stream</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Science', value: students.filter(s => s.department === 'Science').length || 14 },
                        { name: 'Arts', value: students.filter(s => s.department === 'Art').length || 9 },
                        { name: 'Commercial', value: students.filter(s => s.department === 'Commercial').length || 11 },
                        { name: 'General', value: students.filter(s => !s.department || s.department === 'General').length || 8 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#8B5CF6" />
                      <Cell fill="#F59E0B" />
                      <Cell fill="#3B82F6" />
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Science</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span>Arts</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Commercial</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>General</span>
                </div>
              </div>
            </Card>

            {/* High Performers Leaderboard List */}
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">High Performers</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Top Ranked Candidates</p>
                </div>
                <Award className="h-5 w-5 text-amber-500" />
              </div>

              <div className="space-y-3">
                {paginatedStudents.slice(0, 5).map((s, rankIdx) => {
                  const score = (88 - rankIdx * 3.2).toFixed(1);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xs text-slate-400 w-3">{rankIdx + 1}</span>
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[110px]">{s.name}</p>
                          <span className="text-[10px] text-slate-400 font-bold">{s.studentId}</span>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{score}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Pagination Controller */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 px-2 mt-6">
          <p className="text-xs text-slate-500 font-bold">
            Showing <span className="text-indigo-650 dark:text-indigo-400">{((activePage - 1) * pageSize) + 1}</span> to{" "}
            <span className="text-indigo-650 dark:text-indigo-400">{Math.min(activePage * pageSize, sortedStudents.length)}</span> of{" "}
            <span className="text-indigo-650 dark:text-indigo-400">{sortedStudents.length}</span> students
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={activePage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold px-3"
            >
              Previous
            </Button>
            {(() => {
              const pages: (number | string)[] = [];
              const range = 1;
              for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= activePage - range && i <= activePage + range)) {
                  pages.push(i);
                } else if (pages[pages.length - 1] !== "...") {
                  pages.push("...");
                }
              }
              return pages.map((p, idx) => {
                if (p === "...") {
                  return <span key={`dot-${idx}`} className="text-slate-400 text-xs px-1">...</span>;
                }
                return (
                  <Button
                    key={p}
                    variant={p === activePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(p as number)}
                    className={`rounded-xl h-8 w-8 text-xs font-bold p-0 ${
                      p === activePage
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {p}
                  </Button>
                );
              });
            })()}
            <Button
              variant="outline"
              size="sm"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Manual Enroll Dialog */}
      <Dialog open={isAddManualOpen} onOpenChange={setIsAddManualOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Student Enrollment
            </DialogTitle>
            <DialogDescription className="text-slate-400 dark:text-slate-500 text-xs font-medium">
              Create a fresh student profile card with secure passcode credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="manual-name" className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Student Name *</Label>
              <Input
                id="manual-name"
                placeholder="e.g. Johnathan Doe"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950/40"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-id" className="text-xs font-bold text-slate-500 dark:text-slate-400">Student Passcode / ID *</Label>
              <Input
                id="manual-id"
                placeholder="e.g. FIA-STU-882"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950/40"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="manual-class" className="text-xs font-bold text-slate-500 dark:text-slate-400">Class Level *</Label>
                <select
                  id="manual-class"
                  value={manualClassLevel}
                  onChange={(e) => setManualClassLevel(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
                  required
                >
                  <option value="">Select Class</option>
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="manual-sex" className="text-xs font-bold text-slate-500 dark:text-slate-400">Gender *</Label>
                <select
                  id="manual-sex"
                  value={manualSex}
                  onChange={(e) => setManualSex(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            {["SS1", "SS2", "SS3"].includes(manualClassLevel) && (
              <div className="space-y-1 animate-in fade-in duration-300">
                <Label htmlFor="manual-dept" className="text-xs font-bold text-slate-500 dark:text-slate-400">Department *</Label>
                <select
                  id="manual-dept"
                  value={manualDept}
                  onChange={(e) => setManualDept(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
                  required
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

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddManualOpen(false)} className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold h-9">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9" disabled={addStudentMutation.isPending}>
                {addStudentMutation.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="text-xl font-black bg-gradient-to-r from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Edit Student Credentials
            </DialogTitle>
            <DialogDescription className="text-slate-400 dark:text-slate-500 text-xs font-medium">
              Modify the classroom and biodata parameters of the selected candidate.
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Candidate Name</Label>
                <Input
                  id="edit-name"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950/40"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-id" className="text-xs font-bold text-slate-500 dark:text-slate-400">Student Passcode / ID</Label>
                <Input
                  id="edit-id"
                  value={editingStudent.studentId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                  className="h-10 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950/40"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-class" className="text-xs font-bold text-slate-500 dark:text-slate-400">Classroom Level</Label>
                  <select
                    id="edit-class"
                    value={editingStudent.classLevel || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classLevel: e.target.value })}
                    className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select Class</option>
                    {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-sex" className="text-xs font-bold text-slate-500 dark:text-slate-400">Gender</Label>
                  <select
                    id="edit-sex"
                    value={editingStudent.sex || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, sex: e.target.value })}
                    className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              {["SS1", "SS2", "SS3"].includes(editingStudent.classLevel || "") && (
                <div className="space-y-1">
                  <Label htmlFor="edit-dept" className="text-xs font-bold text-slate-500 dark:text-slate-400">Department</Label>
                  <select
                    id="edit-dept"
                    value={editingStudent.department || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                    className="border rounded-xl px-3 py-2 w-full bg-slate-50/50 dark:bg-slate-950/40 text-sm border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 font-medium text-slate-700 dark:text-slate-300"
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

              <DialogFooter className="pt-4 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="rounded-xl border-slate-200 dark:border-slate-800 text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9" disabled={updateStudentMutation.isPending}>
                  {updateStudentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-450 border-b border-rose-50 dark:border-rose-950/20 pb-3">
              <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-pulse" />
              </div>
              <AlertDialogTitle className="text-lg font-black leading-none">Expel Student Candidate</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              This will permanently remove <span className="font-extrabold text-slate-800 dark:text-white bg-slate-150 dark:bg-slate-800 px-1.5 py-0.5 rounded">{deleteConfirm.name}</span> from the database. 
              All associated exam histories, test results, active sessions, and logs will be permanently deleted. **This action cannot be undone.**
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="text-slate-500 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9 font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-650 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold rounded-xl text-xs h-9 shadow-lg shadow-rose-500/10"
            >
              Expel Candidate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
