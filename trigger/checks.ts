import { schedules, task } from "@trigger.dev/sdk";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getDb } from "../lib/db";
import { targetUrls } from "../lib/db/schema";
import { runCheckById } from "../lib/monitor";

/**
 * Runs one target's check on trigger.dev's infrastructure — no serverless time
 * limit, and automatic retries per target. Shares the exact same pipeline the
 * Vercel routes use (fetch → hash → diff → LLM → log).
 *
 * Requires DATABASE_URL (and optionally DEEPSEEK_API_KEY / ANTHROPIC_API_KEY)
 * in the trigger.dev environment.
 */
export const checkTarget = task({
  id: "check-target",
  retry: { maxAttempts: 3 },
  run: async (payload: { targetUrlId: string }) => {
    const outcome = await runCheckById(payload.targetUrlId);
    return (
      outcome ?? {
        targetUrlId: payload.targetUrlId,
        status: "error" as const,
        summary: "target not found",
      }
    );
  },
});

/**
 * Scheduled dispatcher: every 15 minutes, find the targets whose cron says they
 * are due and fan each one out to its own `checkTarget` run. Fanning out (rather
 * than looping here) gives each check independent retries and parallelism.
 */
export const dispatchDueChecks = schedules.task({
  id: "dispatch-due-checks",
  cron: "*/15 * * * *",
  run: async () => {
    const db = await getDb();
    const now = new Date();

    const due = await db
      .select({ id: targetUrls.id })
      .from(targetUrls)
      .where(
        and(
          eq(targetUrls.active, true),
          or(isNull(targetUrls.nextRunAt), lte(targetUrls.nextRunAt, now)),
        ),
      );

    if (due.length > 0) {
      await checkTarget.batchTrigger(
        due.map((target) => ({ payload: { targetUrlId: target.id } })),
      );
    }

    return { due: due.length };
  },
});
