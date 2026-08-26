# Local Setup

> **Superseded.** This project no longer uses Supabase. The backend is a local
> FastAPI service with PostgreSQL, and its setup guide lives in
> [`backend/README.md`](backend/README.md).

Two processes, both free and both on your machine:

```
React/Vite  (localhost:8080)
      │   VITE_API_URL=http://localhost:8000
      ▼
FastAPI     (localhost:8000)   ← Gemini key + DB credentials live here only
      ▼
PostgreSQL  (localhost:5432)
```

## 1. Backend

See [`backend/README.md`](backend/README.md) for the full guide, including how to
find your PostgreSQL credentials on Windows.

```bash
psql -U postgres -h localhost -c "CREATE DATABASE nexagrowth;"

cd backend
cp .env.example .env          # set DATABASE_URL and GEMINI_API_KEY inside
python -m venv .venv
.venv\Scripts\activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/health` → `"status": "ok"` with
`"database": {"connected": true}`.

Get a free Gemini key (no credit card) at <https://aistudio.google.com/apikey>.
**Do not enable billing on that project** — it removes the free tier.

## 2. Frontend

```bash
npm install
npm run dev        # http://localhost:8080
```

The frontend needs only `VITE_API_URL` (default `http://localhost:8000`), which is
public. No key of any kind belongs in a `VITE_` variable — they are inlined into the
JavaScript bundle at build time.

## 3. Tests

```bash
npm run test                 # frontend: 11 tests
cd backend && python -m pytest   # backend: 94 tests
```

Backend integration tests skip automatically when PostgreSQL is unreachable, so a
fresh clone still passes.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Could not reach the API at http://localhost:8000" | Backend not running — start `uvicorn` |
| `/api/health` shows `"connected": false` | PostgreSQL not running, or `DATABASE_URL` wrong. The `detail` field explains, with credentials stripped |
| "AI service is not configured" | `GEMINI_API_KEY` missing from `backend/.env` |
| A model error naming `gemini-2.5-flash` | That model id is unavailable on your key. Set `GEMINI_MODEL` in `backend/.env` — no code change needed |
