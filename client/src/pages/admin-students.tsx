import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  uploadStudents
} from "@/lib/api";

export default function AdminStudents() {
  const [studentsList, setStudentsList] = useState<{ id: string; name: string; studentId: string; classLevel?: string; sex?: string | null }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<{ id: string; name: string; studentId: string; classLevel?: string; sex?: string | null } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean, id: string | null, name: string }>({ open: false, id: null, name: "" });

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteStudent(deleteConfirm.id);
      fetchStudents();
      toast({ title: "Student Deleted", description: `Student ${deleteConfirm.name} has been deleted.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to delete student", variant: "destructive" });
    }
    setDeleteConfirm({ open: false, id: null, name: "" });
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudentsList(data || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateStudent(editingStudent.id, {
        name: editingStudent.name,
        studentId: editingStudent.studentId,
        // @ts-ignore
        classLevel: editingStudent.classLevel,
        sex: editingStudent.sex
      });
      setIsEditOpen(false);
      setEditingStudent(null);
      fetchStudents();
      toast({
        title: "Student Updated",
        description: "Student details have been updated successfully.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Update Failed",
        description: "Failed to update student details.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = studentsList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground">
          Manage student data and enrollments
        </p>
      </div>

      {/* Students management (add / upload) */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a student manually or upload a CSV with columns "name,studentId".
            </p>

            <div className="grid gap-2 md:grid-cols-5">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Name</label>
                <Input id="student-name" placeholder="Student name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Student ID</label>
                <Input id="student-id" placeholder="student-123" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Class Level</label>
                <select id="student-class-level" className="border rounded px-2 py-1 w-full">
                  <option value="">Select</option>
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
              <div>
                <label className="mb-1 block text-sm font-medium">Sex</label>
                <select id="student-sex" className="border rounded px-2 py-1 w-full">
                  <option value="">Select</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const nameEl = document.getElementById("student-name") as HTMLInputElement | null;
                  const idEl = document.getElementById("student-id") as HTMLInputElement | null;
                  const classLevelEl = document.getElementById("student-class-level") as HTMLSelectElement | null;
                  const sexEl = document.getElementById("student-sex") as HTMLSelectElement | null;
                  const name = nameEl?.value?.trim();
                  const studentId = idEl?.value?.trim();
                  const classLevel = classLevelEl?.value || "";
                  const sex = sexEl?.value || "";
                  if (!name || !studentId || !classLevel || !sex) {
                    toast({
                      title: "Missing Fields",
                      description: "Please provide name, student id, class level, and sex",
                      variant: "destructive"
                    });
                    return;
                  }

                  try {
                    await addStudent({ name, studentId, classLevel, sex });
                    toast({
                      title: "Student Added",
                      description: `${name} has been successfully added.`,
                    });
                    if (nameEl) nameEl.value = "";
                    if (idEl) idEl.value = "";
                    if (classLevelEl) classLevelEl.value = "";
                    if (sexEl) sexEl.value = "";
                    fetchStudents();
                  } catch (e: any) {
                    console.error(e);
                    alert(e.message || "Failed to add student");
                  }
                }}
              >
                Add Student
              </Button>

              <input
                id="students-csv"
                type="file"
                accept="text/csv"
                className="hidden"
                onChange={async (e) => {
                  const input = e.currentTarget as HTMLInputElement;
                  const file = input.files && input.files[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    const rows: { name?: string; studentId?: string; classLevel?: string; sex?: string }[] = [];
                    for (let i = 0; i < lines.length; i++) {
                      const parts = lines[i].split(",").map((p) => p.trim());
                      if (parts.length < 4) continue;
                      // skip header if it looks like header
                      if (i === 0 && /name/i.test(parts[0]) && /student/i.test(parts[1]) && /class/i.test(parts[2]) && /sex/i.test(parts[3])) continue;
                      rows.push({ name: parts[0], studentId: parts[1], classLevel: parts[2], sex: parts[3] });
                    }
                    if (rows.length === 0) {
                      alert("No valid rows found in CSV");
                      return;
                    }
                    await uploadStudents(rows as any);
                    toast({
                      title: "Bulk Upload Successful",
                      description: `Successfully uploaded ${rows.length} students.`,
                    });
                    input.value = "";
                    fetchStudents();
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(err);
                    alert("Failed to upload CSV");
                  }
                }}
              />

              <Button
                variant="outline"
                onClick={() => {
                  const el = document.getElementById("students-csv") as HTMLInputElement | null;
                  el?.click();
                }}
              >
                Upload CSV
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Download CSV template
                  const csvContent = 'name,studentId,classLevel,sex\nJohn Doe,student-001,JSS1,M\nJane Smith,student-002,SS2,F';
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'students-template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download CSV Template
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Export all students as CSV
                  const header = 'name,studentId,classLevel,sex';
                  const rows = studentsList.map(s => `${s.name},${s.studentId},${s.classLevel || ""},${s.sex || ""}`).join('\n');
                  const csvContent = `${header}\n${rows}`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'students-export.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Students
              </Button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">CSV format: one student per line, columns "name,studentId". Header row is optional.</p>
            </div>

            {/* Search bar */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md"
              />
            </div>

            {/* Students table */}
            <div className="mt-4">
              <div className="overflow-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-2">Name</th>
                      <th className="p-2">Student ID</th>
                      <th className="p-2">Class Level</th>
                      <th className="p-2">Sex</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.name}</td>
                        <td className="p-2">{s.studentId}</td>
                        <td className="p-2">{s.classLevel || "-"}</td>
                        <td className="p-2">{s.sex || "-"}</td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingStudent(s);
                              setIsEditOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-2"
                            onClick={() => setDeleteConfirm({ open: true, id: s.id, name: s.name })}
                          >
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="ml-2"
                            onClick={() => {
                              toast({
                                title: "Student Details",
                                description: (
                                  <div className="mt-2 text-sm">
                                    <p><strong>Name:</strong> {s.name}</p>
                                    <p><strong>ID:</strong> {s.studentId}</p>
                                    <p><strong>Class:</strong> {s.classLevel || "-"}</p>
                                    <p><strong>Sex:</strong> {s.sex || "-"}</p>
                                  </div>
                                ),
                              });
                            }}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onClick={async () => {
                              if (!confirm(`Reset password for ${s.name}?`)) return;
                              // Placeholder: Implement actual reset logic as needed
                              toast({
                                title: "Password Reset",
                                description: `Password reset link sent to ${s.name}`,
                              });
                            }}
                          >
                            Reset Password
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Make changes to the student profile here.</DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-studentId">Student ID</Label>
                <Input
                  id="edit-studentId"
                  value={editingStudent.studentId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-classLevel">Class Level</Label>
                <select
                  id="edit-classLevel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingStudent.classLevel || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, classLevel: e.target.value })}
                >
                  <option value="">Select</option>
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
              <div>
                <Label htmlFor="edit-sex">Sex</Label>
                <select
                  id="edit-sex"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingStudent.sex || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, sex: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student
              <span className="font-bold"> {deleteConfirm.name}</span> and remove their data from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
