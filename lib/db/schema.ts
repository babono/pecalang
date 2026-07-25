import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const targetUrls = pgTable(
  "target_urls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
    cronSchedule: text("cron_schedule").notNull(),
    selector: text("selector"),
    active: boolean("active").notNull().default(true),
    lastScrapedHash: text("last_scraped_hash"),
    lastScrapedText: text("last_scraped_text"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastStatus: text("last_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("target_urls_user_idx").on(table.userId)],
);

/** "no_change" | "change_detected" | "error" — kept as text so new states don't need a migration. */
export const crawlLogs = pgTable(
  "crawl_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetUrlId: uuid("target_url_id")
      .notNull()
      .references(() => targetUrls.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    httpStatus: integer("http_status"),
    contentHash: text("content_hash"),
    previousHash: text("previous_hash"),
    addedLines: integer("added_lines").notNull().default(0),
    removedLines: integer("removed_lines").notNull().default(0),
    diffSnippet: text("diff_snippet"),
    llmSummary: text("llm_summary"),
    llmModel: text("llm_model"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("crawl_logs_target_idx").on(table.targetUrlId)],
);

export type User = typeof users.$inferSelect;
export type TargetUrl = typeof targetUrls.$inferSelect;
export type CrawlLog = typeof crawlLogs.$inferSelect;
