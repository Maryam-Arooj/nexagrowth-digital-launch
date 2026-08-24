# Run NexaGrowth locally — zero Lovable cost

This project no longer needs a Lovable subscription. The AI Employee (marketing-report,
marketing-action, marketing-strategist) now uses a **free Google Gemini API key** instead of
Lovable's paid AI Gateway — code change is in `supabase/functions/_shared/ai-gateway.ts`
(`getAiModel()`), which picks `GEMINI_API_KEY` automatically when `LOVABLE_API_KEY` isn't set.

Everything below runs on your own machine. Nothing touches Lovable or costs money.

## Prerequisites

- **Node.js 18+** — you already have this if `npm run dev` has worked before.
- **Docker Desktop** — required to run Supabase Edge Functions locally (the functions run in
  a Deno container). Download: https://www.docker.com/products/docker-desktop/
- **Supabase CLI** — install with `npm install -g supabase` (or see
  https://supabase.com/docs/guides/cli/getting-started for other install methods).

No Supabase account/login and no Lovable account are needed for local-only use.

## 1. Get a free Gemini API key

Go to https://aistudio.google.com/apikey, sign in with any Google account, click
"Create API key". No credit card required. The free tier is generous enough for
personal testing (per-minute/per-day request limits, but no cost).

## 2. Set the local Edge Function secret

```
cd supabase/functions
copy .env.example .env      (Windows)   —or—   cp .env.example .env   (Mac/Linux)
```

Open `supabase/functions/.env` and paste your key:

```
GEMINI_API_KEY=your-key-here
```

Leave `LOVABLE_API_KEY` blank — the app only uses it if it's set.

## 3. Start the Edge Functions locally

From the project root, with Docker Desktop running:

```
supabase functions serve --env-file ./supabase/functions/.env --no-verify-jwt
```

Leave this running in its own terminal. It serves `marketing-report`, `marketing-action`,
and `marketing-strategist` at `http://127.0.0.1:54321/functions/v1/<name>`.

`--no-verify-jwt` is needed because we're not running a full local Supabase auth server —
without it, function calls would be rejected as unauthorized.

## 4. Point the frontend at local functions

```
copy .env.local.example .env.local      (Windows)   —or—   cp .env.local.example .env.local
```

`.env.local` overrides the live Lovable Cloud URL in `.env` and is gitignored, so your
real `.env` (pointing at the live project) stays untouched.

## 5. Run the site

In a second terminal, from the project root:

```
npm install
npm run dev
```

Open **http://localhost:8080**. Click "Get Free Audit" / "Consult with AI Employee",
fill in a business, and generate a report — it now calls your local Edge Functions,
which call Gemini directly with your free key.

## Optional: persist reports & saved content (still free)

The app writes marketing reports, leads, and saved "Next Action" content to Postgres.
For those saves to actually land somewhere (instead of just failing silently), run the
**full** local Supabase stack instead of bare `functions serve`:

```
supabase start
```

This runs local Postgres, auto-applies everything in `supabase/migrations/`, and serves
functions all together on the same port (54321). Get your local secrets/URLs with
`supabase status`, put `GEMINI_API_KEY` into `supabase/functions/.env` as before, and
you don't need the separate `functions serve` command — `supabase start` already serves
them (pass `--env-file` isn't available here, so instead run
`supabase secrets set --env-file ./supabase/functions/.env` once after `supabase start`).
Stop everything with `supabase stop` when done. All of this runs on your own machine's
Docker — still $0.

## Notes

- `lead-qualification` is a function that only exists on the **live** Lovable project;
  this local copy's `MarketingStrategist.tsx` never calls it, so there's no gap running
  locally — lead score/recommended plan come from `marketing-report` itself.
- Model used: `gemini-2.0-flash` (fast, free-tier friendly). To change it, edit the
  `google("gemini-2.0-flash")` line in `supabase/functions/_shared/ai-gateway.ts`.
- If you ever get a Lovable subscription again, just set `LOVABLE_API_KEY` instead —
  no code changes needed, it's checked first automatically.

## Troubleshooting

- **"AI service is not configured on the server"** — `supabase functions serve` wasn't
  started with `--env-file ./supabase/functions/.env`, or the key is empty/misspelled.
- **CORS / network errors in the browser console** — make sure `supabase functions serve`
  is still running in its terminal, and `.env.local` has `VITE_SUPABASE_URL=http://127.0.0.1:54321`.
- **Docker errors** — Docker Desktop must be running before `supabase functions serve`.
- **Port 54321 or 8080 already in use** — stop whatever else is using it, or change the
  port in `vite.config.ts` (frontend) — the functions port is fixed by the Supabase CLI.
