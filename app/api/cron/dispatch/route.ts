import { NextResponse } from "next/server";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { targetUrls } from "@/lib/db/schema";
import { authorizeCronRequest, cronHeaders } from "@/lib/cron-auth";

const MAX_PER_TICK = 25;

/**
 * Dispatcher: find every active target whose cron schedule says it is due, and
 * hand each one to the worker route. Point a real cron (Vercel Cron, systemd
 * timer, GitHub Action) at this endpoint once a minute.
 */
async function dispatch(request: Request) {
  if (!authorizeCronRequest(request)) {
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

  const workerUrl = new URL("/api/worker/check", request.url);

  const results = await Promise.all(
    due.map(async (target) => {
      try {
        const response = await fetch(workerUrl, {
          method: "POST",
          headers: cronHeaders(),
          body: JSON.stringify({ targetUrlId: target.id }),
        });
        const payload = await response.json().catch(() => null);
        return {
          targetUrlId: target.id,
          url: target.url,
          dispatched: response.ok,
          status: payload?.data?.status ?? null,
        };
      } catch (error) {
        return {
          targetUrlId: target.id,
          url: target.url,
          dispatched: false,
          status: null,
          error: error instanceof Error ? error.message : "dispatch failed",
        };
      }
    }),
  );

  return NextResponse.json({
    checkedAt: now.toISOString(),
    due: due.length,
    truncated: due.length === MAX_PER_TICK,
    results,
  });
}

export const POST = dispatch;
// GET is allowed so a browser or a plain `curl` can trigger a tick while developing.
export const GET = dispatch;
