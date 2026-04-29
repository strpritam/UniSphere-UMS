export type Role = "admin" | "teacher" | "student";
export type Branch = "CSE" | "BBA" | "Agriculture" | "Mechanicals";
export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "pending" | "submitted" | "graded" | "late";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
}

export interface UserRecord extends User {
  password: string;
  passwordResetOtp?: string;
  passwordResetExpiresAt?: string;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  studentNumber: string;
  program: string; // kept for UI compatibility (stores branch name)
  branch: Branch;
  year: number;
  enrolledAt: string;
  avatarUrl?: string;
  gpa: number;
  attendance: number;
}

export interface TeacherProfile {
  id: string; // teacher user id
  branch: Branch;
  courses: string[]; // max 3 selected at registration
}

export interface BranchCourses {
  branch: Branch;
  courses: string[]; // 6 courses managed by admin
}

export interface PendingRegistration {
  id: string;
  role: Exclude<Role, "admin">;
  fullName: string;
  email: string;
  passwordHash: string;
  branch: Branch;
  year?: number; // student
  courses?: string[]; // teacher
  otp: string;
  expiresAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  dueDate: string;
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
  label: string;
  average: number;
}

export interface CourseAssignment {
  id: string;
  course: string;
  teacherId: string;
}

export interface DbShape {
  users: UserRecord[];
  students: Student[];
  teachers: TeacherProfile[];
  branches: BranchCourses[];
  pendingRegistrations: PendingRegistration[];
  assignments: Assignment[];
  submissions: Submission[];
  grades: Grade[];
  progress: ProgressPoint[];
  courseAssignments: CourseAssignment[];
}
