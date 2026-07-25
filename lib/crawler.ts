import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { diffLines } from "diff";

export const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; PecalangWatch/1.0; +https://example.invalid/bot)";

export type FetchResult = {
  httpStatus: number;
  html: string;
};

export async function fetchHtml(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Upstream responded ${response.status} ${response.statusText}`);
  }

  return { httpStatus: response.status, html: await response.text() };
}

/**
 * Reduce a page to the text a human would notice changing. Scripts, styles and
 * inline SVG churn on every deploy without the visible page changing at all, so
 * they are dropped before hashing.
 */
export function extractText(html: string, selector?: string | null): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, template").remove();

  const root = selector ? $(selector) : $("body").length ? $("body") : $.root();
  const raw = root.text();

  return raw
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type TextDiff = {
  addedLines: number;
  removedLines: number;
  snippet: string;
};

/** Unified-ish diff, capped so a full-page rewrite can't blow up the log row. */
export function buildDiff(
  previous: string,
  next: string,
  maxLines = 120,
): TextDiff {
  const parts = diffLines(previous, next);
  const lines: string[] = [];
  let addedLines = 0;
  let removedLines = 0;

  for (const part of parts) {
    const partLines = part.value.split("\n").filter(Boolean);
    if (part.added) addedLines += partLines.length;
    else if (part.removed) removedLines += partLines.length;
    else continue;

    const marker = part.added ? "+" : "-";
    for (const line of partLines) {
      if (lines.length < maxLines) lines.push(`${marker} ${line.slice(0, 400)}`);
    }
  }

  if (addedLines + removedLines > lines.length) {
    lines.push(`… diff truncated at ${maxLines} lines`);
  }

  return { addedLines, removedLines, snippet: lines.join("\n") };
}
