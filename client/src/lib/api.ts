import {
  getStudents as fbGetStudents,
  createStudent as fbCreateStudent,
  createStudentsBulk as fbCreateStudentsBulk,
  updateStudent as fbUpdateStudent,
  deleteStudent as fbDeleteStudent,
  getResults as fbGetResults,
  getExams as fbGetExams,
} from "./firebase-api";
import type { Student, Result, Exam } from "@shared/schema";

export type { Student, Result, Exam };

export const getStudents = async (): Promise<Student[]> => {
  return fbGetStudents();
};

export const addStudent = async (student: { name: string; studentId: string; classLevel: any; sex?: any; department?: any }): Promise<Student> => {
  // @ts-ignore - classLevel type mismatch in schema vs usage, casting for now
  return fbCreateStudent(student);
};

export const uploadStudents = async (students: { name: string; studentId: string; classLevel: any; sex?: any; department?: any }[]): Promise<Student[]> => {
  // @ts-ignore
  return fbCreateStudentsBulk(students);
};

export const updateStudent = async (id: string, student: { name: string; studentId: string; classLevel?: string; sex?: string | null; department?: string | null; restrictedExamIds?: string[] }): Promise<void> => {
  return fbUpdateStudent(id, student);
};

export const deleteStudent = async (id: string): Promise<void> => {
  return fbDeleteStudent(id);
};

export const getResults = async (): Promise<Result[]> => {
  return fbGetResults();
};

export const getExams = async (): Promise<Exam[]> => {
  return fbGetExams();
};
