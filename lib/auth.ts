import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, type User } from "./db/schema";

export const SESSION_COOKIE = "pecalang_session";

const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  // A predictable fallback secret in production means forgeable sessions.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "pecalang-dev-secret";
};

export function signSession(userId: string) {
  const mac = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const index = token.lastIndexOf(".");
  if (index < 1) return null;
  const userId = token.slice(0, index);
  const mac = Buffer.from(token.slice(index + 1), "hex");
  const expected = createHmac("sha256", secret()).update(userId).digest();
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) {
    return null;
  }
  return userId;
}

/** Resolves the signed-in user, or null. Reads the request cookie jar. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

/** For route handlers: 401 unless a valid session cookie is present. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
