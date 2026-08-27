# Deploying NexaGrowth (free tier, no credit card)

The architecture does not change. Three free services, one per layer:

| Layer | Service | Why this one |
|---|---|---|
| React/Vite frontend | **Vercel** | static build, free Hobby plan |
| FastAPI backend | **Render** free web service | runs a long-lived ASGI process, which the strategy pipeline needs |
| PostgreSQL | **Neon** free tier | no card, and unlike Render's free Postgres it does not expire after 30 days |
| Gemini | Google AI Studio free tier | key stays server-side, on Render only |

**Why the backend is not on Vercel.** `/api/marketing-report` holds an NDJSON stream open
for the whole six-stage pipeline. Vercel's serverless functions are the wrong shape for a
long-lived stream, and moving to them would mean rewriting the pipeline. Render runs the
existing `uvicorn` process unchanged, so nothing in the app has to be redesigned.

## Order matters

Each step produces a URL the next step needs.

### 1. Database — Neon

1. Sign up at <https://neon.com> (GitHub login, no card).
2. Create a project. Copy the **pooled** connection string.
3. Change the scheme to the driver this project uses:
   `postgresql://…` → `postgresql+psycopg://…`
   Keep `?sslmode=require` on the end.

### 2. Backend — Render

1. Sign up at <https://render.com> with GitHub (no card on the free plan).
2. **New → Blueprint**, pick this repo. Render reads `render.yaml`.
3. It will prompt for the three values marked `sync: false`. Enter them in the
   dashboard — never in a file:
   - `DATABASE_URL` — the Neon string from step 1
   - `GEMINI_API_KEY` — from <https://aistudio.google.com/apikey>
   - `CORS_ORIGINS` — put `http://localhost:8080` for now; corrected in step 4
4. Deploy. `alembic upgrade head` runs automatically before the service goes live.
5. Confirm: `https://<your-service>.onrender.com/api/health` →
   `{"status":"ok","database":{"connected":true},"ai":{"configured":true}}`
6. Copy that base URL.

> The free plan spins the service down after 15 minutes idle and takes ~1 minute to
> wake. The first strategy generation after a quiet spell will be slow, not broken.

### 3. Frontend — Vercel

1. Sign up at <https://vercel.com> with GitHub.
2. **Add New → Project**, import this repo. `vercel.json` supplies the build settings
   and the SPA rewrite (without it, `/cart` and `/checkout` 404 on refresh).
3. Before the first deploy, add one Environment Variable:
   - `VITE_API_URL` = the Render base URL from step 2, **no trailing slash**
4. Deploy. Copy the resulting `https://<project>.vercel.app` URL.

> `VITE_API_URL` is inlined at **build** time, not read at runtime. Changing it later
> means triggering a redeploy, not just editing the variable.

### 4. Close the CORS loop

Back in Render → Environment, set `CORS_ORIGINS` to the exact Vercel origin:

```
https://your-project.vercel.app
```

Exact scheme and host, **no trailing slash**, comma-separated if you add more. Saving
this redeploys the service. Until it is done the browser will block every API call.

To keep Vercel preview deployments working, list them too:

```
https://your-project.vercel.app,http://localhost:8080
```

## Secrets

Nothing secret is committed. `.env` and `backend/.env` are gitignored; only
`.env.example` placeholders are tracked. `GEMINI_API_KEY` and `DATABASE_URL` exist only
in Render's dashboard. The browser bundle receives exactly one value, `VITE_API_URL`,
which is a public URL by design.

## Verify

```
curl https://<service>.onrender.com/api/health
```
then open the Vercel URL, launch the AI Employee panel, and generate one strategy.
