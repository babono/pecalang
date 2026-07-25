import { STATUS_LABEL, type CheckStatus } from "@/lib/monitor";

const TONE: Record<CheckStatus, string> = {
  no_change: "border-stable/30 bg-stable-soft text-stable",
  change_detected: "border-alarm/30 bg-alarm-soft text-alarm",
  error: "border-accent/30 bg-accent-soft text-accent",
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center border border-rule px-2 py-0.5 text-[11px] tracking-wide text-ink-faint">
        Awaiting first check
      </span>
    );
  }

  const known = (status in STATUS_LABEL ? status : "error") as CheckStatus;

  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium tracking-wide ${TONE[known]}`}
    >
      {STATUS_LABEL[known]}
    </span>
  );
}
