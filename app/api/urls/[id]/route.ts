import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { targetUrls } from "@/lib/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { nextRun } from "@/lib/schedule";

type Context = { params: Promise<{ id: string }> };

async function ownedTarget(id: string) {
  const user = await requireUser();
  const db = await getDb();
  const [target] = await db
    .select()
    .from(targetUrls)
    .where(and(eq(targetUrls.id, id), eq(targetUrls.userId, user.id)));
  return { db, target };
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const { db, target } = await ownedTarget(id);
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (typeof body?.active !== "boolean") {
      return NextResponse.json(
        { error: "Only `active` can be patched." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(targetUrls)
      .set({
        active: body.active,
        // Resuming a paused target shouldn't fire immediately for every tick
        // it missed while paused.
        nextRunAt: body.active ? nextRun(target.cronSchedule) : null,
      })
      .where(eq(targetUrls.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const { db, target } = await ownedTarget(id);
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.delete(targetUrls).where(eq(targetUrls.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
