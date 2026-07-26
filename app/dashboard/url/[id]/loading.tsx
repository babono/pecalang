import { Spinner } from "@/components/spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-cream-muted">
      <Spinner className="h-6 w-6" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
