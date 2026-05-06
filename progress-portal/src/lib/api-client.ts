// Typed API client. Reads VITE_API_BASE_URL. When unset (or VITE_USE_MOCK="true"),
// falls back to in-memory mock data so the UI works before the backend exists.
//
// All real endpoints expect:
//   Authorization: Bearer <token>
//   Content-Type: application/json
//
// Backend contract (REST):
//   POST   /auth/login                 { email, password }                -> { token, user }
//   POST   /auth/signup                { email, password, fullName, role }-> { token, user }
//   GET    /auth/me                                                       -> User
//   GET    /students                                                      -> Student[]
//   GET    /students/:id                                                  -> Student
//   GET    /assignments                                                   -> Assignment[]
//   POST   /assignments                { ...AssignmentInput }             -> Assignment
//   PATCH  /assignments/:id            { ...partial }                     -> Assignment
//   DELETE /assignments/:id                                               -> { ok: true }
//   GET    /submissions?studentId=&assignmentId=                          -> Submission[]
//   PATCH  /submissions/:id            { score, feedback, status }        -> Submission
//   GET    /students/:id/grades                                           -> Grade[]
//   POST   /grades                     { studentId, course, assessment, score, maxScore } -> Grade
//   GET    /students/:id/progress                                         -> ProgressPoint[]

import type {
  Assignment,
  AuthResponse,
  Branch,
  BranchCourses,
  CourseAssignment,
  Grade,
  ProgressPoint,
  Role,
  Student,
  Submission,
  User,
} from "./api-types";
import {
  mockAssignments,
  mockGrades,
  mockProgress,
  mockStudents,
  mockSubmissions,
  mockUsers,
} from "./mock-data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const USE_MOCK =
  !API_BASE_URL || import.meta.env.VITE_USE_MOCK === "true";

const TOKEN_KEY = "unisphere.token";

export const tokenStore = {
  get: () =>
    typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("API base URL not configured. Check VITE_API_BASE_URL environment variable.", 500);
  }
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(text || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// In-memory mock state (mutable).
const mockState = {
  assignments: [...mockAssignments],
  submissions: [...mockSubmissions],
  grades: [...mockGrades],
  students: [...mockStudents],
  courseAssignments: [] as CourseAssignment[],
};

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeMockToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return payload.user as User;
  } catch {
    return null;
  }
}

function encodeMockToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: "mock", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ user, iat: Date.now() }));
  return `${header}.${payload}.mock-signature`;
}

export const api = {
  isMock: USE_MOCK,

  // ---- Auth ----
  async login(email: string, password: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      await wait();
      const u = mockUsers.find(
        (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password,
      );
      if (!u) throw new ApiError("Invalid email or password", 401);
      const { password: _pw, ...user } = u;
      return { token: encodeMockToken(user), user };
    }
    return http<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(input: {
    email: string;
    password: string;
    fullName: string;
    role: Exclude<Role, "admin">;
  }): Promise<AuthResponse> {
    if (USE_MOCK) {
      await wait();
      if (mockUsers.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        throw new ApiError("An account with that email already exists", 409);
      }
      const user: User = {
        id: genId("u"),
        email: input.email,
        fullName: input.fullName,
        role: input.role,
      };
      mockUsers.push({ ...user, password: input.password });
      if (input.role === "student") {
        mockState.students.push({
          id: genId("s"),
          fullName: input.fullName,
          email: input.email,
          studentNumber: `U${Math.floor(100000 + Math.random() * 900000)}`,
          program: "Undeclared",
          year: 1,
          enrolledAt: new Date().toISOString(),
          gpa: 0,
          attendance: 100,
        });
      }
      return { token: encodeMockToken(user), user };
    }
    return http<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async registerRequestOtp(
    input:
      | { role: "student"; fullName: string; email: string; password: string; branch: Branch; year: number }
      | { role: "teacher"; fullName: string; email: string; password: string; branch: Branch; courses: string[] },
  ): Promise<{ ok: true; message: string }> {
    if (USE_MOCK) {
      await wait();
      return { ok: true, message: "OTP sent to your email" };
    }
    return http<{ ok: true; message: string }>("/auth/register/request-otp", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async registerVerifyOtp(email: string, otp: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      await wait();
      if (otp !== "123456") throw new ApiError("Invalid OTP", 400);
      throw new ApiError("Mock registration not implemented", 400);
    }
    return http<AuthResponse>("/auth/register/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async listBranches(): Promise<BranchCourses[]> {
    if (USE_MOCK) {
      await wait(120);
      return [
        { branch: "CSE", courses: [] },
        { branch: "BBA", courses: [] },
        { branch: "Agriculture", courses: [] },
        { branch: "Mechanicals", courses: [] },
      ];
    }
    return http<BranchCourses[]>("/branches");
  },

  async updateBranchCourses(branch: Branch, courses: string[]): Promise<BranchCourses> {
    if (USE_MOCK) {
      await wait(120);
      return { branch, courses };
    }
    return http<BranchCourses>(`/branches/${branch}/courses`, {
      method: "PUT",
      body: JSON.stringify({ courses }),
    });
  },

  async getBranchCourses(branch: Branch): Promise<string[]> {
    if (USE_MOCK) {
      await wait(120);
      return [];
    }
    const data = await http<{ branch: Branch; courses: string[] }>(`/branches/${branch}/courses`);
    return data.courses;
  },

  async me(): Promise<User | null> {
    if (USE_MOCK) {
      const t = tokenStore.get();
      if (!t) return null;
      return decodeMockToken(t);
    }
    try {
      return await http<User>("/auth/me");
    } catch {
      return null;
    }
  },

  async requestPasswordResetOtp(email: string): Promise<{ ok: true; message: string }> {
    if (USE_MOCK) {
      await wait();
      return { ok: true, message: "If email exists, OTP has been sent." };
    }
    return http<{ ok: true; message: string }>("/auth/forgot-password/request-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ ok: true }> {
    if (USE_MOCK) {
      await wait();
      if (otp !== "123456") throw new ApiError("Invalid OTP", 400);
      return { ok: true };
    }
    return http<{ ok: true }>("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ ok: true }> {
    if (USE_MOCK) {
      await wait();
      const idx = mockUsers.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
      if (idx === -1) throw new ApiError("Invalid OTP", 400);
      if (otp !== "123456") throw new ApiError("Invalid OTP", 400);
      mockUsers[idx].password = newPassword;
      return { ok: true };
    }
    return http<{ ok: true }>("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },

  // ---- Students ----
  async listStudents(): Promise<Student[]> {
    if (USE_MOCK) {
      await wait(150);
      return [...mockState.students];
    }
    return http<Student[]>("/students");
  },

  async updateStudent(
    id: string,
    patch: Partial<Pick<Student, "fullName" | "email" | "studentNumber" | "program" | "year" | "gpa" | "attendance">>,
  ): Promise<Student> {
    if (USE_MOCK) {
      await wait(150);
      const idx = mockState.students.findIndex((s) => s.id === id);
      if (idx === -1) throw new ApiError("Student not found", 404);
      mockState.students[idx] = { ...mockState.students[idx], ...patch };
      return mockState.students[idx];
    }
    return http<Student>(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async getStudent(id: string): Promise<Student> {
    if (USE_MOCK) {
      await wait(120);
      const s = mockState.students.find((x) => x.id === id);
      if (!s) throw new ApiError("Student not found", 404);
      return s;
    }
    return http<Student>(`/students/${id}`);
  },

  async getStudentByEmail(email: string): Promise<Student | null> {
    if (USE_MOCK) {
      await wait(120);
      return mockState.students.find((s) => s.email === email) ?? null;
    }
    return http<Student | null>(
      `/students?email=${encodeURIComponent(email)}`,
    );
  },

  // ---- Assignments ----
  async listAssignments(): Promise<Assignment[]> {
    if (USE_MOCK) {
      await wait(150);
      return [...mockState.assignments];
    }
    return http<Assignment[]>("/assignments");
  },

  async createAssignment(
    input: Omit<Assignment, "id" | "createdAt">,
  ): Promise<Assignment> {
    if (USE_MOCK) {
      await wait(200);
      const a: Assignment = {
        ...input,
        id: genId("a"),
        createdAt: new Date().toISOString(),
      };
      mockState.assignments.unshift(a);
      return a;
    }
    return http<Assignment>("/assignments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateAssignment(id: string, patch: Partial<Assignment>): Promise<Assignment> {
    if (USE_MOCK) {
      await wait(150);
      const idx = mockState.assignments.findIndex((a) => a.id === id);
      if (idx === -1) throw new ApiError("Not found", 404);
      mockState.assignments[idx] = { ...mockState.assignments[idx], ...patch };
      return mockState.assignments[idx];
    }
    return http<Assignment>(`/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteAssignment(id: string): Promise<void> {
    if (USE_MOCK) {
      await wait(150);
      mockState.assignments = mockState.assignments.filter((a) => a.id !== id);
      mockState.submissions = mockState.submissions.filter((s) => s.assignmentId !== id);
      return;
    }
    await http<void>(`/assignments/${id}`, { method: "DELETE" });
  },

  // ---- Submissions ----
  async listSubmissions(filter: { studentId?: string; assignmentId?: string } = {}): Promise<Submission[]> {
    if (USE_MOCK) {
      await wait(120);
      return mockState.submissions.filter(
        (s) =>
          (!filter.studentId || s.studentId === filter.studentId) &&
          (!filter.assignmentId || s.assignmentId === filter.assignmentId),
      );
    }
    const q = new URLSearchParams();
    if (filter.studentId) q.set("studentId", filter.studentId);
    if (filter.assignmentId) q.set("assignmentId", filter.assignmentId);
    return http<Submission[]>(`/submissions?${q.toString()}`);
  },

  async gradeSubmission(
    id: string,
    patch: { score: number; feedback?: string },
  ): Promise<Submission> {
    if (USE_MOCK) {
      await wait(150);
      const idx = mockState.submissions.findIndex((s) => s.id === id);
      if (idx === -1) throw new ApiError("Not found", 404);
      mockState.submissions[idx] = {
        ...mockState.submissions[idx],
        ...patch,
        status: "graded",
      };
      return mockState.submissions[idx];
    }
    return http<Submission>(`/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...patch, status: "graded" }),
    });
  },

  async submitAssignment(
    assignmentId: string,
    studentId: string,
    content?: string,
  ): Promise<Submission> {
    if (USE_MOCK) {
      await wait(200);
      const existing = mockState.submissions.find(
        (s) => s.assignmentId === assignmentId && s.studentId === studentId,
      );
      if (existing) {
        existing.status = "submitted";
        existing.submittedAt = new Date().toISOString();
        existing.content = content;
        return existing;
      }
      const sub: Submission = {
        id: genId("sub"),
        assignmentId,
        studentId,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        content,
      };
      mockState.submissions.push(sub);
      return sub;
    }
    return http<Submission>(`/submissions`, {
      method: "POST",
      body: JSON.stringify({ assignmentId, studentId, content }),
    });
  },

  // ---- Grades & progress ----
  async listGrades(studentId: string): Promise<Grade[]> {
    if (USE_MOCK) {
      await wait(120);
      return mockState.grades.filter((g) => g.studentId === studentId);
    }
    return http<Grade[]>(`/students/${studentId}/grades`);
  },

  async addGrade(input: Omit<Grade, "id" | "recordedAt">): Promise<Grade> {
    if (USE_MOCK) {
      await wait(150);
      const g: Grade = {
        ...input,
        id: genId("g"),
        recordedAt: new Date().toISOString(),
      };
      mockState.grades.push(g);
      return g;
    }
    return http<Grade>(`/grades`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateGrade(id: string, patch: Partial<Pick<Grade, "course" | "assessment" | "score" | "maxScore">>): Promise<Grade> {
    if (USE_MOCK) {
      await wait(150);
      const idx = mockState.grades.findIndex((g) => g.id === id);
      if (idx === -1) throw new ApiError("Not found", 404);
      mockState.grades[idx] = { ...mockState.grades[idx], ...patch };
      return mockState.grades[idx];
    }
    return http<Grade>(`/grades/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async listTeachers(): Promise<User[]> {
    if (USE_MOCK) {
      await wait(120);
      return mockUsers
        .filter((u) => u.role === "teacher")
        .map(({ password: _pw, ...user }) => user);
    }
    return http<User[]>(`/teachers`);
  },

  async createTeacher(input: { fullName: string; email: string; password: string }): Promise<User> {
    if (USE_MOCK) {
      await wait(150);
      const user: User = {
        id: genId("u"),
        fullName: input.fullName,
        email: input.email,
        role: "teacher",
      };
      mockUsers.push({ ...user, password: input.password });
      return user;
    }
    return http<User>(`/admin/teachers`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async listCourseAssignments(): Promise<CourseAssignment[]> {
    if (USE_MOCK) {
      await wait(120);
      return [...mockState.courseAssignments];
    }
    return http<CourseAssignment[]>(`/admin/course-assignments`);
  },

  async listMyCourses(): Promise<string[]> {
    if (USE_MOCK) {
      await wait(120);
      return Array.from(new Set(mockState.courseAssignments.map((c) => c.course))).sort();
    }
    const res = await http<{ courses: string[] }>(`/course-assignments/me`);
    return res.courses;
  },

  async createCourseAssignment(input: { course: string; teacherId: string }): Promise<CourseAssignment> {
    if (USE_MOCK) {
      await wait(150);
      const created: CourseAssignment = { id: genId("ca"), ...input };
      mockState.courseAssignments.push(created);
      return created;
    }
    return http<CourseAssignment>(`/admin/course-assignments`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateCourseAssignment(
    id: string,
    input: { course: string; teacherId: string },
  ): Promise<CourseAssignment> {
    if (USE_MOCK) {
      await wait(150);
      const idx = mockState.courseAssignments.findIndex((c) => c.id === id);
      if (idx === -1) throw new ApiError("Not found", 404);
      mockState.courseAssignments[idx] = { ...mockState.courseAssignments[idx], ...input };
      return mockState.courseAssignments[idx];
    }
    return http<CourseAssignment>(`/admin/course-assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async deleteCourseAssignment(id: string): Promise<void> {
    if (USE_MOCK) {
      await wait(120);
      mockState.courseAssignments = mockState.courseAssignments.filter((c) => c.id !== id);
      return;
    }
    await http<void>(`/admin/course-assignments/${id}`, { method: "DELETE" });
  },

  async listProgress(_studentId: string): Promise<ProgressPoint[]> {
    if (USE_MOCK) {
      await wait(120);
      return mockProgress;
    }
    return http<ProgressPoint[]>(`/students/${_studentId}/progress`);
  },
};

export { ApiError };
