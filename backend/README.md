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
| 3 | ORM models + Alembic migration for the 5 tables | pending |
| 4 | AI endpoints (report / action / strategist) | pending |
| 5 | Frontend rewiring | pending |
| 6 | Remove Supabase code + dependency | pending |
| 7 | End-to-end testing | pending |

Supabase is still in place and untouched — by design. Nothing is removed until its
replacement is proven working (Phase 6).

---

## Setup

### 1. Create the database

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

`GEMINI_API_KEY` can stay empty until Phase 4.

### 3. Install and run

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

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
  "ai": {"configured": false, "model": "gemini-2.5-flash"}
}
```

`"status": "degraded"` with `"connected": false` means PostgreSQL is unreachable —
the `detail` field explains why. **Credentials are stripped from that message**, so
it is safe to paste when asking for help.

---

## Tests

```powershell
cd backend
python -m pytest
```

**52 tests, no database and no network required.**

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
    models.py               declarative Base (tables land in Phase 3)
    main.py                 FastAPI app, CORS, /api/health, /api/score-preview
    routers/                (Phase 3–4)
    services/
      lead_scoring.py       1:1 port of leadScoring.ts — no AI, fully deterministic
  alembic/                  migration environment (reads DSN from .env, not alembic.ini)
  tests/
    test_lead_scoring.py    parity tests vs the TypeScript
    test_app_foundation.py  config, CORS, health, secret-leak guards
  .env.example              placeholders only — safe to commit
  .env                      real secrets — GITIGNORED, never commit
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API, database and AI-configuration status |
| POST | `/api/score-preview` | Run the deterministic scoring engine on a business payload |
| GET | `/docs` | Interactive OpenAPI browser |

`/api/score-preview` accepts the same business shape the frontend already sends
(`companyName`, `industry`, `audience`, `budget`, `goal`, `currentChannels`) and
returns `{leadScore, confidence}` — no AI, no database, no network.
