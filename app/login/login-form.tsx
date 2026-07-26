"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/spinner";

export function LoginForm({
  defaultEmail,
  defaultPassword,
}: {
  defaultEmail: string;
  defaultPassword: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  // Covers both the login request and the redirect that follows it.
  const busy = submitting || pending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Sign in failed.");
      setSubmitting(false);
      return;
    }

    // Leave `submitting` true — the redirect below unmounts this form.
    startTransition(() => {
      router.replace(params.get("next") ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="eyebrow block">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <div>
        <label htmlFor="password" className="eyebrow block">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-sm text-ink"
        />
      </div>

      {error ? (
        <p className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 bg-cta px-4 py-2.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cta-strong disabled:opacity-60"
      >
        {busy ? <Spinner /> : null}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
