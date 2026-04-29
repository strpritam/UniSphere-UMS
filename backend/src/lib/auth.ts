import jwt from "jsonwebtoken";
import type { User } from "../types.js";

const secret = process.env.JWT_SECRET ?? "dev-secret";

export function signToken(user: User): string {
  return jwt.sign({ user }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, secret) as { user?: User };
    return decoded.user ?? null;
  } catch {
    return null;
  }
}
