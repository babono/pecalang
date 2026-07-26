import type { TextDiff } from "./crawler";

/**
 * Change summaries can come from DeepSeek (OpenAI-compatible), Anthropic, or a
 * deterministic heuristic — whichever is configured, in that order. Set one of
 * DEEPSEEK_API_KEY or ANTHROPIC_API_KEY; with neither, the heuristic is used.
 */
const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

const LLM_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You summarise changes to a monitored web page for an operator watching a dashboard.

You receive a line diff of the page's visible text: lines prefixed "+" were added, lines prefixed "-" were removed.

Write 1-3 sentences in plain prose describing what actually changed in terms a reader of the page would recognise — prices, availability, headlines, policy wording, dates, contact details. Lead with the most consequential change.

Ignore noise: rotating timestamps, session or cart counters, view counts, CSRF tokens, ad slots, and cache-buster strings. If the diff is entirely that kind of noise, say so in one sentence.

Do not use markdown, bullet points, or a preamble. Do not speculate about causes.`;

export type SummaryResult = {
  summary: string;
  model: string | null;
};

function userPrompt(url: string, diff: TextDiff): string {
  return `Page: ${url}\nLines added: ${diff.addedLines}\nLines removed: ${diff.removedLines}\n\nDiff:\n${diff.snippet}`;
}

/**
 * Deterministic stand-in so the pipeline still produces a readable log entry
 * when no LLM is configured (or a call fails).
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

/** DeepSeek / any OpenAI-compatible chat-completions endpoint. */
async function callDeepSeek(
  url: string,
  diff: TextDiff,
): Promise<SummaryResult> {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 512,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(url, diff) },
      ],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek responded ${response.status}`);
  }

  const payload = await response.json();
  const text: string = payload?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("DeepSeek returned no content");
  return { summary: text, model: DEEPSEEK_MODEL };
}

async function callAnthropic(
  url: string,
  diff: TextDiff,
): Promise<SummaryResult> {
  // Imported lazily so the SDK isn't loaded when DeepSeek / heuristic is used.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    // Short, well-scoped summarisation — low effort keeps cost and latency down.
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(url, diff) }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) throw new Error("Anthropic returned no text");
  return { summary: text, model: ANTHROPIC_MODEL };
}

export async function summariseDiff(
  url: string,
  diff: TextDiff,
): Promise<SummaryResult> {
  const provider = process.env.DEEPSEEK_API_KEY
    ? callDeepSeek
    : process.env.ANTHROPIC_API_KEY
      ? callAnthropic
      : null;

  if (!provider) return { summary: heuristicSummary(diff), model: null };

  try {
    return await provider(url, diff);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return {
      summary: `${heuristicSummary(diff)} (LLM summary unavailable: ${reason})`,
      model: null,
    };
  }
}
