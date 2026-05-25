import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
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
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");
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

  // Helper selectors
  const getStudentAverage = (studentId: string) => {
    const studentResults = results.filter((r) => r.studentId === studentId);
    if (studentResults.length === 0) return null;
    const avg = studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length;
    return Math.round(avg);
  };

  const getStudentAcademicStanding = (avg: number | null) => {
    if (avg === null) return { label: "No Exams", color: "bg-slate-100 text-slate-600 border-slate-200" };
    if (avg >= 75) return { label: "Excellent", color: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse" };
    if (avg >= 50) return { label: "Passing", color: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: "Needs Help", color: "bg-rose-50 text-rose-700 border-rose-200" };
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

  // Badge Style Functions
  const getSexBadge = (sex: string | null | undefined) => {
    if (sex === "M") return <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 text-white border-none font-semibold text-[10px] tracking-wider uppercase">Male</Badge>;
    if (sex === "F") return <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white border-none font-semibold text-[10px] tracking-wider uppercase">Female</Badge>;
    return <Badge variant="outline" className="text-slate-400 border-slate-200">N/A</Badge>;
  };

  const getDeptBadge = (dept: string | null | undefined) => {
    if (!dept) return null;
    const styles: Record<string, string> = {
      Science: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      Commercial: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
      Art: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      General: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      Others: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    };
    return (
      <Badge variant="outline" className={`font-bold text-[10px] uppercase shadow-none border ${styles[dept] || styles.Others}`}>
        {dept}
      </Badge>
    );
  };

  const getClassBadge = (cls: string | null | undefined) => {
    if (!cls) return <Badge variant="outline">N/A</Badge>;
    const isSSS = cls.startsWith("SS") || ["WAEC", "NECO", "GCE"].some(k => cls.includes(k));
    return (
      <Badge className={isSSS ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200" : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"}>
        {cls}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header and Smart Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
            Student Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Enroll and track active student profiles, academic standings, and custom exam attempts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddManualOpen(true)}
            className="shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-105 duration-200 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Enroll Student
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
            className="border-primary/30 text-primary hover:bg-primary/5 shadow-sm transition-all duration-200"
          >
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>

          <Button
            variant="ghost"
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
            className="hover:bg-slate-100 hover:text-slate-900 border"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Analytics Widget Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-20 w-20 text-indigo-900" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-1.5 tracking-wider uppercase">
              <Users className="h-4 w-4 text-indigo-500" /> Total Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-800">{totalCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
              <span>{maleCount} Male</span> • <span>{femaleCount} Female</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-20 w-20 text-white" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-200 flex items-center gap-1.5 tracking-wider uppercase">
              <TrendingUp className="h-4 w-4 text-indigo-200" /> School Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-white">{averagePerformance}%</div>
            <p className="text-[11px] text-indigo-100 mt-1.5 font-semibold flex items-center gap-1 opacity-90">
              <Badge variant="outline" className={`border-none ${activeStanding.color} font-black`}>{activeStanding.label}</Badge>
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <GraduationCap className="h-20 w-20 text-slate-800" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-1.5 tracking-wider uppercase">
              <GraduationCap className="h-4 w-4 text-emerald-500" /> Senior School
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-800">
              {students.filter(s => s.classLevel?.startsWith("SS")).length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Active Senior High students
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="h-20 w-20 text-slate-800" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 flex items-center gap-1.5 tracking-wider uppercase">
              <Sparkles className="h-4 w-4 text-amber-500" /> Junior School
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-800">
              {students.filter(s => s.classLevel?.startsWith("JS")).length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">
              Active Junior High students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sleek Filters & Sorting Controls */}
      <Card className="border-none shadow-md bg-white">
        <CardContent className="py-5 px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 focus-visible:ring-indigo-600 bg-slate-50/50"
              />
            </div>

            {/* Filter Class */}
            <div className="md:col-span-2.5 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border rounded-md px-3 py-1.5 w-full bg-slate-50/50 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="All">All Classes</option>
                {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter Department */}
            <div className="md:col-span-2.5">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="border rounded-md px-3 py-1.5 w-full bg-slate-50/50 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="All">All Departments</option>
                <option value="General">General</option>
                <option value="Science">Science</option>
                <option value="Commercial">Commercial</option>
                <option value="Art">Art</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Sorting Choice */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-md px-3 py-1.5 w-full bg-slate-50/50 text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="id-asc">Student ID (Asc)</option>
                <option value="id-desc">Student ID (Desc)</option>
                <option value="performance-desc">Highest Performance 📈</option>
                <option value="performance-asc">Needs Improvement 📉</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Student Portal List (Grid / Card list) */}
      <Card className="border-none shadow-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Student details</th>
                <th className="py-4 px-4 text-center">Class / Dept</th>
                <th className="py-4 px-4 text-center">Gender</th>
                <th className="py-4 px-4 text-center">Avg. Score</th>
                <th className="py-4 px-4 text-center">Academic Standing</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length > 0 ? (
                sortedStudents.map((s) => {
                  const avg = getStudentAverage(s.studentId);
                  const standing = getStudentAcademicStanding(avg);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setLocation(`/admin/results/student/${s.studentId}`)}
                      className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Name & ID Column */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 transition-transform group-hover:scale-105 duration-200">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-sm leading-normal group-hover:text-indigo-600 transition-colors">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded w-fit">
                            {s.studentId}
                          </p>
                        </div>
                      </td>

                      {/* Class / Department Column */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          {getClassBadge(s.classLevel)}
                          {s.department && getDeptBadge(s.department)}
                        </div>
                      </td>

                      {/* Sex/Gender Column */}
                      <td className="py-4 px-4 text-center">
                        {getSexBadge(s.sex)}
                      </td>

                      {/* Avg. Score Column */}
                      <td className="py-4 px-4 text-center">
                        <span className={`text-base font-black tracking-tight ${avg !== null ? (avg >= 75 ? "text-emerald-600" : avg >= 50 ? "text-indigo-600" : "text-rose-500") : "text-slate-400 font-medium text-xs"}`}>
                          {avg !== null ? `${avg}%` : "No Record"}
                        </span>
                      </td>

                      {/* Academic Standing */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`font-semibold shadow-none text-xs border ${standing.color}`}>
                            {standing.label}
                          </Badge>
                        </div>
                      </td>

                      {/* Actions Buttons */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/results/student/${s.studentId}`}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                              title="View Student Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            onClick={() => {
                              setEditingStudent(s);
                              setIsEditOpen(true);
                            }}
                            title="Edit Student Info"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => setDeleteConfirm({ open: true, id: s.id, name: s.name })}
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-200" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-500">No students enrolled</p>
                      <p className="text-xs text-slate-400 mt-1">Try expanding your search parameters or enroll manually.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Enroll Dialog */}
      <Dialog open={isAddManualOpen} onOpenChange={setIsAddManualOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" /> Student Enrollment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the biodata fields below to create a fresh student credentials set.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4 pt-3">
            <div className="space-y-1">
              <Label htmlFor="manual-name" className="text-xs font-bold text-slate-600">Full Name *</Label>
              <Input
                id="manual-name"
                placeholder="e.g. John Doe"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-id" className="text-xs font-bold text-slate-600">Student ID / Login passcode *</Label>
              <Input
                id="manual-id"
                placeholder="e.g. student-001"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="manual-class" className="text-xs font-bold text-slate-600">Class Level *</Label>
                <select
                  id="manual-class"
                  value={manualClassLevel}
                  onChange={(e) => setManualClassLevel(e.target.value)}
                  className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
                  required
                >
                  <option value="">Select Class</option>
                  {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="manual-sex" className="text-xs font-bold text-slate-600">Sex / Gender *</Label>
                <select
                  id="manual-sex"
                  value={manualSex}
                  onChange={(e) => setManualSex(e.target.value)}
                  className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
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
                <Label htmlFor="manual-dept" className="text-xs font-bold text-slate-600">Department *</Label>
                <select
                  id="manual-dept"
                  value={manualDept}
                  onChange={(e) => setManualDept(e.target.value)}
                  className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddManualOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={addStudentMutation.isPending}>
                {addStudentMutation.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-600" /> Edit Student details
            </DialogTitle>
            <DialogDescription className="text-xs">Modify the biodata details of the student.</DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs font-bold text-slate-600">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-id" className="text-xs font-bold text-slate-600">Student ID</Label>
                <Input
                  id="edit-id"
                  value={editingStudent.studentId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-class" className="text-xs font-bold text-slate-600">Class Level</Label>
                  <select
                    id="edit-class"
                    value={editingStudent.classLevel || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, classLevel: e.target.value })}
                    className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
                  >
                    <option value="">Select Class</option>
                    {["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "WAEC", "NECO", "GCE WAEC", "GCE NECO"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-sex" className="text-xs font-bold text-slate-600">Gender</Label>
                  <select
                    id="edit-sex"
                    value={editingStudent.sex || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, sex: e.target.value })}
                    className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              {["SS1", "SS2", "SS3"].includes(editingStudent.classLevel || "") && (
                <div className="space-y-1">
                  <Label htmlFor="edit-dept" className="text-xs font-bold text-slate-600">Department</Label>
                  <select
                    id="edit-dept"
                    value={editingStudent.department || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                    className="border rounded-md px-3 py-1.5 w-full bg-white text-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 h-9"
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

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={updateStudentMutation.isPending}>
                  {updateStudentMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-white rounded-xl border p-6">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce" />
              <AlertDialogTitle className="text-lg font-bold">Are you absolutely sure?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-500 mt-2">
              This action is irreversible. This will permanently delete student <span className="font-bold text-slate-700">{deleteConfirm.name}</span> and remove all of their academic records, history, and test logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="text-slate-500">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
