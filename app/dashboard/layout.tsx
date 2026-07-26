import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-teal-line bg-teal-deep">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-cream"
          >
            <Logo className="h-6 w-6" />
            <span className="text-xl font-semibold tracking-tight">
              Pecalang
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-cream-muted transition-colors hover:text-cream"
            >
              Watchlist
            </Link>
            <Link
              href="/dashboard/add"
              className="text-sm text-cream-muted transition-colors hover:text-cream"
            >
              Add a URL
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-xs text-cream-muted sm:inline">
              {user.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="text-xs text-cream-muted underline decoration-teal-line underline-offset-4 transition-colors hover:text-cream"
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

      <footer className="border-t border-teal-line bg-teal-deep px-6 py-6">
        <p className="mx-auto flex max-w-5xl items-center gap-2 text-xs text-cream-muted">
          <Logo className="h-4 w-4" />
          <span>
            Pecalang — made by <span className="text-cream">babono</span> with
            AI · {new Date().getFullYear()}
          </span>
        </p>
      </footer>
    </div>
  );
}
