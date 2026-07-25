"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Frequency = {
  value: string;
  label: string;
  cron: string;
  hint: string;
};

export function AddUrlForm({ frequencies }: { frequencies: Frequency[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selector, setSelector] = useState("");
  const [frequency, setFrequency] = useState(frequencies[1]?.value ?? frequencies[0].value);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = frequencies.find((f) => f.value === frequency);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/urls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, label, selector, frequency }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Could not add that URL.");
        return;
      }

      router.push(`/dashboard/url/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 border border-rule bg-paper-raised p-8 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)]"
    >
      <div>
        <label htmlFor="url" className="eyebrow block">
          URL to watch
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://example.com/pricing"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="mt-2 w-full border border-rule bg-paper px-3 py-2 font-[family-name:var(--font-mono)] text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <div>
        <label htmlFor="label" className="eyebrow block">
          Label <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="label"
          type="text"
          placeholder="Competitor pricing"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <fieldset>
        <legend className="eyebrow">Check how often</legend>
        <div className="mt-3 grid gap-px border border-rule bg-rule sm:grid-cols-2">
          {frequencies.map((option) => {
            const active = option.value === frequency;
            return (
              <label
                key={option.value}
                className={`cursor-pointer px-4 py-4 transition-colors ${
                  active ? "bg-stable-soft" : "bg-paper-raised hover:bg-paper"
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={active}
                  onChange={() => setFrequency(option.value)}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-medium text-ink">
                    {option.label}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-ink-faint">
                    {option.cron}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                  {option.hint}
                </span>
              </label>
            );
          })}
        </div>
        {selected ? (
          <p className="mt-3 text-xs text-ink-faint">
            Stored as cron{" "}
            <code className="font-[family-name:var(--font-mono)] text-ink-muted">
              {selected.cron}
            </code>
            . The dispatcher compares this against the current time on every tick.
          </p>
        ) : null}
      </fieldset>

      <div>
        <label htmlFor="selector" className="eyebrow block">
          CSS selector{" "}
          <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="selector"
          type="text"
          placeholder="main, #content, .price-table"
          value={selector}
          onChange={(event) => setSelector(event.target.value)}
          className="mt-2 w-full border border-rule bg-paper px-3 py-2 font-[family-name:var(--font-mono)] text-sm text-ink placeholder:text-ink-faint"
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Narrow the watch to one region of the page. Leave blank to watch the
          whole body.
        </p>
      </div>

      {error ? (
        <p className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={pending}
          className="bg-cta px-5 py-2.5 text-sm text-white transition-colors hover:bg-cta-strong disabled:opacity-50"
        >
          {pending ? "Capturing baseline…" : "Start watching"}
        </button>
        <p className="text-xs text-ink-faint">
          The page is fetched once now to record the baseline.
        </p>
      </div>
    </form>
  );
}
