"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [pending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Sign in failed.");
      return;
    }

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
        disabled={pending}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium tracking-wide text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
