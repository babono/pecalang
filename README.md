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
3. **Deploy.** `vercel.json` registers a daily cron (`0 8 * * *`) on
   `/api/cron/dispatch`, which is what the Vercel free tier supports.

### Scheduling cadence

Checks run when the cron ticks. On the current setup that's **once a day**, so
the per-URL frequency options (15 min / hourly / weekly) act as a *floor* — a
"daily" or slower URL runs on schedule, while faster ones are effectively capped
at daily. Each daily tick processes up to 8 due targets (`MAX_PER_TICK`) to stay
within the function time limit.

If you later want finer or higher-volume checking:

- **cron-job.org** (free) → `POST /api/cron/dispatch` every 15 min with header
  `Authorization: Bearer <CRON_SECRET>`.
- **Vercel Pro** → change the `vercel.json` schedule to `*/15 * * * *`.
