"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TargetControls({
  targetId,
  active,
}: {
  targetId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"check" | "toggle" | "delete" | null>(null);

  async function checkNow() {
    setBusy("check");
    try {
      await fetch(`/api/urls/${targetId}/check`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive() {
    setBusy("toggle");
    try {
      await fetch(`/api/urls/${targetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete this watch and its entire crawl log?")) return;
    setBusy("delete");
    try {
      const response = await fetch(`/api/urls/${targetId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={checkNow}
        disabled={busy !== null}
        className="bg-ink px-4 py-2 text-sm text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy === "check" ? "Checking…" : "Check now"}
      </button>
      <button
        type="button"
        onClick={toggleActive}
        disabled={busy !== null}
        className="border border-rule-strong px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
      >
        {active ? "Pause" : "Resume"}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy !== null}
        className="text-sm text-ink-faint underline decoration-rule-strong underline-offset-4 transition-colors hover:text-accent disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
