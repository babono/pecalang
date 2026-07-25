import { CronExpressionParser } from "cron-parser";

export const FREQUENCIES = [
  {
    value: "every_15_minutes",
    label: "Every 15 minutes",
    cron: "*/15 * * * *",
    hint: "For pages that move fast — status pages, ticket drops.",
  },
  {
    value: "hourly",
    label: "Hourly",
    cron: "0 * * * *",
    hint: "On the hour, every hour.",
  },
  {
    value: "daily",
    label: "Daily",
    cron: "0 9 * * *",
    hint: "Once each morning at 09:00.",
  },
  {
    value: "weekly",
    label: "Weekly",
    cron: "0 9 * * 1",
    hint: "Monday mornings at 09:00.",
  },
] as const;

export type FrequencyValue = (typeof FREQUENCIES)[number]["value"];

export function cronForFrequency(value: string): string | null {
  return FREQUENCIES.find((f) => f.value === value)?.cron ?? null;
}

/** Reverse lookup so the detail page can print "Hourly" instead of "0 * * * *". */
export function describeCron(expression: string): string {
  return (
    FREQUENCIES.find((f) => f.cron === expression)?.label ?? expression
  );
}

export function isValidCron(expression: string): boolean {
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    return false;
  }
}

export function nextRun(expression: string, from: Date = new Date()): Date {
  return CronExpressionParser.parse(expression, { currentDate: from })
    .next()
    .toDate();
}

export function formatRelative(date: Date | null | undefined): string {
  if (!date) return "—";
  const deltaMs = date.getTime() - Date.now();
  const past = deltaMs < 0;
  const minutes = Math.round(Math.abs(deltaMs) / 60_000);

  if (minutes < 1) return past ? "just now" : "in under a minute";
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`;

  const days = Math.round(hours / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}
