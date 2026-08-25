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

A deliberate design principle threads through the AI layer: **numbers the business will make decisions on must be explainable, not AI‑invented.** The lead score, the AI confidence score, and which marketing channels are even allowed to be recommended are all computed with plain rule‑based logic (see [`supabase/functions/_shared/leadScoring.ts`](supabase/functions/_shared/leadScoring.ts)) — the LLM only writes the narrative, creative, and structured‑content parts of the report. This keeps the tool honest: it can't claim a lead is "hot" or a recommendation is "92% confident" for reasons nobody can point to.

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

The report and every intake are persisted to Supabase (`marketing_reports` table) and mirrored in the browser's `localStorage`, so closing and reopening the widget restores the last session instead of starting over.

### 2.3 Pricing → Cart → Checkout → Payment

Three plans are offered (Starter $1,499/mo, Growth $3,499/mo, Enterprise $6,999/mo — "Contact Sales"), with an annual‑billing toggle (20% off). Adding a plan puts it in an in‑memory cart (`CartContext`); `/cart` reviews it; `/checkout` collects contact info and a payment method:

- **Credit card** → creates a real Stripe Checkout subscription session via the `stripe-checkout` edge function and redirects to Stripe. A `stripe-webhook` function listens for `checkout.session.completed` and marks the matching order `paid`.
- **Bank transfer / digital wallet** → no live payment processor; the order is recorded as `pending` and the visitor is sent to a `/thank-you` confirmation page, with manual payment instructions shown in the UI.

There is no user authentication anywhere in the app — every write (leads, reports, orders, generated content) is an anonymous insert, permitted by Supabase Row Level Security policies designed for that purpose.

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript, built with Vite |
| Routing | React Router (lazy‑loaded routes) |
| UI components | shadcn/ui (Radix UI primitives) + Tailwind CSS |
| Animation | Framer Motion |
| Forms/validation | React Hook Form + Zod |
| Data fetching / cache | TanStack Query |
| Backend | Supabase (Postgres, Row Level Security, Edge Functions on Deno) |
| Payments | Stripe (subscriptions via Checkout Sessions + webhooks) |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/react`), served through Lovable's AI Gateway or Google Gemini directly |
| PDF export | jsPDF + jspdf‑autotable |
| Testing | Vitest + Testing Library + jsdom |
| Package manager | Bun (`bun.lock` / `bun.lockb` committed — npm/pnpm also work) |

## 4. Getting started

### 4.1 Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+ with npm
- A [Supabase](https://supabase.com) project (or use the one already configured — see `supabase/config.toml`)
- A free [Google Gemini API key](https://aistudio.google.com/apikey) (no credit card required) **or** a Lovable AI Gateway key, for the AI features
- A [Stripe](https://stripe.com) account, only if you want real card payments to work

### 4.2 Install & run the frontend

```bash
bun install
bun run dev        # http://localhost:8080
```

Other scripts:

```bash
bun run build        # production build
bun run build:dev    # development-mode build (unminified, easier to debug)
bun run preview       # preview the production build locally
bun run lint          # run ESLint
bun run test           # run the test suite once
bun run test:watch     # run tests in watch mode
```

### 4.3 Configure environment variables

**Frontend** — create/edit `.env` in the project root:

```
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon/publishable-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

**Edge functions** — copy `supabase/functions/.env.example` to `supabase/functions/.env` for local development, or set them as Supabase secrets for a deployed project:

```
GEMINI_API_KEY=       # REQUIRED. Free key from https://aistudio.google.com/apikey — no credit card needed
GEMINI_MODEL=         # optional. Defaults to gemini-2.5-flash. Use gemini-2.5-flash-lite for more daily headroom
LOVABLE_API_KEY=      # optional, PAID (Lovable credits). Ignored unless ALLOW_LOVABLE_AI=true is also set
ALLOW_LOVABLE_AI=     # optional. Set to "true" only to deliberately opt into paid Lovable usage
```

The AI provider is chosen at request time and **Gemini always wins**. `GEMINI_API_KEY` calls Google's API directly and is free. The Lovable AI Gateway is billed against Lovable credits — and because Lovable Cloud auto‑provisions `LOVABLE_API_KEY`, treating its presence as a fallback would spend money silently — so it runs only when `ALLOW_LOVABLE_AI=true` is explicitly set. Without a Gemini key the functions return a clear configuration error instead of quietly switching to a paid service.

The model id is read from `GEMINI_MODEL`, defaulting to `gemini-2.5-flash` (free tier: 10 RPM / 250 RPD). One report costs 4 AI calls, so roughly 62 reports/day; set `GEMINI_MODEL=gemini-2.5-flash-lite` for ~250/day. Keeping the model id in configuration is deliberate — the project was previously pinned in code to `gemini-2.0-flash`, which Google retired on 1 June 2026.

> **Do not enable billing on the Google Cloud project holding your Gemini key.** Unlike most Google services, enabling billing removes the Gemini free tier from that project entirely.

For Stripe payments, also set (as Supabase secrets, never in the frontend `.env`):

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4.4 Set up Supabase

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# Apply the database schema (leads, marketing_reports, orders, order_items, generated_content)
supabase db push
# or run supabase/migrations/*.sql manually in the Supabase SQL editor

# Serve edge functions locally
supabase functions serve

# Deploy edge functions to your project
supabase functions deploy marketing-report
supabase functions deploy marketing-action
supabase functions deploy marketing-strategist
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook

# Set secrets on the deployed project
supabase secrets set GEMINI_API_KEY=<your-key>
supabase secrets set STRIPE_SECRET_KEY=<your-key>
supabase secrets set STRIPE_WEBHOOK_SECRET=<your-key>
```

All four data tables have Row Level Security enabled with policies that allow anonymous inserts (and, for `marketing_reports`/`generated_content`, anonymous selects) — no auth setup is required to use the app as built.

## 5. Project structure

```
src/
  components/          Landing-page sections (Hero, Services, Pricing, ...) and the MarketingStrategist widget
  components/ui/       shadcn/ui component library (Radix + Tailwind)
  contexts/            CartContext (in-memory cart state)
  integrations/supabase/  Generated Supabase client + database types
  pages/               Route-level pages: Index, Cart, Checkout, ThankYou, PrivacyPolicy, Terms, NotFound
  test/                Vitest setup and example test

supabase/
  migrations/          SQL schema (leads, marketing_reports, orders, order_items, generated_content)
  functions/
    marketing-report/     Generates the full AI strategy report + deterministic lead score
    marketing-action/     Generates one specific deliverable (ads, captions, SEO, calendar, emails)
    marketing-strategist/ Streamed, open-ended chat with the AI advisor
    stripe-checkout/      Creates a Stripe Checkout subscription session
    stripe-webhook/       Marks orders "paid" on checkout.session.completed
    _shared/
      ai-gateway.ts        AI provider selection (Lovable Gateway / Gemini), CORS, logging, timeouts
      leadScoring.ts        Deterministic lead score, AI confidence score, channel classification
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
- Edge functions deploy independently via the Supabase CLI — they are **not** bundled by Vite.
- Configure the Stripe webhook endpoint (in the Stripe dashboard) to point at your deployed `stripe-webhook` function URL, listening for the `checkout.session.completed` event.
- Without `GEMINI_API_KEY` set as a Supabase secret, the AI Employee returns a clear "AI service is not configured" error instead of failing silently — and never silently falls back to the paid Lovable gateway.

## 8. Further reading

See [`CLAUDE.md`](CLAUDE.md) for a deeper architectural walkthrough aimed at contributors making code changes (data flow details, file-by-file responsibilities, and conventions to follow).
