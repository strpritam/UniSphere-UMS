import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashSync } from "bcryptjs";
import mongoose, { Schema } from "mongoose";
import type { DbShape } from "../types.js";
import { seedDb } from "./seed.js";

const JSON_PATH = resolve(process.cwd(), "data", "db.json");
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/progress_portal";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "progress_portal";

let db: DbShape | null = null;
let mongoReady = false;

const appStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { versionKey: false },
);
const AppStateModel = mongoose.models.AppState ?? mongoose.model("AppState", appStateSchema);

async function ensureMongo() {
  if (mongoReady) return;
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  }
  mongoReady = true;
}

function maybeHashPassword(password: string): string {
  return password.startsWith("$2") ? password : hashSync(password, 10);
}

function normalizeDb(input: DbShape): DbShape {
  const seeded = seedDb();
  const users = input.users ?? [];
  const hasAdmin = users.some((u) => u.role === "admin");
  const normalizedUsers = (hasAdmin
    ? users
    : [...seeded.users.filter((u) => u.role === "admin"), ...users]
  ).map((user) => ({
    ...user,
    password: maybeHashPassword(user.password),
  }));

  return {
    ...input,
    users: normalizedUsers,
    students: (input.students ?? seeded.students).map((s) => {
      const program = (s as any).program ?? "CSE";
      const branch =
        (s as any).branch ??
        (["CSE", "BBA", "Agriculture", "Mechanicals"].includes(program) ? program : "CSE");
      return {
        ...s,
        program,
        branch,
      } as any;
    }),
    teachers: input.teachers ?? seeded.teachers,
    branches: input.branches && input.branches.length > 0 ? input.branches : seeded.branches,
    pendingRegistrations: input.pendingRegistrations ?? [],
    assignments: (input.assignments ?? []).map((a) => ({
      ...a,
      teacherId: a.teacherId,
    })),
    submissions: (input.submissions ?? []).map((s) => ({
      ...s,
      content: s.content,
    })),
    courseAssignments:
      input.courseAssignments && input.courseAssignments.length > 0
        ? input.courseAssignments
        : seeded.courseAssignments,
  };
}

async function persist(next: DbShape) {
  await ensureMongo();
  await AppStateModel.findOneAndUpdate(
    { key: "main" },
    { $set: { payload: next } },
    { upsert: true },
  );
}

export async function loadDb(): Promise<DbShape> {
  if (db) return db;
  await ensureMongo();
  const row = (await AppStateModel.findOne({ key: "main" }).lean()) as
    | { payload?: DbShape }
    | null;

  if (row?.payload) {
    db = normalizeDb(row.payload);
    await persist(db);
    return db;
  }

  if (existsSync(JSON_PATH)) {
    const raw = await readFile(JSON_PATH, "utf-8");
    db = normalizeDb(JSON.parse(raw) as DbShape);
    await persist(db);
    return db;
  }

  db = seedDb();
  await persist(db);
  return db;
}

export async function mutateDb(mutator: (current: DbShape) => void | DbShape): Promise<DbShape> {
  const current = await loadDb();
  const possibleNext = mutator(current);
  db = possibleNext ?? current;
  await persist(db);
  return db;
}
