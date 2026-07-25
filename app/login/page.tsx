import { Suspense } from "react";
import type { Metadata } from "next";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/db";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in — Pecalang" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="eyebrow">Est. 2026</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-ink">
            Pecalang
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            A watchman for your pages. Give it a URL and a schedule; it tells you
            what changed, in words.
          </p>
        </div>

        <div className="border border-rule bg-paper-raised p-8 shadow-[0_1px_0_0_var(--color-rule)]">
          {/* useSearchParams reads the ?next= redirect target. */}
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm
              defaultEmail={DEMO_EMAIL}
              defaultPassword={DEMO_PASSWORD}
            />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
          Demo credentials are filled in for you. This build ships a single
          seeded account.
        </p>
      </div>
    </main>
  );
}
