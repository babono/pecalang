import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { crawlLogs, targetUrls } from "@/lib/db/schema";
import { describeCron, formatRelative } from "@/lib/schedule";
import { StatusBadge } from "@/components/status-badge";
import { TargetControls } from "./target-controls";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function TargetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const user = await currentUser();
  if (!user) redirect("/login");

  const db = await getDb();

  const [target] = await db
    .select()
    .from(targetUrls)
    .where(and(eq(targetUrls.id, id), eq(targetUrls.userId, user.id)));

  if (!target) notFound();

  const [logs, [{ total }]] = await Promise.all([
    db
      .select()
      .from(crawlLogs)
      .where(eq(crawlLogs.targetUrlId, target.id))
      .orderBy(desc(crawlLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(crawlLogs)
      .where(eq(crawlLogs.targetUrlId, target.id)),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-10">
      <header className="border-b border-teal-line pb-6">
        <Link
          href="/dashboard"
          className="eyebrow text-cream-muted transition-colors hover:text-cream"
        >
          ← Watchlist
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl tracking-tight text-cream">
              {target.label ?? new URL(target.url).hostname}
            </h1>
            <a
              href={target.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-block break-all font-[family-name:var(--font-mono)] text-xs text-cream-muted underline decoration-teal-line underline-offset-4 hover:text-cream"
            >
              {target.url}
            </a>
          </div>
          <TargetControls targetId={target.id} active={target.active} />
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          <div>
            <dt className="eyebrow text-cream-muted">Status</dt>
            <dd className="mt-1.5">
              <StatusBadge status={target.active ? target.lastStatus : null} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-cream-muted">Frequency</dt>
            <dd className="mt-1.5 text-sm text-cream">
              {describeCron(target.cronSchedule)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-cream-muted">Last check</dt>
            <dd className="mt-1.5 text-sm text-cream">
              {formatRelative(target.lastCheckedAt)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-cream-muted">Next run</dt>
            <dd className="mt-1.5 text-sm text-cream">
              {target.active ? formatRelative(target.nextRunAt) : "Paused"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="eyebrow text-cream-muted">Watching</dt>
            <dd className="mt-1.5 font-[family-name:var(--font-mono)] text-sm text-cream">
              {target.selector ?? "whole page body"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="eyebrow text-cream-muted">Content hash</dt>
            <dd className="mt-1.5 truncate font-[family-name:var(--font-mono)] text-sm text-cream-muted">
              {target.lastScrapedHash?.slice(0, 32) ?? "—"}
            </dd>
          </div>
        </dl>
      </header>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-cream-muted">Crawl log</p>
            <h2 className="mt-2 text-2xl tracking-tight text-cream">
              {total} check{total === 1 ? "" : "s"} recorded
            </h2>
          </div>
          {pageCount > 1 ? (
            <p className="text-xs text-cream-muted">
              Page {page} of {pageCount}
            </p>
          ) : null}
        </div>

        {logs.length === 0 ? (
          <p className="mt-6 border border-dashed border-rule-strong bg-paper-raised px-6 py-12 text-center text-sm text-ink-muted">
            No checks yet. Run one from the controls above.
          </p>
        ) : (
          <ol className="mt-6 space-y-px border border-rule bg-rule shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)]">
            {logs.map((log) => (
              <li key={log.id} className="bg-paper-raised px-6 py-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <StatusBadge status={log.status} />
                  <time
                    dateTime={log.createdAt.toISOString()}
                    className="font-[family-name:var(--font-mono)] text-xs text-ink-faint"
                  >
                    {log.createdAt.toLocaleString()}
                  </time>
                  {log.status === "change_detected" ? (
                    <span className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                      +{log.addedLines} / −{log.removedLines}
                    </span>
                  ) : null}
                  {log.durationMs !== null ? (
                    <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                      {log.durationMs}ms
                    </span>
                  ) : null}
                </div>

                {log.errorMessage ? (
                  <p className="mt-3 border-l-2 border-accent pl-4 text-sm leading-relaxed text-accent">
                    {log.errorMessage}
                  </p>
                ) : null}

                {log.llmSummary ? (
                  <div
                    className={
                      log.status === "change_detected"
                        ? "mt-3 border-l-2 border-alarm pl-4"
                        : "mt-3 border-l-2 border-rule pl-4"
                    }
                  >
                    <p className="font-[family-name:var(--font-display)] text-[15px] leading-relaxed text-ink">
                      {log.llmSummary}
                    </p>
                    {log.llmModel ? (
                      <p className="eyebrow mt-2">Summarised by {log.llmModel}</p>
                    ) : null}
                  </div>
                ) : null}

                {log.diffSnippet ? (
                  <details className="mt-3">
                    <summary className="eyebrow cursor-pointer transition-colors hover:text-ink">
                      View diff
                    </summary>
                    <pre className="mt-2 max-h-72 overflow-auto border border-rule bg-paper p-4 font-[family-name:var(--font-mono)] text-xs leading-relaxed whitespace-pre-wrap text-ink-muted">
                      {log.diffSnippet}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        {pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={`/dashboard/url/${target.id}?page=${page - 1}`}
                className="text-sm text-cream-muted underline decoration-teal-line underline-offset-4 hover:text-cream"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            {page < pageCount ? (
              <Link
                href={`/dashboard/url/${target.id}?page=${page + 1}`}
                className="text-sm text-cream-muted underline decoration-teal-line underline-offset-4 hover:text-cream"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
