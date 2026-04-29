import type { BranchCourses, DbShape } from "../types.js";

const defaultBranches: BranchCourses[] = [
  {
    branch: "CSE",
    courses: [
      "CSE201 - Data Structures and Algorithms",
      "CSE202 - Database Management Systems",
      "CSE203 - Operating Systems",
      "CSE204 - Computer Networks",
      "CSE205 - Software Engineering",
      "CSE206 - Web Technologies",
    ],
  },
  {
    branch: "BBA",
    courses: [
      "BBA101 - Principles of Management",
      "BBA102 - Financial Accounting",
      "BBA103 - Business Economics",
      "BBA104 - Marketing Management",
      "BBA105 - Human Resource Management",
      "BBA106 - Business Communication",
    ],
  },
  {
    branch: "Agriculture",
    courses: [
      "AGR101 - Fundamentals of Agronomy",
      "AGR102 - Soil Science",
      "AGR103 - Agricultural Economics",
      "AGR104 - Plant Breeding and Genetics",
      "AGR105 - Crop Protection",
      "AGR106 - Agricultural Extension Education",
    ],
  },
  { branch: "Mechanicals", courses: ["ME 101", "ME 102", "ME 201", "ME 202", "ME 301", "ME 302"] },
];

export const seedDb = (): DbShape => ({
  users: [
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
  ],
  teachers: [
    { id: "u-teacher-1", branch: "CSE", courses: ["CSE 201", "CSE 202"] },
  ],
  students: [
    { id: "s-1", fullName: "Maya Patel", email: "student@university.edu", studentNumber: "U2401001", program: "CSE", branch: "CSE", year: 2, enrolledAt: "2023-09-01", gpa: 3.7, attendance: 94 },
    { id: "s-2", fullName: "Liam Chen", email: "liam.chen@university.edu", studentNumber: "U2401002", program: "CSE", branch: "CSE", year: 2, enrolledAt: "2023-09-01", gpa: 3.4, attendance: 88 },
    { id: "s-3", fullName: "Sofia Rossi", email: "sofia.rossi@university.edu", studentNumber: "U2401003", program: "BBA", branch: "BBA", year: 3, enrolledAt: "2022-09-01", gpa: 3.9, attendance: 97 }
  ],
  branches: defaultBranches,
  pendingRegistrations: [],
  assignments: [
    { id: "a-1", title: "Algorithms - Sorting Lab", description: "Implement and benchmark merge sort vs quick sort.", course: "CSE 201", dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), maxScore: 100, status: "published", createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), teacherId: "u-teacher-1" },
    { id: "a-2", title: "Business Foundations PSet", description: "Marketing basics and accounting terms.", course: "BBA 201", dueDate: new Date(Date.now() + 2 * 86400000).toISOString(), maxScore: 50, status: "published", createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), teacherId: "u-teacher-1" }
  ],
  submissions: [
    { id: "sub-1", assignmentId: "a-1", studentId: "s-1", status: "submitted", submittedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
    { id: "sub-2", assignmentId: "a-2", studentId: "s-1", status: "graded", score: 46, feedback: "Strong work on Q3. Review eigenbasis derivation.", submittedAt: new Date(Date.now() - 4 * 86400000).toISOString() }
  ],
  grades: [
    { id: "g-1", studentId: "s-1", course: "CS 201", assessment: "Quiz 1", score: 88, maxScore: 100, recordedAt: "2024-09-15" },
    { id: "g-2", studentId: "s-1", course: "MATH 210", assessment: "PSet 1", score: 44, maxScore: 50, recordedAt: "2024-09-20" }
  ],
  progress: [
    { label: "Week 1", average: 78 },
    { label: "Week 3", average: 82 },
    { label: "Week 5", average: 85 },
    { label: "Week 7", average: 84 },
    { label: "Week 9", average: 88 }
  ],
  courseAssignments: [
    { id: "ca-1", course: "CS 201", teacherId: "u-teacher-1" },
    { id: "ca-2", course: "MATH 210", teacherId: "u-teacher-1" }
  ]
});
