# NexaGrowth Backend — FastAPI + PostgreSQL

Local, free, no third-party backend service. Replaces the Supabase Edge Functions
and the Supabase-hosted database.

```
React/Vite (localhost:8080)
      │   VITE_API_URL=http://localhost:8000
      ▼
FastAPI (localhost:8000)      ← every secret lives here, and only here
      ▼
SQLAlchemy → local PostgreSQL (localhost:5432)
      ▼
Gemini API (direct, free tier)
```

**Security boundary:** the browser is given exactly one value — `VITE_API_URL` — and
it is public. `GEMINI_API_KEY` and `DATABASE_URL` never leave this folder's `.env`,
which is gitignored. Nothing here is bundled into the frontend.

---

## Migration status

| Phase | Scope | State |
|---|---|---|
| 2 | Config, DB connection, CORS, health, **ported lead-scoring engine** | ✅ done |
| 3 | **ORM models, Alembic migration, data API for the 5 tables** | ✅ done |
| 4 | **AI endpoints (report / action / strategist) + Gemini** | ✅ done |
| 5 | **Frontend rewired to FastAPI** | ✅ done |
| 6 | **Remove Supabase code + dependency** | ✅ done |
| 7 | **Final integration + end-to-end QA** | ✅ done |

**The migration is complete.** Supabase and Stripe are gone: no `supabase/` code in
the app, no `@supabase/supabase-js`, no Stripe dependency. Nothing was removed until
its replacement was proven working, which is why Phase 6 came after Phase 5.

---

## Setup

### 1. Create the database and apply the schema

The scoring engine and health checks run without PostgreSQL, but the data layer
(Phase 3 onward) needs a database. Create one:

```powershell
# Opens the psql shell; enter the password you chose when installing PostgreSQL.
psql -U postgres -h localhost

# then, at the postgres=# prompt:
CREATE DATABASE nexagrowth;
\q
```

**Finding your credentials — safely, without pasting anything into a chat:**

- **User:** almost always `postgres` (the superuser created at install time).
- **Port:** `5432` unless you changed it. Check with
  `Get-Service -Name "postgresql*"` in PowerShell to confirm the service is running.
- **Password:** the one you set during installation. It is deliberately not
  recoverable in plaintext — if pgAdmin connects without prompting, it is saved in
  `%APPDATA%\pgAdmin\pgadmin4.db`, but the simplest check is just running the `psql`
  command above and seeing whether it accepts the password you expect.
- **Forgotten?** Set `trust` temporarily for local connections in
  `C:\Program Files\PostgreSQL\<version>\data\pg_hba.conf`, restart the service,
  connect, run `ALTER USER postgres WITH PASSWORD 'newpassword';`, then change
  `pg_hba.conf` back to `scram-sha-256` and restart again.

### 2. Configure

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL`. **Type the password directly into that
file — never into a chat window.**

```
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/nexagrowth
```

If the password contains `@ : / # ?`, percent-encode it (`@` → `%40`, `#` → `%23`).

`GEMINI_API_KEY` is now **required** — the AI endpoints return a clear 500 without it.

### 3. Install and run

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Apply the schema, then start the server:

```powershell
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Then open **http://localhost:8000/docs** for the interactive API browser.

### 4. Verify

```powershell
curl http://localhost:8000/api/health
```

Healthy output:

```json
{
  "status": "ok",
  "api": "up",
  "database": {"configured": true, "connected": true, "detail": "connected"},
  "ai": {"configured": true, "model": "gemini-2.5-flash"}
}
```

`"ai": {"configured": false}` means `GEMINI_API_KEY` is unset — the database routes
still work, but every AI endpoint will return a clear 500. Note the health route
reports only whether a key is *present*; it never returns the key, its length, or a
prefix of it.

`"status": "degraded"` with `"connected": false` means PostgreSQL is unreachable —
the `detail` field explains why. **Credentials are stripped from that message**, so
it is safe to paste when asking for help.

---

## Tests

```powershell
cd backend
python -m pytest
```

**94 tests.** 79 need no database or network; the 15 integration tests in
`tests/test_data_api.py` run against real PostgreSQL and **skip automatically** if
`DATABASE_URL` is unreachable, so a fresh clone still passes.

The AI tests in `tests/test_marketing_api.py` replace only the Gemini backend (via
`ai_gateway.set_backends`) — **no network call and no API key needed**. Everything
else runs for real: all six stages, the JSON repair chain, Pydantic validation, the
NDJSON protocol and the SSE protocol.

The important ones are the **parity tests** in `tests/test_lead_scoring.py`. The
fixture `tests/golden_lead_scoring.json` was produced by *executing the original
TypeScript* (`supabase/functions/_shared/leadScoring.ts`) across inputs that
exercise every branch: each budget band, every industry category plus the unmatched
fallback, growth/maintenance/neutral goals, 0–N channel matches, urgent and
non-urgent phrasing, and completely empty input.

The Python port is asserted **byte-identical** — scores, tiers, the full breakdown
array, and every note string.

> If a parity test fails, the port has drifted from the engine the whole project
> rests on. Fix `app/services/lead_scoring.py` — do not edit the fixture.

Two details that would otherwise have caused silent drift, and are handled
explicitly in the port:

- **`Math.round` vs Python `round`.** JavaScript rounds halves up; Python uses
  banker's rounding (`round(2.5) == 2`). The port uses `math.floor(x + 0.5)`.
- **`toLocaleString()`.** JavaScript renders `8000` as `8,000` in budget notes;
  Python needs `f"{value:,}"` to match.

---

## Layout

```
backend/
  app/
    config.py               settings from .env, placeholder rejection
    db.py                   engine, session, credential-safe health probe
    models.py               5 ORM models — faithful port of the Supabase schema
    main.py                 FastAPI app, CORS, /api/health, /api/score-preview
    schemas.py              Pydantic request/response contracts
    routers/
      data.py               leads, reports, generated-content, orders
      marketing.py          the 3 AI endpoints (NDJSON + SSE streaming)
    services/
      lead_scoring.py       1:1 port of leadScoring.ts — no AI, fully deterministic
      pipeline_stages.py    1:1 port of pipelineStages.ts — 6 stages, prompts verbatim
      ai_gateway.py         Gemini only; timeouts, typed errors, swappable backend
  alembic/                  migration environment (reads DSN from .env, not alembic.ini)
  tests/
    test_lead_scoring.py    parity tests vs the TypeScript
    test_app_foundation.py  config, CORS, health, secret-leak guards
    test_data_api.py        real-PostgreSQL integration tests
    test_marketing_api.py   pipeline, NDJSON + SSE protocols, error mapping
  .env.example              placeholders only — safe to commit
  .env                      real secrets — GITIGNORED, never commit
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API, database and AI-configuration status |
| POST | `/api/score-preview` | Run the deterministic scoring engine on a business payload |
| POST | `/api/leads` | Contact form + newsletter signup |
| POST | `/api/reports` | Persist a generated strategy report |
| POST | `/api/generated-content` | Save one "Next Action" deliverable |
| POST | `/api/orders` | Create an order **and its line items** in one transaction |
| POST | `/api/marketing-report` | 6-stage pipeline, **NDJSON stream** |
| POST | `/api/marketing-action` | One deliverable → `{"text": ...}` |
| POST | `/api/marketing-strategist` | Advisor chat, **SSE UI-message stream** |
| GET | `/docs` | Interactive OpenAPI browser |

**Every data route is write-only, deliberately.** Nothing lists leads, reports,
orders or generated content. The old Supabase schema granted anonymous `SELECT` on
`marketing_reports` and `generated_content`, so any visitor could read every other
visitor's submitted business data. Not building the read route is the simplest
possible fix — adding one later should require an authentication decision first.

`/api/score-preview` accepts the same business shape the frontend already sends
(`companyName`, `industry`, `audience`, `budget`, `goal`, `currentChannels`) and
returns `{leadScore, confidence}` — no AI, no database, no network.


---

## Database schema

Applied by `alembic upgrade head` (revision `0001_initial_schema`). A faithful port
of the Supabase migrations — same column names, types, nullability, defaults, and
the `ON DELETE CASCADE` foreign key — verified column-by-column against a live
PostgreSQL 16 instance.

| Table | Columns |
|---|---|
| `leads` | id, created_at, name, email, website?, goals |
| `marketing_reports` | id, created_at, company_name, business_data (jsonb), report_data (jsonb) |
| `generated_content` | id, created_at, company_name, action_type, label, content |
| `orders` | id, created_at, customer_name, customer_email, company?, payment_method, total_amount, status |
| `order_items` | id, created_at, order_id → orders.id (cascade), plan_name, price |

`id` is `uuid DEFAULT gen_random_uuid()` (built into PostgreSQL 13+; on 12 or older
enable `pgcrypto`). `created_at` is `timestamptz DEFAULT now()`.

The Supabase original used `timezone('utc'::text, now())`, which looks like it pins
the value to UTC but does the opposite: it returns a *naive* timestamp, and a
`timestamptz` column reads a naive value as local time, applying the server's offset
a second time. Measured on PostgreSQL 16, the stored instant came out wrong by minus
the server's offset — 5 hours early under `Asia/Karachi`, 4 hours late under
`America/New_York` — and exactly right only on a UTC server, which is why neither
Supabase nor CI ever showed it. `now()` is already an absolute instant and needs no
conversion. Migration `0002_fix_created_at_default` corrects it; existing rows are
left untouched, since the offset in force when each was written is not recoverable.

**Row Level Security is not ported.** Those seven policies existed only because the
browser talked straight to PostgreSQL over PostgREST. FastAPI is now the access
boundary and does that job.

### One bug fixed in passing

`Checkout.tsx` calls `.insert().select().single()` on `orders`, but the table's only
policy was `FOR INSERT` — and PostgREST needs SELECT permission to return an inserted
row, so that call could never succeed. `POST /api/orders` returns the created order
with its items, in a single transaction, so checkout works properly for the first
time. It is also atomic: previously a failure on the second request could leave an
order with no line items.

### Rolling the schema back

```powershell
python -m alembic downgrade base   # drops all five tables
python -m alembic upgrade head     # recreates them
```


---

## AI endpoints

Ports of the three Supabase edge functions. **The wire formats are reproduced
exactly**, so Phase 5 only changes the base URL — no React component needs to change
how it parses a response.

### `POST /api/marketing-report` — the six-stage pipeline

Streams newline-delimited JSON, one event per stage transition:

```
{"type":"stage","stage":"business-analyst","status":"running"}
{"type":"stage","stage":"business-analyst","status":"done","durationMs":1}
...
{"type":"final","report":{...}}
```

A failing stage emits `{"type":"stage",...,"status":"failed","error":...}` followed by
`{"type":"error",...}`. Earlier stages keep their results — a stage-3 failure does not
discard stages 1 and 2. `PipelineStatus.tsx` already consumes exactly this format.

| # | Stage | AI? |
|---|---|---|
| 1 | Business Analyst | no — deterministic classification |
| 2 | Lead Scorer | no — deterministic scoring engine |
| 3 | Competitor Analyst | yes |
| 4 | Marketing Strategist | yes |
| 5 | Content Generator | yes |
| 6 | Campaign Assistant | yes |

**Four AI calls per report.** On the free tier's 250 requests/day that is roughly 62
reports; `GEMINI_MODEL=gemini-2.5-flash-lite` raises it to about 250.

Stages 1 and 2 never call the model, which is why a broken AI key produces a pipeline
that visibly completes two stages and then fails — a useful diagnostic signal.

### `POST /api/marketing-strategist` — the chat stream

Returns the AI SDK **UI message stream**, not plain SSE text: `text-start` /
`text-delta` / `text-end` frames wrapped in `start`/`finish`, terminated by
`data: [DONE]`, with the `x-vercel-ai-ui-message-stream: v1` header. `useChat` will
render nothing without that exact shape.

Both the `parts[]` array and the older flat `content` string are accepted for incoming
messages, so the endpoint does not depend on which shape the client sends.

A mid-stream failure is reported as an in-band `{"type":"error"}` frame — once the
stream is open the client can no longer see an HTTP status.

### Error mapping

The `429:` and `402:` message prefixes are preserved because the React app
special-cases them.

| Condition | Status |
|---|---|
| Bad input | 400 |
| Missing `GEMINI_API_KEY` | 500 |
| Provider rate limit | 429 |
| Quota exhausted | 402 |
| Any other provider failure | 502 |

### Gemini only

The Lovable AI Gateway path is **gone**, not disabled — it was billed against
workspace credits, and this backend is free and vendor-free by design. One provider,
called directly, with the key server-side.
