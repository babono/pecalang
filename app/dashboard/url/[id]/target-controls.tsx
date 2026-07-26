"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";

type Action = "check" | "toggle" | "delete";

export function TargetControls({
  targetId,
  active,
}: {
  targetId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which button is working. `pending` stays true through the fetch *and* the
  // router.refresh() re-render, so the spinner covers the whole round-trip.
  const [action, setAction] = useState<Action | null>(null);

  function checkNow() {
    setAction("check");
    startTransition(async () => {
      await fetch(`/api/urls/${targetId}/check`, { method: "POST" });
      router.refresh();
    });
  }

  function toggleActive() {
    setAction("toggle");
    startTransition(async () => {
      await fetch(`/api/urls/${targetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this watch and its entire crawl log?")) return;
    setAction("delete");
    startTransition(async () => {
      const response = await fetch(`/api/urls/${targetId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  const on = (a: Action) => pending && action === a;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={checkNow}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-cta px-4 py-2 text-sm text-white transition-colors hover:bg-cta-strong disabled:opacity-60"
      >
        {on("check") ? <Spinner /> : null}
        {on("check") ? "Checking…" : "Check now"}
      </button>
      <button
        type="button"
        onClick={toggleActive}
        disabled={pending}
        className="inline-flex items-center gap-2 border border-cream/30 px-4 py-2 text-sm text-cream transition-colors hover:border-cream hover:bg-teal-line/40 disabled:opacity-60"
      >
        {on("toggle") ? <Spinner /> : null}
        {active ? "Pause" : "Resume"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-2 text-sm text-cream-muted underline decoration-teal-line underline-offset-4 transition-colors hover:text-cream disabled:opacity-60"
      >
        {on("delete") ? <Spinner className="h-3.5 w-3.5" /> : null}
        {on("delete") ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
