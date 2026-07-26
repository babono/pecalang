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

### Scheduling with trigger.dev (recommended)

**Vercel Hobby cron fires only ~once a day**, so the per-URL frequencies
(15 min / hourly / daily / weekly) can't be honoured by Vercel cron alone. The
project ships a [trigger.dev](https://trigger.dev) setup that runs the checks on
trigger.dev's own infrastructure — no serverless time limit, per-target retries,
and a real dashboard.

Files: `trigger.config.ts` and `trigger/checks.ts`.
- `dispatch-due-checks` — a scheduled task (every 15 min) that finds due targets
  and fans each out to its own run.
- `check-target` — runs one target's check (the same fetch → hash → diff → LLM →
  log pipeline the app uses), with up to 3 retries.

Setup:

1. `npx trigger.dev@latest login`
2. Create a project in the dashboard; set `TRIGGER_PROJECT_REF` (or edit the
   placeholder in `trigger.config.ts`).
3. In the trigger.dev project's **environment variables**, set `DATABASE_URL`
   (the same Postgres) and your LLM key (`DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY`).
   The scheduling secrets (`SESSION_SECRET`, `CRON_SECRET`) are **not** needed
   here — trigger.dev calls the pipeline directly, not the HTTP routes.
4. `npx trigger.dev@latest dev` to test locally, then `npx trigger.dev@latest deploy`.

With trigger.dev handling the schedule, `vercel.json` and the `/api/cron/dispatch`
route are optional — keep the route for manual/`curl` triggering if you like.

### Other free schedulers

If you'd rather keep the logic in the Vercel app and just ping it on a timer:

- **cron-job.org** (free, down to 1 min) → `POST /api/cron/dispatch` with header
  `Authorization: Bearer <CRON_SECRET>`.
- **Vercel Pro** → set the `vercel.json` schedule to `*/15 * * * *`.

The HTTP dispatcher processes up to 8 due targets per tick (`MAX_PER_TICK`) to
stay within the function time limit; trigger.dev has no such cap.
