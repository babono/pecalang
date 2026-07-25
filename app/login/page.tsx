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
          <p className="eyebrow text-cream-muted">Est. 2026</p>
          <h1 className="mt-3 text-4xl tracking-tight text-cream">Pecalang</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-cream-muted">
            A watchman for your pages. Give it a URL and a schedule; it tells you
            what changed, in words.
          </p>
        </div>

        <div className="border border-teal-line bg-paper-raised p-8 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)]">
          {/* useSearchParams reads the ?next= redirect target. */}
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm
              defaultEmail={DEMO_EMAIL}
              defaultPassword={DEMO_PASSWORD}
            />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-cream-muted">
          Demo credentials are filled in for you. This build ships a single
          seeded account.
        </p>
      </div>
    </main>
  );
}
