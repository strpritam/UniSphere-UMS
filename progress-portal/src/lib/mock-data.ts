// Realistic mock data for development before the backend is ready.
import type {
  Assignment,
  Grade,
  ProgressPoint,
  Student,
  Submission,
  User,
} from "./api-types";

export const mockUsers: (User & { password: string })[] = [
  {
    id: "u-admin-1",
    email: "admin@gmail.com",
    fullName: "System Admin",
    role: "admin",
    password: "password",
  },
  {
    id: "u-teacher-1",
    email: "prof.adams@gmail.com",
    fullName: "Dr. Eleanor Adams",
    role: "teacher",
    password: "password",
  },
  {
    id: "u-student-1",
    email: "student@university.edu",
    fullName: "Maya Patel",
    role: "student",
    password: "password",
  },
];

export const mockStudents: Student[] = [
  { id: "s-1", fullName: "Maya Patel", email: "student@university.edu", studentNumber: "U2401001", program: "Computer Science", year: 2, enrolledAt: "2023-09-01", gpa: 3.7, attendance: 94 },
  { id: "s-2", fullName: "Liam Chen", email: "liam.chen@university.edu", studentNumber: "U2401002", program: "Computer Science", year: 2, enrolledAt: "2023-09-01", gpa: 3.4, attendance: 88 },
  { id: "s-3", fullName: "Sofia Rossi", email: "sofia.rossi@university.edu", studentNumber: "U2401003", program: "Mathematics", year: 3, enrolledAt: "2022-09-01", gpa: 3.9, attendance: 97 },
  { id: "s-4", fullName: "Noah Williams", email: "noah.w@university.edu", studentNumber: "U2401004", program: "Physics", year: 1, enrolledAt: "2024-09-01", gpa: 3.1, attendance: 78 },
  { id: "s-5", fullName: "Aisha Khan", email: "aisha.k@university.edu", studentNumber: "U2401005", program: "Computer Science", year: 3, enrolledAt: "2022-09-01", gpa: 3.8, attendance: 92 },
  { id: "s-6", fullName: "Ethan Brown", email: "ethan.b@university.edu", studentNumber: "U2401006", program: "Engineering", year: 2, enrolledAt: "2023-09-01", gpa: 2.9, attendance: 71 },
  { id: "s-7", fullName: "Hana Tanaka", email: "hana.t@university.edu", studentNumber: "U2401007", program: "Mathematics", year: 1, enrolledAt: "2024-09-01", gpa: 3.6, attendance: 90 },
  { id: "s-8", fullName: "Diego Martinez", email: "diego.m@university.edu", studentNumber: "U2401008", program: "Computer Science", year: 4, enrolledAt: "2021-09-01", gpa: 3.5, attendance: 85 },
];

export const mockAssignments: Assignment[] = [
  { id: "a-1", title: "Algorithms — Sorting Lab", description: "Implement and benchmark merge sort vs quick sort.", course: "CS 201", dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), maxScore: 100, status: "published", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "a-2", title: "Linear Algebra Problem Set 4", description: "Eigenvalues, eigenvectors, and diagonalization.", course: "MATH 210", dueDate: new Date(Date.now() + 2 * 86400000).toISOString(), maxScore: 50, status: "published", createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: "a-3", title: "Operating Systems — Scheduler", description: "Build a round-robin scheduler simulator.", course: "CS 305", dueDate: new Date(Date.now() + 12 * 86400000).toISOString(), maxScore: 100, status: "published", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "a-4", title: "Physics Lab — Pendulum", description: "Measure g using a simple pendulum experiment.", course: "PHYS 110", dueDate: new Date(Date.now() - 3 * 86400000).toISOString(), maxScore: 80, status: "published", createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: "a-5", title: "Midterm essay", description: "1500 words on the philosophy of computation.", course: "CS 201", dueDate: new Date(Date.now() + 20 * 86400000).toISOString(), maxScore: 100, status: "draft", createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
];

export const mockSubmissions: Submission[] = [
  { id: "sub-1", assignmentId: "a-1", studentId: "s-1", status: "submitted", submittedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "sub-2", assignmentId: "a-2", studentId: "s-1", status: "graded", score: 46, feedback: "Strong work on Q3. Review eigenbasis derivation.", submittedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "sub-3", assignmentId: "a-4", studentId: "s-1", status: "graded", score: 72, feedback: "Good methodology. Improve uncertainty analysis.", submittedAt: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: "sub-4", assignmentId: "a-3", studentId: "s-1", status: "pending" },
  { id: "sub-5", assignmentId: "a-1", studentId: "s-2", status: "submitted", submittedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "sub-6", assignmentId: "a-2", studentId: "s-3", status: "graded", score: 49, feedback: "Excellent.", submittedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
];

export const mockGrades: Grade[] = [
  { id: "g-1", studentId: "s-1", course: "CS 201", assessment: "Quiz 1", score: 88, maxScore: 100, recordedAt: "2024-09-15" },
  { id: "g-2", studentId: "s-1", course: "CS 201", assessment: "Quiz 2", score: 91, maxScore: 100, recordedAt: "2024-10-02" },
  { id: "g-3", studentId: "s-1", course: "MATH 210", assessment: "PSet 1", score: 44, maxScore: 50, recordedAt: "2024-09-20" },
  { id: "g-4", studentId: "s-1", course: "MATH 210", assessment: "PSet 2", score: 47, maxScore: 50, recordedAt: "2024-10-05" },
  { id: "g-5", studentId: "s-1", course: "MATH 210", assessment: "PSet 3", score: 45, maxScore: 50, recordedAt: "2024-10-22" },
  { id: "g-6", studentId: "s-1", course: "PHYS 110", assessment: "Lab 1", score: 75, maxScore: 80, recordedAt: "2024-09-25" },
];

export const mockProgress: ProgressPoint[] = [
  { label: "Week 1", average: 78 },
  { label: "Week 3", average: 82 },
  { label: "Week 5", average: 85 },
  { label: "Week 7", average: 84 },
  { label: "Week 9", average: 88 },
  { label: "Week 11", average: 91 },
];
