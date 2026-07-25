import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export const DEMO_EMAIL = "demo@pecalang.dev";
export const DEMO_PASSWORD = "watchtower";

/**
 * Postgres when DATABASE_URL is set, otherwise an embedded PGlite instance
 * (same wire dialect, no server to run) so `npm run dev` works on a clean
 * checkout. Both paths speak the same Drizzle pg API.
 */
async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const [{ drizzle }, postgres] = await Promise.all([
      import("drizzle-orm/postgres-js"),
      import("postgres"),
    ]);
    const client = postgres.default(url, { max: 4 });
    return drizzle(client, { schema });
  }

  const [{ drizzle }, { PGlite }] = await Promise.all([
    import("drizzle-orm/pglite"),
    import("@electric-sql/pglite"),
  ]);
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  await client.waitReady;
  return drizzle(client, { schema }) as unknown as Database;
}

/**
 * Idempotent DDL. Both backends start empty, and the schema is small enough
 * that this is cheaper to reason about than a migration folder.
 */
async function ensureSchema(db: Database) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS target_urls (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url text NOT NULL,
      label text,
      cron_schedule text NOT NULL,
      selector text,
      active boolean NOT NULL DEFAULT true,
      last_scraped_hash text,
      last_scraped_text text,
      last_checked_at timestamptz,
      next_run_at timestamptz,
      last_status text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crawl_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      target_url_id uuid NOT NULL REFERENCES target_urls(id) ON DELETE CASCADE,
      status text NOT NULL,
      http_status integer,
      content_hash text,
      previous_hash text,
      added_lines integer NOT NULL DEFAULT 0,
      removed_lines integer NOT NULL DEFAULT 0,
      diff_snippet text,
      llm_summary text,
      llm_model text,
      error_message text,
      duration_ms integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS target_urls_user_idx ON target_urls (user_id)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS crawl_logs_target_idx ON crawl_logs (target_url_id)`,
  );
}

export function hashPassword(password: string, salt = randomBytes(16)) {
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

async function seedDemoUser(db: Database) {
  await db
    .insert(schema.users)
    .values({
      email: DEMO_EMAIL,
      name: "Demo Operator",
      passwordHash: hashPassword(DEMO_PASSWORD),
    })
    .onConflictDoNothing({ target: schema.users.email });
}

// Cached across dev-server hot reloads — a new PGlite handle per reload would
// contend for the same data directory.
const globalForDb = globalThis as unknown as { __pecalangDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  globalForDb.__pecalangDb ??= (async () => {
    const db = await connect();
    await ensureSchema(db);
    await seedDemoUser(db);
    return db;
  })();
  return globalForDb.__pecalangDb;
}
