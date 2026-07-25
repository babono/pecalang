import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { crawlLogs, targetUrls, type TargetUrl } from "./db/schema";
import { buildDiff, extractText, fetchHtml, hashText } from "./crawler";
import { summariseDiff } from "./llm";
import { nextRun } from "./schedule";

export type CheckStatus = "no_change" | "change_detected" | "error";

export const STATUS_LABEL: Record<CheckStatus, string> = {
  no_change: "No Change",
  change_detected: "Change Detected",
  error: "Error",
};

export type CheckOutcome = {
  targetUrlId: string;
  status: CheckStatus;
  summary: string | null;
};

/**
 * One full check: fetch → extract text → hash → compare → log.
 * The LLM is only invoked when the hash actually moved.
 */
export async function runCheck(target: TargetUrl): Promise<CheckOutcome> {
  const db = await getDb();
  const startedAt = Date.now();
  const now = new Date();

  try {
    const { httpStatus, html } = await fetchHtml(target.url);
    const text = extractText(html, target.selector);
    const hash = hashText(text);
    const isFirstCapture = !target.lastScrapedHash;
    const changed = !isFirstCapture && hash !== target.lastScrapedHash;

    let summary: string | null = null;
    let model: string | null = null;
    let addedLines = 0;
    let removedLines = 0;
    let snippet: string | null = null;

    if (isFirstCapture) {
      summary = "Baseline captured. Future checks are compared against this snapshot.";
    } else if (changed) {
      const diff = buildDiff(target.lastScrapedText ?? "", text);
      addedLines = diff.addedLines;
      removedLines = diff.removedLines;
      snippet = diff.snippet;
      const result = await summariseDiff(target.url, diff);
      summary = result.summary;
      model = result.model;
    }

    const status: CheckStatus = changed ? "change_detected" : "no_change";

    await db.insert(crawlLogs).values({
      targetUrlId: target.id,
      status,
      httpStatus,
      contentHash: hash,
      previousHash: target.lastScrapedHash,
      addedLines,
      removedLines,
      diffSnippet: snippet,
      llmSummary: summary,
      llmModel: model,
      durationMs: Date.now() - startedAt,
    });

    await db
      .update(targetUrls)
      .set({
        lastScrapedHash: hash,
        lastScrapedText: text,
        lastCheckedAt: now,
        lastStatus: status,
        nextRunAt: nextRun(target.cronSchedule, now),
      })
      .where(eq(targetUrls.id, target.id));

    return { targetUrlId: target.id, status, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.insert(crawlLogs).values({
      targetUrlId: target.id,
      status: "error",
      errorMessage: message,
      previousHash: target.lastScrapedHash,
      durationMs: Date.now() - startedAt,
    });

    await db
      .update(targetUrls)
      .set({
        lastCheckedAt: now,
        lastStatus: "error",
        // Still advance the schedule — a broken target shouldn't be retried
        // on every dispatcher tick.
        nextRunAt: nextRun(target.cronSchedule, now),
      })
      .where(eq(targetUrls.id, target.id));

    return { targetUrlId: target.id, status: "error", summary: message };
  }
}

export async function runCheckById(id: string): Promise<CheckOutcome | null> {
  const db = await getDb();
  const [target] = await db
    .select()
    .from(targetUrls)
    .where(eq(targetUrls.id, id));
  if (!target) return null;
  return runCheck(target);
}
