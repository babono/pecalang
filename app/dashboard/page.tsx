import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { crawlLogs, targetUrls } from "@/lib/db/schema";
import { describeCron, formatRelative } from "@/lib/schedule";
import { StatusBadge } from "@/components/status-badge";
import { DispatchButton } from "./dispatch-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Don't trust the layout guard: a present-but-stale session cookie reaches
  // here with no matching user, so redirect rather than dereference null.
  const user = await currentUser();
  if (!user) redirect("/login");

  const db = await getDb();

  const rows = await db
    .select({
      id: targetUrls.id,
      url: targetUrls.url,
      label: targetUrls.label,
      cronSchedule: targetUrls.cronSchedule,
      active: targetUrls.active,
      lastStatus: targetUrls.lastStatus,
      lastCheckedAt: targetUrls.lastCheckedAt,
      nextRunAt: targetUrls.nextRunAt,
      changeCount: sql<number>`(
        SELECT count(*) FROM ${crawlLogs}
        WHERE ${crawlLogs.targetUrlId} = ${targetUrls.id}
          AND ${crawlLogs.status} = 'change_detected'
      )`.mapWith(Number),
    })
    .from(targetUrls)
    .where(eq(targetUrls.userId, user.id))
    .orderBy(desc(targetUrls.createdAt));

  const watching = rows.filter((row) => row.active).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="eyebrow text-cream-muted">The watchlist</p>
          <h1 className="mt-2 text-3xl tracking-tight text-cream">
            {rows.length === 0
              ? "Nothing under watch yet"
              : `${watching} page${watching === 1 ? "" : "s"} under watch`}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <DispatchButton />
          <Link
            href="/dashboard/add"
            className="bg-cta px-4 py-2 text-sm text-white transition-colors hover:bg-cta-strong"
          >
            Add a URL
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="border border-dashed border-rule-strong bg-paper-raised px-8 py-16 text-center">
          <h2 className="text-xl text-ink">Put something under watch</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            Paste any public URL and pick how often it should be checked. The
            first check stores a baseline; from then on you get a written
            account of anything that moves.
          </p>
          <Link
            href="/dashboard/add"
            className="mt-6 inline-block bg-cta px-5 py-2.5 text-sm text-white transition-colors hover:bg-cta-strong"
          >
            Add your first URL
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-rule bg-paper-raised shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)]">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule">
                <th className="eyebrow px-5 py-3">Page</th>
                <th className="eyebrow px-5 py-3">Status</th>
                <th className="eyebrow px-5 py-3">Frequency</th>
                <th className="eyebrow px-5 py-3">Last check</th>
                <th className="eyebrow px-5 py-3">Next run</th>
                <th className="eyebrow px-5 py-3 text-right">Changes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-rule last:border-b-0 transition-colors hover:bg-paper"
                >
                  <td className="max-w-[22rem] px-5 py-4">
                    <Link
                      href={`/dashboard/url/${row.id}`}
                      className="font-[family-name:var(--font-display)] text-base text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-accent"
                    >
                      {row.label ?? new URL(row.url).hostname}
                    </Link>
                    <p className="mt-1 truncate text-xs text-ink-faint">
                      {row.url}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {row.active ? (
                      <StatusBadge status={row.lastStatus} />
                    ) : (
                      <span className="inline-flex items-center border border-rule px-2 py-0.5 text-[11px] tracking-wide text-ink-faint">
                        Paused
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {describeCron(row.cronSchedule)}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {formatRelative(row.lastCheckedAt)}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    {row.active ? formatRelative(row.nextRunAt) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-[family-name:var(--font-display)] text-lg">
                    {row.changeCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
