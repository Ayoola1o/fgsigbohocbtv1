import {
  getStudents as fbGetStudents,
  createStudent as fbCreateStudent,
  createStudentsBulk as fbCreateStudentsBulk,
  updateStudent as fbUpdateStudent,
  deleteStudent as fbDeleteStudent
} from "./firebase-api";
import type { Student } from "@shared/schema";

export type { Student };

export const getStudents = async (): Promise<Student[]> => {
  return fbGetStudents();
};

export const addStudent = async (student: { name: string; studentId: string; classLevel: any; sex?: any }): Promise<Student> => {
  // @ts-ignore - classLevel type mismatch in schema vs usage, casting for now
  return fbCreateStudent(student);
};

export const uploadStudents = async (students: { name: string; studentId: string; classLevel: any; sex?: any }[]): Promise<Student[]> => {
  // @ts-ignore
  return fbCreateStudentsBulk(students);
};

export const updateStudent = async (id: string, student: { name: string; studentId: string }): Promise<void> => {
  return fbUpdateStudent(id, student);
};

export const deleteStudent = async (id: string): Promise<void> => {
  return fbDeleteStudent(id);
};
