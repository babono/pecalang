# Pecalang — page watch

Watch any URL on a schedule. When the visible text of the page changes, an LLM
writes a plain-language account of *what* changed. Built on Next.js 16 (App
Router), TypeScript, Tailwind v4, and Drizzle.

## Run locally

```bash
npm install
npm run dev
```

With no configuration it uses an embedded PGlite database and heuristic change
summaries. Sign in with the seeded demo account:

- **demo@pecalang.dev** / **watchtower** (pre-filled on the login page)

Copy `.env.example` to `.env.local` to add a real database or an LLM key.

## LLM provider

The summariser picks a provider by which key is present, in order:

1. `DEEPSEEK_API_KEY` — DeepSeek (OpenAI-compatible), model `deepseek-chat`
2. `ANTHROPIC_API_KEY` — Claude, model `claude-opus-4-8`
3. neither — a deterministic heuristic summary

## Deploying to Vercel

1. **Database.** Provision free Postgres (Neon recommended, or Supabase) and set
   `DATABASE_URL` to its **pooled** connection string. PGlite is dev-only and
   won't persist on Vercel.
2. **Env vars** in the Vercel project:
   - `DATABASE_URL` (required)
   - `SESSION_SECRET` (required — the app throws without it in production)
   - `CRON_SECRET` (required — the cron/worker routes are locked without it;
     Vercel Cron sends it automatically)
   - one of `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` (optional)
3. **Deploy.** `vercel.json` registers an hourly cron on `/api/cron/dispatch`.

### Scheduling on the free tier

The per-URL frequencies (15 min / hourly / daily / weekly) are only as fine as
how often the dispatcher actually runs. **Vercel Hobby cron fires only ~once a
day**, so a "15-minute" URL would effectively be checked daily. Pick a free
external scheduler that calls `POST /api/cron/dispatch` more often:

- **GitHub Actions (recommended, already wired up).** `.github/workflows/dispatch.yml`
  runs every 15 minutes. In the repo's **Settings → Secrets and variables → Actions**:
  - Variable `DISPATCH_URL` = `https://<your-app>.vercel.app/api/cron/dispatch`
  - Secret `CRON_SECRET` = the same value set in Vercel

  Runs are best-effort and can be delayed a few minutes — fine for
  page-watching. Trigger it manually from the Actions tab to test.

- **cron-job.org** — more punctual (down to 1 min). Point it at the same URL
  with header `Authorization: Bearer <CRON_SECRET>`.

- **Vercel Pro** — just set the `vercel.json` schedule to `*/15 * * * *`.

Any external scheduler makes `vercel.json` optional; keep it only if you want a
daily backup tick.

The dispatcher processes up to 8 due targets per tick (see `MAX_PER_TICK`) to
stay within the function time limit.
