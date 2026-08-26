# NexaGrowth Digital

NexaGrowth Digital is a marketing‑agency website concept that pairs a conventional service/pricing landing page with an **AI Employee** — an in‑browser AI marketing consultant that interviews a visitor about their business and generates a full, data‑grounded marketing strategy report on the spot, complete with a deterministic lead score, ready‑to‑use ad copy/content, and a path straight into checkout.

> **Note on the marketing copy:** stat panels on the landing page (client counts, ROI, revenue generated, retention rate) are explicitly labeled `Demo Data` / `illustrative` in the UI. They are placeholder content for the template, not real agency figures — replace them with real numbers before using this as a live business site.

---

## 1. The idea (project theory)

Most agency websites are static brochures: a visitor reads about services, maybe fills out a contact form, and waits days for a human to follow up. NexaGrowth Digital's core bet is that the **first strategy conversation** — the thing that normally requires a salesperson — can be automated well enough to (a) qualify the lead, (b) give the visitor something genuinely useful for free, and (c) point them at the right paid plan, all inside a single chat‑like widget.

That idea is implemented as three cooperating layers:

1. **A trust‑building marketing site** (services, process, case studies, team, testimonials, FAQ, pricing) — the standard agency content that makes the AI Employee's advice feel credible.
2. **The AI Employee** — a guided intake form → an AI‑generated strategy report → on‑demand content generation → a live chat advisor, all scoped to the business the visitor described.
3. **A self‑serve purchase path** — pricing plans flow into a cart, a checkout page, and either a real Stripe subscription or a manually‑confirmed payment method, so a convinced visitor can become a paying customer without ever talking to a human.

A deliberate design principle threads through the AI layer: **numbers the business will make decisions on must be explainable, not AI‑invented.** The lead score, the AI confidence score, and which marketing channels are even allowed to be recommended are all computed with plain rule‑based logic (see [`backend/app/services/lead_scoring.py`](backend/app/services/lead_scoring.py)) — the LLM only writes the narrative, creative, and structured‑content parts of the report. This keeps the tool honest: it can't claim a lead is "hot" or a recommendation is "92% confident" for reasons nobody can point to.

## 2. What's actually in the app

### 2.1 Marketing site (`/`)

A single scrolling page (`src/pages/Index.tsx`) built from independent section components, in order: Navbar → Hero → TrustBar → About → Services → Process → CaseStudies → WhyChooseUs → Team → Pricing → Testimonials → FAQ → CTASection → Contact → Footer. Navigation links are hash anchors into these sections (`/#services`, `/#pricing`, etc.).

### 2.2 AI Employee (floating widget, available on every page)

A modal opened from a floating launcher button (bottom‑right), implemented in [`src/components/MarketingStrategist.tsx`](src/components/MarketingStrategist.tsx). The flow:

1. **Intake** — visitor enters company name, industry, target audience, monthly budget, 90‑day goal, and current marketing channels.
2. **Report generation** — the intake is sent to the `marketing-report` edge function, which:
   - classifies the business into a category (e‑commerce, SaaS, local, agency, other) and restricts which marketing channels the AI is allowed to suggest, so recommendations always fit the business type;
   - computes a **0–100 lead score** (Cold/Warm/Hot/Priority tier) and an **AI confidence score**, both deterministically from the submitted fields — never from the model;
   - asks the LLM for the rest: executive summary, SWOT, competitor analysis, channel strategy, budget allocation, a 30‑day action plan, a 90‑day roadmap, SEO keywords, content ideas, KPI targets, a recommended pricing plan (must be one of the real plans on the site), risk analysis, and final recommendations — validated against a strict schema before it's ever shown to the user.
3. **Report view** — a rich, collapsible report UI with the lead score, confidence meter, KPI tiles, and every section above; downloadable as a PDF.
4. **Next actions** — one click generates a specific deliverable grounded in that business's report: Google Ads copy, Facebook/Meta ad copy, Instagram captions, an SEO keyword set, a 30‑day content calendar, or a 5‑email nurture sequence. Results can be edited, copied, regenerated, or saved.
5. **Chat with advisor** — an open‑ended, streamed conversation with the same AI persona, aware of the business context and the report already generated.

The report and every intake are persisted to PostgreSQL via the backend (`marketing_reports` table) and mirrored in the browser's `localStorage`, so closing and reopening the widget restores the last session instead of starting over.

### 2.3 Pricing → Cart → Checkout → Payment

Three plans are offered (Starter $1,499/mo, Growth $3,499/mo, Enterprise $6,999/mo — "Contact Sales"), with an annual‑billing toggle (20% off). Adding a plan puts it in an in‑memory cart (`CartContext`); `/cart` reviews it; `/checkout` collects contact info and a payment method:

All three payment options (credit card, bank transfer, digital wallet) record the order and its line items in PostgreSQL as `pending` in a single atomic request, then send the visitor to a `/thank-you` confirmation page. **There is no payment processor** — this project takes no real money.

There is no user authentication anywhere in the app. Every write (leads, reports, orders, generated content) goes through the FastAPI backend, which is the access boundary — the browser never touches PostgreSQL directly. The data endpoints are write‑only by design: nothing lists other visitors' reports or leads.

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript, built with Vite |
| Routing | React Router (lazy‑loaded routes) |
| UI components | shadcn/ui (Radix UI primitives) + Tailwind CSS |
| Animation | Framer Motion |
| Forms/validation | React Hook Form + Zod |
| Data fetching / cache | TanStack Query |
| Backend | FastAPI (Python 3.13) + SQLAlchemy 2 + Alembic |
| Database | PostgreSQL (local), via psycopg 3 |
| Payments | None — orders are recorded, no processor |
| AI | Google Gemini, called directly from the backend (free tier). Frontend uses the Vercel AI SDK (`ai`, `@ai-sdk/react`) purely as a streaming chat client |
| PDF export | jsPDF + jspdf‑autotable |
| Testing | Vitest + Testing Library + jsdom |
| Package manager | Bun (`bun.lock` / `bun.lockb` committed — npm/pnpm also work) |

## 4. Getting started

### 4.1 Prerequisites

- Node.js 18+ (or [Bun](https://bun.sh)) for the frontend
- **Python 3.10+** and **PostgreSQL 13+** running locally, for the backend
- A free [Google Gemini API key](https://aistudio.google.com/apikey) — no credit card required

Everything here is free and runs on your machine. No cloud account, no paid service.

### 4.2 Start the backend

Full instructions in [`backend/README.md`](backend/README.md). In short:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE nexagrowth;"

cd backend
cp .env.example .env          # then set DATABASE_URL and GEMINI_API_KEY inside it
python -m venv .venv && .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Check it: `curl http://localhost:8000/api/health` should report `"connected": true`.
Interactive API browser: <http://localhost:8000/docs>.

### 4.3 Start the frontend

```bash
npm install
npm run dev        # http://localhost:8080
```

Other scripts:

```bash
npm run build        # production build
npm run build:dev    # development-mode build (unminified, easier to debug)
npm run preview      # preview the production build locally
npm run lint         # run ESLint
npm run test         # run the test suite once
npm run test:watch   # run tests in watch mode
```

### 4.4 Environment variables

**The frontend takes exactly one value, and it is public:**

```
VITE_API_URL="http://localhost:8000"
```

It can be omitted — `src/lib/api.ts` defaults to that URL.

**Every secret lives in `backend/.env`**, server-side, and is never bundled into the
browser:

```
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/nexagrowth
GEMINI_API_KEY=
GEMINI_MODEL=          # optional, defaults to gemini-2.5-flash
```

> **Never prefix an AI key or a database password with `VITE_`.** Every `VITE_`
> variable is inlined into the JavaScript bundle at build time and is readable by
> anyone who opens the site.

> **Do not enable billing on the Google Cloud project holding your Gemini key.**
> Unlike most Google services, enabling billing removes the Gemini free tier from
> that project entirely.

## 5. Project structure

```
src/
  components/          Landing-page sections (Hero, Services, Pricing, ...) and the MarketingStrategist widget
  components/ui/       shadcn/ui component library (Radix + Tailwind)
  contexts/            CartContext (in-memory cart state)
  lib/api.ts           Client for the FastAPI backend (base URL + error normalisation)
  pages/               Route-level pages: Index, Cart, Checkout, ThankYou, PrivacyPolicy, Terms, NotFound
  test/                Vitest setup and example test

backend/
  app/
    main.py            FastAPI app, CORS, /api/health
    config.py          settings from backend/.env
    db.py              SQLAlchemy engine/session
    models.py          5 ORM models
    schemas.py         Pydantic request/response
    routers/
      data.py          leads, reports, generated-content, orders
      marketing.py     the 3 AI endpoints (NDJSON + SSE streaming)
    services/
      lead_scoring.py     deterministic scoring — no AI
      pipeline_stages.py  the 6 report stages
      ai_gateway.py       Gemini access, timeouts, typed errors
  alembic/             database migrations
  tests/               94 tests
```

## 6. Testing

Tests run with Vitest in a jsdom environment (`vitest.config.ts`, `src/test/setup.ts`).

```bash
bun run test                                 # run all tests once
bun run test:watch                            # watch mode
bunx vitest run src/test/example.test.ts      # run a single file
bunx vitest run -t "test name"                # run tests matching a name
```

## 7. Deployment notes

- The frontend is a static Vite build (`bun run build` → `dist/`) deployable to any static host (Vercel, Netlify, Lovable, etc.).
- The backend is a separate FastAPI process (`backend/`) and is **not** bundled by Vite. It currently runs locally only — see `backend/README.md`.
- **The deployed static frontend has no reachable backend**, because the API runs on `localhost`. The marketing site renders, but the AI features and forms require the backend running on the same machine. Hosting the backend is a later, separate decision.
- Without `GEMINI_API_KEY` in `backend/.env`, the AI endpoints return a clear "AI service is not configured" error instead of failing silently.

## 8. Further reading

See [`CLAUDE.md`](CLAUDE.md) for a deeper architectural walkthrough aimed at contributors making code changes (data flow details, file-by-file responsibilities, and conventions to follow).
