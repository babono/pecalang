import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-display)] text-xl tracking-tight text-ink"
          >
            Pecalang
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Watchlist
            </Link>
            <Link
              href="/dashboard/add"
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Add a URL
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-xs text-ink-faint sm:inline">
              {user.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="text-xs text-ink-muted underline decoration-rule-strong underline-offset-4 transition-colors hover:text-accent"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-rule px-6 py-6">
        <p className="mx-auto max-w-5xl text-xs text-ink-faint">
          Checks run when the dispatcher ticks —{" "}
          <code className="font-[family-name:var(--font-mono)]">
            POST /api/cron/dispatch
          </code>
          .
        </p>
      </footer>
    </div>
  );
}
