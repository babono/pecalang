import { NextResponse } from "next/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { targetUrls } from "@/lib/db/schema";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { currentUser } from "@/lib/auth";
import { runCheckById } from "@/lib/monitor";

// Each check fetches a page and may call an LLM, so give the invocation room.
// (Requires a plan whose function limit allows it; Hobby caps lower.)
export const maxDuration = 60;

// Kept small so one tick stays within the function time limit. Raise it (and
// maxDuration) on a plan that allows longer functions, or run the per-URL
// worker route externally for higher volume.
const MAX_PER_TICK = 8;

/**
 * Dispatcher: find every active target whose cron schedule says it is due and
 * run each check. Point a scheduler (Vercel Cron, or any external cron hitting
 * this URL) at this endpoint. Checks run sequentially for predictable timing.
 */
async function dispatch(request: Request) {
  // Authorized either by the cron secret (scheduler) or a signed-in session
  // (the dashboard "Run dispatcher" button) — the latter matters in production,
  // where the button can't send CRON_SECRET.
  const authorized =
    authorizeCronRequest(request) || (await currentUser()) !== null;
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const now = new Date();

  const due = await db
    .select()
    .from(targetUrls)
    .where(
      and(
        eq(targetUrls.active, true),
        or(isNull(targetUrls.nextRunAt), lte(targetUrls.nextRunAt, now)),
      ),
    )
    .limit(MAX_PER_TICK);

  const results = [];
  for (const target of due) {
    try {
      const outcome = await runCheckById(target.id);
      results.push({
        targetUrlId: target.id,
        url: target.url,
        status: outcome?.status ?? null,
      });
    } catch (error) {
      results.push({
        targetUrlId: target.id,
        url: target.url,
        status: null,
        error: error instanceof Error ? error.message : "check failed",
      });
    }
  }

  return NextResponse.json({
    checkedAt: now.toISOString(),
    due: due.length,
    truncated: due.length === MAX_PER_TICK,
    results,
  });
}

export const POST = dispatch;
// GET is allowed so a browser or plain `curl` (and Vercel Cron, which sends GET)
// can trigger a tick.
export const GET = dispatch;
