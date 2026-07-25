/**
 * Shared secret for the machine-to-machine routes (dispatcher, worker).
 * When CRON_SECRET is unset the routes are open, which is what you want on a
 * local dev box and what you must not ship.
 */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export function cronHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  return secret
    ? { "content-type": "application/json", "x-cron-secret": secret }
    : { "content-type": "application/json" };
}
