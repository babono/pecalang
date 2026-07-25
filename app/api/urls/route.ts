import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { targetUrls } from "@/lib/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { cronForFrequency, isValidCron, nextRun } from "@/lib/schedule";
import { runCheck } from "@/lib/monitor";

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const rows = await db
      .select()
      .from(targetUrls)
      .where(eq(targetUrls.userId, user.id))
      .orderBy(desc(targetUrls.createdAt));
    return NextResponse.json({ data: rows });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const selector =
    typeof body?.selector === "string" && body.selector.trim()
      ? body.selector.trim()
      : null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    return NextResponse.json(
      { error: "Enter a full http(s) URL, e.g. https://example.com/pricing" },
      { status: 400 },
    );
  }

  // Either a named frequency from the form, or a raw cron string for advanced use.
  const cron =
    (typeof body?.frequency === "string"
      ? cronForFrequency(body.frequency)
      : null) ??
    (typeof body?.cron === "string" && isValidCron(body.cron.trim())
      ? body.cron.trim()
      : null);

  if (!cron) {
    return NextResponse.json(
      { error: "Choose a checking frequency, or supply a valid cron string." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const [created] = await db
    .insert(targetUrls)
    .values({
      userId: user.id,
      url: parsed.toString(),
      label: label || null,
      cronSchedule: cron,
      selector,
      nextRunAt: nextRun(cron),
    })
    .returning();

  // Capture the baseline immediately so the first scheduled run has something
  // to compare against. Failures land in the log rather than failing the create.
  if (body?.captureBaseline !== false) {
    await runCheck(created);
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
