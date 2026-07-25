import Anthropic from "@anthropic-ai/sdk";
import type { TextDiff } from "./crawler";

export const SUMMARY_MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You summarise changes to a monitored web page for an operator watching a dashboard.

You receive a line diff of the page's visible text: lines prefixed "+" were added, lines prefixed "-" were removed.

Write 1-3 sentences in plain prose describing what actually changed in terms a reader of the page would recognise — prices, availability, headlines, policy wording, dates, contact details. Lead with the most consequential change.

Ignore noise: rotating timestamps, session or cart counters, view counts, CSRF tokens, ad slots, and cache-buster strings. If the diff is entirely that kind of noise, say so in one sentence.

Do not use markdown, bullet points, or a preamble. Do not speculate about causes.`;

export type SummaryResult = {
  summary: string;
  model: string | null;
};

/**
 * Deterministic stand-in so the pipeline still produces a readable log entry
 * when no ANTHROPIC_API_KEY is configured.
 */
function heuristicSummary(diff: TextDiff): string {
  const firstAdded = diff.snippet
    .split("\n")
    .find((line) => line.startsWith("+ "))
    ?.slice(2)
    .trim();

  const counts = `${diff.addedLines} line${diff.addedLines === 1 ? "" : "s"} added, ${diff.removedLines} removed`;
  return firstAdded
    ? `${counts}. New text begins: "${firstAdded.slice(0, 160)}"`
    : `${counts}.`;
}

export async function summariseDiff(
  url: string,
  diff: TextDiff,
): Promise<SummaryResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { summary: heuristicSummary(diff), model: null };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 1024,
      // Short, well-scoped summarisation — low effort keeps the per-check
      // cost and latency down without hurting quality here.
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Page: ${url}\nLines added: ${diff.addedLines}\nLines removed: ${diff.removedLines}\n\nDiff:\n${diff.snippet}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) return { summary: heuristicSummary(diff), model: null };
    return { summary: text, model: SUMMARY_MODEL };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return {
      summary: `${heuristicSummary(diff)} (LLM summary unavailable: ${reason})`,
      model: null,
    };
  }
}
