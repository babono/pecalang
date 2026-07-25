"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Manual tick of the dispatcher, so the schedule can be exercised without
 * waiting for a real cron to fire.
 */
export function DispatchButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/cron/dispatch", { method: "POST" });
      const payload = await response.json().catch(() => null);
      setResult(
        response.ok
          ? `${payload?.due ?? 0} due`
          : (payload?.error ?? "Dispatch failed"),
      );
      router.refresh();
    } catch {
      setResult("Dispatch failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result ? (
        <span className="text-xs text-cream-muted">{result}</span>
      ) : null}
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="border border-cream/30 px-4 py-2 text-sm text-cream transition-colors hover:border-cream hover:bg-teal-line/40 disabled:opacity-50"
      >
        {pending ? "Running…" : "Run dispatcher"}
      </button>
    </div>
  );
}
