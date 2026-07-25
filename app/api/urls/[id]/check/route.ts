import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { targetUrls } from "@/lib/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { runCheck } from "@/lib/monitor";

type Context = { params: Promise<{ id: string }> };

/** "Check now" — same code path the scheduled worker uses, run on demand. */
export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const user = await requireUser();
    const db = await getDb();
    const [target] = await db
      .select()
      .from(targetUrls)
      .where(and(eq(targetUrls.id, id), eq(targetUrls.userId, user.id)));

    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const outcome = await runCheck(target);
    return NextResponse.json({ data: outcome });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
