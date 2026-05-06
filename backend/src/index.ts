import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { compare, hash } from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { loadDb, mutateDb } from "./data/store.js";
import { signToken, verifyToken } from "./lib/auth.js";
import type { Assignment, Branch, CourseAssignment, Grade, Role, Submission, User } from "./types.js";

const app = express();
app.use(express.json());
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173,http://localhost:8080")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const vercelPattern = /^https:\/\/.*\.vercel\.app$/i;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || localOriginPattern.test(origin) || vercelPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS blocked for origin"));
    },
  }),
);

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

type AuthedRequest = Request & { user?: User };

function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send("Missing bearer token");
  const user = verifyToken(token);
  if (!user) return res.status(401).send("Invalid token");
  req.user = user;
  next();
}

function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).send("Unauthenticated");
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).send("Forbidden");
      return;
    }
    next();
  };
}

function teacherCourseSet(courseAssignments: CourseAssignment[], teacherId: string): Set<string> {
  return new Set(courseAssignments.filter((c) => c.teacherId === teacherId).map((c) => c.course));
}

function teacherSelectedCourseSet(db: Awaited<ReturnType<typeof loadDb>>, teacherId: string): Set<string> {
  const profile = db.teachers.find((t) => t.id === teacherId);
  return new Set(profile?.courses ?? []);
}

const branchSchema = z.enum(["CSE", "BBA", "Agriculture", "Mechanicals"]);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  fullName: z.string().min(2),
  role: z.enum(["teacher", "student"]),
});
const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
const forgotPasswordVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});
const forgotPasswordResetSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(6).max(128),
});

const registerRequestSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("student"),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(128),
    branch: branchSchema,
    year: z.number().int().min(1).max(10),
  }),
  z.object({
    role: z.literal("teacher"),
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(128),
    branch: branchSchema,
    courses: z.array(z.string().min(1)).max(3),
  }),
]);

const registerVerifySchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/),
});

const branchCoursesUpdateSchema = z.object({
  courses: z.array(z.string().trim().min(2).max(60)).length(6),
});

const updateStudentSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    studentNumber: z.string().min(2).max(30).optional(),
    program: z.string().min(1).max(120).optional(),
    year: z.number().int().min(1).max(10).optional(),
    gpa: z.number().min(0).max(10).optional(),
    attendance: z.number().min(0).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? SMTP_USER ?? "no-reply@unisphere.local";

const mailer =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

function createOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function sendOtpEmail(to: string, otp: string) {
  if (!mailer) {
    console.log(`[OTP] SMTP not configured. OTP for ${to}: ${otp}`);
    return;
  }
  await mailer.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "UniSphere password reset OTP",
    text: `Your UniSphere OTP is ${otp}. It expires in 60 seconds.`,
    html: `<p>Your UniSphere OTP is <strong>${otp}</strong>.</p><p>This OTP expires in 60 seconds.</p>`,
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/db", async (_req, res) => {
  try {
    await loadDb(); // forces initial Mongo connection
    res.json({ ok: true, connected: true });
  } catch (err) {
    res.status(500).json({
      ok: false,
      connected: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.get("/branches", auth, requireRole("admin"), async (_req, res) => {
  const db = await loadDb();
  res.json(db.branches);
});

app.put("/branches/:branch/courses", auth, requireRole("admin"), async (req, res) => {
  const parsed = branchCoursesUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const branch = req.params.branch as Branch;
  if (!["CSE", "BBA", "Agriculture", "Mechanicals"].includes(branch)) {
    return res.status(400).send("Invalid branch");
  }
  const nextCourses = parsed.data.courses;
  await mutateDb((current) => {
    const idx = current.branches.findIndex((b) => b.branch === branch);
    if (idx === -1) {
      current.branches.push({ branch, courses: nextCourses });
    } else {
      current.branches[idx] = { ...current.branches[idx], courses: nextCourses };
    }
  });
  const db = await loadDb();
  res.json(db.branches.find((b) => b.branch === branch));
});

app.get("/branches/:branch/courses", async (req, res) => {
  const branch = req.params.branch as Branch;
  if (!["CSE", "BBA", "Agriculture", "Mechanicals"].includes(branch)) {
    return res.status(400).send("Invalid branch");
  }
  const db = await loadDb();
  const bc = db.branches.find((b) => b.branch === branch);
  res.json({ branch, courses: bc?.courses ?? [] });
});

app.post("/auth/register/request-otp", async (req, res) => {
  const parsed = registerRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const input = parsed.data;

  const db = await loadDb();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return res.status(409).send("An account with that email already exists");
  }
  const branchCourses = db.branches.find((b) => b.branch === input.branch)?.courses ?? [];
  if (input.role === "teacher") {
    const invalid = input.courses.filter((c) => !branchCourses.includes(c));
    if (invalid.length > 0) return res.status(400).send("Invalid course selection");
  }

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
  const passwordHash = await hash(input.password, 10);

  await mutateDb((current) => {
    // replace any existing pending record for same email
    current.pendingRegistrations = current.pendingRegistrations.filter(
      (p) => p.email.toLowerCase() !== input.email.toLowerCase(),
    );
    current.pendingRegistrations.push({
      id: makeId("pr"),
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      branch: input.branch,
      year: input.role === "student" ? input.year : undefined,
      courses: input.role === "teacher" ? input.courses : undefined,
      otp,
      expiresAt,
    });
  });

  await sendOtpEmail(input.email, otp);
  res.json({ ok: true, message: "OTP sent to your email" });
});

app.post("/auth/register/verify-otp", async (req, res) => {
  const parsed = registerVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const { email, otp } = parsed.data;
  const db = await loadDb();
  const pending = db.pendingRegistrations.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (!pending) return res.status(400).send("OTP invalid or expired");
  if (new Date(pending.expiresAt).getTime() < Date.now()) return res.status(400).send("OTP expired");
  if (pending.otp !== otp) return res.status(400).send("Invalid OTP");

  const user: User = {
    id: makeId("u"),
    email: pending.email,
    fullName: pending.fullName,
    role: pending.role,
  };

  await mutateDb((current) => {
    current.pendingRegistrations = current.pendingRegistrations.filter(
      (p) => p.email.toLowerCase() !== pending.email.toLowerCase(),
    );
    current.users.push({ ...user, password: pending.passwordHash });

    if (pending.role === "student") {
      current.students.push({
        id: makeId("s"),
        fullName: pending.fullName,
        email: pending.email,
        studentNumber: `U${Math.floor(100000 + Math.random() * 900000)}`,
        program: pending.branch,
        branch: pending.branch,
        year: pending.year ?? 1,
        enrolledAt: new Date().toISOString(),
        gpa: 0,
        attendance: 100,
      });
    } else {
      current.teachers.push({
        id: user.id,
        branch: pending.branch,
        courses: pending.courses ?? [],
      });
    }
  });

  res.status(201).json({ token: signToken(user), user });
});

app.post("/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const { email, password } = parsed.data;
  const db = await loadDb();
  const found = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found) return res.status(401).send("Invalid email or password");
  const ok = await compare(password, found.password);
  if (!ok) return res.status(401).send("Invalid email or password");
  const { password: _pw, ...user } = found;
  res.json({ token: signToken(user), user });
});

app.post("/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const input = parsed.data;
  const db = await loadDb();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return res.status(409).send("An account with that email already exists");
  }
  const user: User = {
    id: makeId("u"),
    email: input.email,
    fullName: input.fullName,
    role: input.role,
  };
  const passwordHash = await hash(input.password, 10);
  await mutateDb((current) => {
    current.users.push({ ...user, password: passwordHash });
    if (input.role === "student") {
      current.students.push({
        id: makeId("s"),
        fullName: input.fullName,
        email: input.email,
        studentNumber: `U${Math.floor(100000 + Math.random() * 900000)}`,
        program: "CSE",
        branch: "CSE",
        year: 1,
        enrolledAt: new Date().toISOString(),
        gpa: 0,
        attendance: 100,
      });
    }
  });
  res.status(201).json({ token: signToken(user), user });
});

app.get("/auth/me", auth, (req: AuthedRequest, res) => {
  res.json(req.user);
});

app.post("/auth/forgot-password/request-otp", async (req, res) => {
  const parsed = forgotPasswordRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const email = parsed.data.email.toLowerCase();
  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    return res.status(200).json({ ok: true, message: "If email exists, OTP has been sent." });
  }

  const otp = createOtp();
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
  await mutateDb((current) => {
    const target = current.users.find((u) => u.id === user.id);
    if (target) {
      target.passwordResetOtp = otp;
      target.passwordResetExpiresAt = expiresAt;
    }
  });
  await sendOtpEmail(user.email, otp);
  res.json({ ok: true, message: "If email exists, OTP has been sent." });
});

app.post("/auth/forgot-password/verify-otp", async (req, res) => {
  const parsed = forgotPasswordVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const { email, otp } = parsed.data;
  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.passwordResetOtp || !user.passwordResetExpiresAt) {
    return res.status(400).send("Invalid OTP");
  }
  if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
    return res.status(400).send("OTP expired");
  }
  if (user.passwordResetOtp !== otp) {
    return res.status(400).send("Invalid OTP");
  }
  res.json({ ok: true });
});

app.post("/auth/forgot-password/reset", async (req, res) => {
  const parsed = forgotPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const { email, otp, newPassword } = parsed.data;
  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !user.passwordResetOtp || !user.passwordResetExpiresAt) {
    return res.status(400).send("Invalid OTP");
  }
  if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
    return res.status(400).send("OTP expired");
  }
  if (user.passwordResetOtp !== otp) {
    return res.status(400).send("Invalid OTP");
  }
  const nextHash = await hash(newPassword, 10);
  await mutateDb((current) => {
    const target = current.users.find((u) => u.id === user.id);
    if (target) {
      target.password = nextHash;
      target.passwordResetOtp = undefined;
      target.passwordResetExpiresAt = undefined;
    }
  });
  res.json({ ok: true });
});

app.get("/students", auth, async (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).send("Unauthenticated");
  const email = typeof req.query.email === "string" ? req.query.email : undefined;
  const db = await loadDb();
  if (user.role === "student") {
    if (!email || email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).send("Students can only access their own profile");
    }
  }
  if (email) {
    const student = db.students.find((s) => s.email.toLowerCase() === email.toLowerCase()) ?? null;
    return res.json(student);
  }
  if (user.role === "admin") return res.json(db.students);
  if (user.role === "teacher") {
    const profile = db.teachers.find((t) => t.id === user.id);
    if (!profile) return res.json([]);
    const filtered = db.students.filter((s) => s.branch === profile.branch);
    return res.json(filtered);
  }
  return res.status(403).send("Forbidden");
});

app.get("/teachers", auth, requireRole("admin"), async (_req, res) => {
  const db = await loadDb();
  const teachers = db.users
    .filter((u) => u.role === "teacher")
    .map(({ password: _pw, ...user }) => user);
  res.json(teachers);
});

app.get("/course-assignments/me", auth, requireRole("teacher", "admin"), async (req: AuthedRequest, res) => {
  const db = await loadDb();
  if (!req.user) return res.status(401).send("Unauthenticated");
  if (req.user.role === "admin") {
    return res.json({
      courses: Array.from(new Set(db.branches.flatMap((b) => b.courses))).sort(),
    });
  }
  const profile = db.teachers.find((t) => t.id === req.user!.id);
  return res.json({ courses: Array.from(new Set(profile?.courses ?? [])).sort() });
});

app.get("/students/:id", auth, async (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).send("Unauthenticated");
  const db = await loadDb();
  const student = db.students.find((s) => s.id === req.params.id);
  if (!student) return res.status(404).send("Student not found");
  if (user.role === "student" && student.email.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).send("Forbidden");
  }
  res.json(student);
});

app.patch("/students/:id", auth, requireRole("admin"), async (req, res) => {
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  const existing = db.students.find((s) => s.id === req.params.id);
  if (!existing) return res.status(404).send("Student not found");
  const next = { ...existing, ...parsed.data };
  await mutateDb((current) => {
    const idx = current.students.findIndex((s) => s.id === req.params.id);
    if (idx !== -1) current.students[idx] = next;
  });
  res.json(next);
});

app.get("/assignments", auth, async (req: AuthedRequest, res) => {
  const db = await loadDb();
  if (!req.user) return res.status(401).send("Unauthenticated");
  if (req.user.role === "admin") return res.json(db.assignments);
  if (req.user.role === "student") {
    return res.json(db.assignments.filter((a) => a.status === "published"));
  }
  const teacherCourses = teacherSelectedCourseSet(db, req.user.id);
  const teacherAssignments = db.assignments.filter(
    (a) => a.teacherId === req.user?.id || teacherCourses.has(a.course),
  );
  return res.json(teacherAssignments);
});

app.post("/assignments", auth, requireRole("teacher", "admin"), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      course: z.string().min(1),
      dueDate: z.string().min(1),
      maxScore: z.number().min(0),
      status: z.enum(["draft", "published", "archived"]),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  if (req.user?.role === "teacher") {
    const allowedCourses = teacherSelectedCourseSet(db, req.user.id);
    if (!allowedCourses.has(parsed.data.course)) {
      return res.status(403).send("Course is not assigned to this teacher");
    }
  }
  const assignment: Assignment = {
    ...parsed.data,
    id: makeId("a"),
    createdAt: new Date().toISOString(),
    teacherId: req.user?.role === "teacher" ? req.user.id : undefined,
  };
  await mutateDb((db) => {
    db.assignments.unshift(assignment);
  });
  res.status(201).json(assignment);
});

app.patch("/assignments/:id", auth, requireRole("teacher", "admin"), async (req: AuthedRequest, res) => {
  const db = await loadDb();
  const idx = db.assignments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).send("Not found");
  if (req.user?.role === "teacher" && db.assignments[idx].teacherId !== req.user.id) {
    return res.status(403).send("You can only update your own assignments");
  }
  const next = { ...db.assignments[idx], ...(req.body as Partial<Assignment>) };
  await mutateDb((current) => {
    const targetIdx = current.assignments.findIndex((a) => a.id === req.params.id);
    if (targetIdx !== -1) current.assignments[targetIdx] = next;
  });
  res.json(next);
});

app.delete("/assignments/:id", auth, requireRole("teacher", "admin"), async (req: AuthedRequest, res) => {
  const db = await loadDb();
  const existing = db.assignments.find((a) => a.id === req.params.id);
  if (!existing) return res.status(404).send("Not found");
  if (req.user?.role === "teacher" && existing.teacherId !== req.user.id) {
    return res.status(403).send("You can only delete your own assignments");
  }
  await mutateDb((db) => {
    db.assignments = db.assignments.filter((a) => a.id !== req.params.id);
    db.submissions = db.submissions.filter((s) => s.assignmentId !== req.params.id);
  });
  res.json({ ok: true });
});

app.get("/submissions", auth, async (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).send("Unauthenticated");
  const db = await loadDb();
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const assignmentId = typeof req.query.assignmentId === "string" ? req.query.assignmentId : undefined;
  let list = db.submissions.filter(
    (s) => (!studentId || s.studentId === studentId) && (!assignmentId || s.assignmentId === assignmentId),
  );
  if (user.role === "student") {
    const me = db.students.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
    list = me ? list.filter((s) => s.studentId === me.id) : [];
  }
  if (user.role === "teacher") {
    const teacherAssignments = new Set(
      db.assignments.filter((a) => a.teacherId === user.id).map((a) => a.id),
    );
    list = list.filter((s) => teacherAssignments.has(s.assignmentId));
  }
  res.json(list);
});

app.post("/submissions", auth, async (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).send("Unauthenticated");
  const parsed = z
    .object({
      assignmentId: z.string().min(1),
      studentId: z.string().min(1),
      content: z.string().trim().max(10000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  const assignment = db.assignments.find((a) => a.id === parsed.data.assignmentId);
  if (!assignment || assignment.status !== "published") {
    return res.status(404).send("Assignment not found");
  }
  if (user.role === "student") {
    const me = db.students.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
    if (!me || me.id !== parsed.data.studentId) {
      return res.status(403).send("Students can only submit their own assignments");
    }
  }
  let created: Submission | null = null;
  await mutateDb((db) => {
    const existing = db.submissions.find(
      (s) => s.assignmentId === parsed.data.assignmentId && s.studentId === parsed.data.studentId,
    );
    if (existing) {
      existing.status = "submitted";
      existing.submittedAt = new Date().toISOString();
      existing.content = parsed.data.content;
      created = existing;
      return;
    }
    created = {
      id: makeId("sub"),
      assignmentId: parsed.data.assignmentId,
      studentId: parsed.data.studentId,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      content: parsed.data.content,
    };
    db.submissions.push(created);
  });
  res.status(201).json(created);
});

app.patch("/submissions/:id", auth, requireRole("teacher", "admin"), async (req: AuthedRequest, res) => {
  const patch = req.body as Partial<Submission>;
  const db = await loadDb();
  const existing = db.submissions.find((s) => s.id === req.params.id);
  if (!existing) return res.status(404).send("Not found");
  const assignment = db.assignments.find((a) => a.id === existing.assignmentId);
  if (req.user?.role === "teacher" && assignment?.teacherId !== req.user.id) {
    return res.status(403).send("Forbidden");
  }
  const next: Submission = { ...existing, ...patch };
  await mutateDb((current) => {
    const idx = current.submissions.findIndex((s) => s.id === req.params.id);
    if (idx !== -1) current.submissions[idx] = next;
  });
  res.json(next);
});

app.get("/students/:id/grades", auth, async (req: AuthedRequest, res) => {
  const user = req.user;
  if (!user) return res.status(401).send("Unauthenticated");
  const db = await loadDb();
  if (user.role === "student") {
    const me = db.students.find((s) => s.email.toLowerCase() === user.email.toLowerCase());
    if (!me || me.id !== req.params.id) return res.status(403).send("Forbidden");
  }
  const list = db.grades.filter((g) => g.studentId === req.params.id);
  res.json(list);
});

app.post("/grades", auth, requireRole("teacher", "admin"), async (req, res) => {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      course: z.string().min(1),
      assessment: z.string().min(1),
      score: z.number().min(0),
      maxScore: z.number().min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const grade: Grade = {
    ...parsed.data,
    id: makeId("g"),
    recordedAt: new Date().toISOString(),
  };
  await mutateDb((db) => {
    db.grades.push(grade);
  });
  res.status(201).json(grade);
});

app.patch("/grades/:id", auth, requireRole("teacher", "admin"), async (req, res) => {
  const parsed = z
    .object({
      score: z.number().min(0).optional(),
      maxScore: z.number().min(1).optional(),
      assessment: z.string().min(1).optional(),
      course: z.string().min(1).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  const idx = db.grades.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).send("Grade not found");
  const next = { ...db.grades[idx], ...parsed.data };
  await mutateDb((current) => {
    const target = current.grades.findIndex((g) => g.id === req.params.id);
    if (target !== -1) current.grades[target] = next;
  });
  res.json(next);
});

app.get("/students/:id/progress", auth, async (_req, res) => {
  const db = await loadDb();
  res.json(db.progress);
});

app.get("/admin/course-assignments", auth, requireRole("admin"), async (_req, res) => {
  const db = await loadDb();
  const rows = db.courseAssignments.map((ca) => {
    const teacher = db.users.find((u) => u.id === ca.teacherId && u.role === "teacher");
    return {
      ...ca,
      teacherName: teacher?.fullName ?? "Unknown",
      teacherEmail: teacher?.email ?? "",
    };
  });
  res.json(rows);
});

app.post("/admin/course-assignments", auth, requireRole("admin"), async (req, res) => {
  const parsed = z.object({ course: z.string().min(1), teacherId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  const teacher = db.users.find((u) => u.id === parsed.data.teacherId && u.role === "teacher");
  if (!teacher) return res.status(404).send("Teacher not found");
  if (
    db.courseAssignments.some(
      (c) =>
        c.course.toLowerCase() === parsed.data.course.toLowerCase() &&
        c.teacherId === parsed.data.teacherId,
    )
  ) {
    return res.status(409).send("This mapping already exists");
  }
  const mapping: CourseAssignment = { id: makeId("ca"), ...parsed.data };
  await mutateDb((current) => {
    current.courseAssignments.push(mapping);
  });
  res.status(201).json(mapping);
});

app.patch("/admin/course-assignments/:id", auth, requireRole("admin"), async (req, res) => {
  const parsed = z.object({ course: z.string().min(1), teacherId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  const idx = db.courseAssignments.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).send("Course assignment not found");
  const next: CourseAssignment = { ...db.courseAssignments[idx], ...parsed.data };
  await mutateDb((current) => {
    const target = current.courseAssignments.findIndex((c) => c.id === req.params.id);
    if (target !== -1) current.courseAssignments[target] = next;
  });
  res.json(next);
});

app.delete("/admin/course-assignments/:id", auth, requireRole("admin"), async (req, res) => {
  await mutateDb((current) => {
    current.courseAssignments = current.courseAssignments.filter((c) => c.id !== req.params.id);
  });
  res.json({ ok: true });
});

app.post("/admin/teachers", auth, requireRole("admin"), async (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(4),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Invalid payload");
  const db = await loadDb();
  if (db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())) {
    return res.status(409).send("An account with that email already exists");
  }
  const teacher = {
    id: makeId("u"),
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    role: "teacher" as const,
    password: await hash(parsed.data.password, 10),
  };
  await mutateDb((current) => {
    current.users.push(teacher);
  });
  const { password: _pw, ...publicTeacher } = teacher;
  res.status(201).json(publicTeacher);
});

app.delete("/admin/users", auth, requireRole("admin"), async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).send("Missing email");

  const db = await loadDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user) return res.status(404).send("User not found");

  await mutateDb((current) => {
    current.users = current.users.filter((u) => u.id !== user.id);
    current.pendingRegistrations = current.pendingRegistrations.filter(
      (p) => p.email.toLowerCase() !== email,
    );

    if (user.role === "student") {
      const student = current.students.find((s) => s.email.toLowerCase() === email);
      if (student) {
        current.submissions = current.submissions.filter((s) => s.studentId !== student.id);
        current.grades = current.grades.filter((g) => g.studentId !== student.id);
        current.students = current.students.filter((s) => s.id !== student.id);
      }
    }

    if (user.role === "teacher") {
      current.teachers = current.teachers.filter((t) => t.id !== user.id);
      current.assignments = current.assignments.filter((a) => a.teacherId !== user.id);
      current.courseAssignments = current.courseAssignments.filter((c) => c.teacherId !== user.id);
    }
  });

  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
