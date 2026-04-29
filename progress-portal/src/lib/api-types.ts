// Domain types shared between API client and UI.
export type Role = "admin" | "teacher" | "student";
export type Branch = "CSE" | "BBA" | "Agriculture" | "Mechanicals";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  studentNumber: string;
  program: string; // kept for UI (stores branch)
  branch: Branch;
  year: number;
  enrolledAt: string; // ISO date
  avatarUrl?: string;
  gpa: number; // 0–10
  attendance: number; // 0–100
}

export interface BranchCourses {
  branch: Branch;
  courses: string[];
}

export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "pending" | "submitted" | "graded" | "late";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  dueDate: string; // ISO
  maxScore: number;
  status: AssignmentStatus;
  createdAt: string;
  teacherId?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submittedAt?: string;
  content?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  course: string;
  assessment: string;
  score: number;
  maxScore: number;
  recordedAt: string;
}

export interface ProgressPoint {
  label: string; // e.g. week / month
  average: number;
}

export interface CourseAssignment {
  id: string;
  course: string;
  teacherId: string;
  teacherName?: string;
  teacherEmail?: string;
}
