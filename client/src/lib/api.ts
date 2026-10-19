import { apiRequest } from "./queryClient";
import type { Student } from "@shared/schema";

export type { Student };

export const getStudents = async (): Promise<Student[]> => {
  return apiRequest<Student[]>("GET", "/api/students");
};

export const addStudent = async (student: { name: string; studentId: string; classLevel: any; sex?: any }): Promise<Student> => {
  return apiRequest<Student>("POST", "/api/students", student);
};

export const uploadStudents = async (students: { name: string; studentId: string; classLevel: any; sex?: any }[]): Promise<Student[]> => {
  return apiRequest<Student[]>("POST", "/api/students", students);
};

export const updateStudent = async (id: string, student: { name: string; studentId: string }): Promise<void> => {
  await apiRequest("PATCH", `/api/students/${id}`, student);
};

export const deleteStudent = async (id: string): Promise<void> => {
  await apiRequest("DELETE", `/api/students/${id}`);
};
