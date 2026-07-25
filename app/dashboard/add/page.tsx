import type { Metadata } from "next";
import { FREQUENCIES } from "@/lib/schedule";
import { AddUrlForm } from "./add-url-form";

export const metadata: Metadata = { title: "Add a URL — Pecalang" };

export default function AddUrlPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="border-b border-teal-line pb-6">
        <p className="eyebrow text-cream-muted">New watch</p>
        <h1 className="mt-2 text-3xl tracking-tight text-cream">
          Put a page under watch
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-muted">
          Any public http(s) URL will do. The first check records a baseline of
          the page&rsquo;s visible text; each later check compares against it and
          writes up the difference.
        </p>
      </header>

      <AddUrlForm frequencies={FREQUENCIES.map((f) => ({ ...f }))} />
    </div>
  );
}
