import { NextResponse } from "next/server";
import { runCheckById } from "@/lib/monitor";
import { authorizeCronRequest } from "@/lib/cron-auth";

// Fetch + LLM per call — allow headroom past the default serverless limit.
export const maxDuration = 60;

/**
 * Worker: fetch the page, extract its text, hash it, compare against the
 * stored hash, and write a crawl log (with an LLM summary when it differs).
 */
export async function POST(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetUrlId =
    typeof body?.targetUrlId === "string" ? body.targetUrlId : null;

  if (!targetUrlId) {
    return NextResponse.json(
      { error: "targetUrlId is required" },
      { status: 400 },
    );
  }

  const outcome = await runCheckById(targetUrlId);
  if (!outcome) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: outcome });
}
