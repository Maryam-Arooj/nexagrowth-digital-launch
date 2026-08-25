# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

NexaGrowth Digital is a marketing-agency marketing website: a single-page landing site (services, pricing, case studies, testimonials, team, FAQ) plus a lightweight commerce flow (cart → checkout → Stripe or manual payment → thank-you) and an AI-powered lead-generation tool ("AI Employee" / Marketing Strategist widget) that interviews a visitor about their business and produces a full AI-generated marketing strategy report.

It was originally scaffolded by Lovable (`vite_react_shadcn_ts` template — see `lovable-tagger` dev dependency and `README.md`) and is backed by Supabase (Postgres + Edge Functions) for data storage, Stripe for subscription payments, and an LLM (via Lovable's AI Gateway or Google Gemini directly) for report/content generation.

## Commands

```bash
bun install          # install deps (bun.lock / bun.lockb present — this is a Bun project; npm/pnpm also work via package.json)
bun run dev           # start Vite dev server on port 8080
bun run build         # production build
bun run build:dev     # build in development mode (unminified, useful for debugging build output)
bun run preview       # preview the production build
bun run lint          # eslint .
bun run test          # vitest run (single run, CI mode)
bun run test:watch    # vitest (watch mode)
```

Run a single test file: `bun run test src/test/example.test.ts` (or `bunx vitest run <path>`).
Run tests matching a name: `bunx vitest run -t "<test name>"`.

There is no Jest — all tests use Vitest + Testing Library + jsdom (`vitest.config.ts`, `src/test/setup.ts`). Playwright (`@playwright/test`) is a devDependency but no `playwright.config.*` or e2e specs exist yet.

### Supabase Edge Functions (Deno)

Edge functions live under `supabase/functions/*` and are deployed separately from the Vite app (they are NOT bundled by Vite). To work on them locally you need the Supabase CLI:

```bash
supabase functions serve                 # serve all functions locally
supabase functions deploy <name>          # deploy a single function
supabase secrets set GEMINI_API_KEY=...   # or LOVABLE_API_KEY — see AI provider section below
```

Local function secrets go in `supabase/functions/.env` (copy from `supabase/functions/.env.example`; gitignored).

## Architecture

### Frontend: single-page marketing site + a few app-like routes

`src/App.tsx` defines the router. `/` (`pages/Index.tsx`) renders the whole marketing page as a stack of section components in a fixed order (Navbar → Hero → TrustBar → About → Services → Process → CaseStudies → WhyChooseUs → Team → Pricing → Testimonials → FAQ → CTASection → Contact → Footer), with the `MarketingStrategist` chat widget mounted globally as a floating launcher button. Nav links (`Navbar.tsx`) target sections on `/` rather than separate routes. They are modelled as section **ids**, not raw hrefs: `handleNavClick` calls `preventDefault()` and either scrolls in place (already on `/`) or router-navigates with `navigate("/", { state: { scrollTo: id } })`. A `useEffect` in `Navbar` reads that `location.state` after the lazy-loaded `Index` page mounts and scrolls, then clears the state. Each anchor keeps a real `href` so middle-click and ctrl/cmd-click still open a new tab. **Never reintroduce `window.location.href` here** — a full reload remounts the app and wipes `CartContext`, which is in-memory only.

All routes except `/` are lazy-loaded (`React.lazy` + `Suspense`) in `App.tsx`: `/cart`, `/checkout`, `/thank-you`, `/privacy`, `/terms`, `*` (404).

State is split between:
- **`CartContext`** (`src/contexts/CartContext.tsx`) — in-memory (not persisted) cart of selected pricing plans, used by `Pricing.tsx`, `Cart.tsx`, `Checkout.tsx`, `Navbar.tsx`.
- **`localStorage`** (`nexagrowth-strategy-v2` key) — persists the AI Employee's last generated business + report, so reopening the widget restores the previous report instead of re-running the flow (`MarketingStrategist.tsx`).

`src/components/ui/*` is the shadcn/ui component set (Radix primitives + Tailwind) — treat it as vendored library code, not app code; extend via composition rather than editing these files unless fixing a real bug.

Design tokens (colors, radius) are CSS variables defined in `src/index.css` (`:root`) and consumed through Tailwind's `hsl(var(--x))` pattern configured in `tailwind.config.ts` — this is the dark, purple/pink-accent theme (`--primary`, `--accent`) used throughout via `bg-gradient-to-r from-primary to-accent`. Change the theme by editing the CSS variables, not by hardcoding colors in components.

### Checkout / payment flow

`Pricing.tsx` adds a plan to `CartContext` → `/cart` → `/checkout` (`Checkout.tsx`). On submit:
- **Card payment**: calls the `stripe-checkout` edge function to create a Stripe Checkout subscription session, inserts an `orders` row with `status: "pending"` (plus `order_items`) directly from the client via the Supabase JS client, then redirects to Stripe. The `stripe-webhook` edge function listens for `checkout.session.completed` and flips matching pending orders (by `customer_email`) to `status: "paid"`.
- **Bank transfer / digital wallet**: no real payment integration — the order is inserted as `"pending"` and the user is sent straight to `/thank-you`; bank details are static text in `Checkout.tsx`.

There is no authentication in this app. Every Supabase write (`leads`, `marketing_reports`, `orders`, `order_items`, `generated_content`) happens as an anonymous client using RLS policies that allow anyone to `INSERT` (and, for `marketing_reports`/`generated_content`, `SELECT`) — see `supabase/migrations/*.sql`. Do not assume any row is tied to a logged-in user; there is no `auth.uid()` usage anywhere in this schema.

### AI Employee / Marketing Strategist (the core differentiator)

This is the most complex part of the codebase, split across one large frontend component and three edge functions:

- **`src/components/MarketingStrategist.tsx`** — a full-screen modal widget with stages `intake → loading → report → action | chat → error`. Intake collects `{ companyName, industry, audience, budget, goal, currentChannels }`. On submit it POSTs to the `marketing-report` function, normalizes the (possibly partial) response client-side (`normalizeReport`, defense-in-depth on top of server-side zod validation), saves it to `marketing_reports`, and renders the report. From the report view the user can trigger one of six "Next Actions" (Google/Facebook ad copy, IG captions, SEO keywords, content calendar, email sequence) via the `marketing-action` function, or open a live chat with the strategist via the `marketing-strategist` function (streamed via `@ai-sdk/react`'s `useChat`). `ChatView` owns its own input state and configures the endpoint through `transport: new DefaultChatTransport({ api, headers, body })` — `useChat` builds its `Chat` once and ignores later option objects, so the transport is created once with `useMemo` and `body` is a **function** (a `Resolvable`, evaluated per request) reading from a ref, keeping each request in sync with the current business/report. Messages carry a `parts[]` array rather than a `content` string, so `messageText()` concatenates the text parts; loading state comes from `status` (`submitted`/`streaming`), not `isLoading`. The submit handler **must** call `preventDefault()` — without it the browser performs a native form submission that reloads the SPA. Generated action content can be saved to `generated_content`. Report PDF export uses `jspdf` + `jspdf-autotable` (`generatePDF`, bottom of the file).

- **`supabase/functions/marketing-report/`** — generates the full structured report. Calls the LLM with a strict prompt and validates the response against a `zod` schema (`AiReportSchema`); includes JSON-repair helpers (`extractJson`, `stripTrailingCommas`, `coerceNumericFields`) to recover from near-miss LLM output before giving up. **Lead score and AI confidence score are intentionally NOT generated by the AI** — they're computed deterministically in `supabase/functions/_shared/leadScoring.ts` from the raw business inputs (rule-based point system, always reproducible/explainable) and merged into the AI's response afterward. The function also classifies the business into a category (ecommerce/saas/local/agency/other via `classifyBusiness`) and constrains which marketing channels the AI is allowed to recommend, so a SaaS company never gets local-storefront advice and vice versa. The recommended plan must be one of the three real pricing plans (`PLAN_CATALOG`, kept in sync with `Pricing.tsx`).

- **`supabase/functions/marketing-action/`** — takes an `action` id (from a fixed `ACTION_PROMPTS` map) plus the business/report context and generates one specific deliverable via a single `generateText` call with a timeout.

- **`supabase/functions/marketing-strategist/`** — the open-ended chat endpoint; streams a response (`streamText` → `toUIMessageStreamResponse`) using a detailed system prompt that defines the AI's persona, output structure, and boundaries (redirects off-topic questions, never invents case studies).

- **`supabase/functions/_shared/ai-gateway.ts`** — shared plumbing for every function: `getAiModel()` picks the LLM provider at call time (checks `LOVABLE_API_KEY` first — Lovable's AI Gateway, auto-provisioned in Lovable Cloud — then falls back to `GEMINI_API_KEY` for direct, free Gemini access when self-hosting outside Lovable), plus `corsHeaders`, `ConfigError`/`ValidationError` (mapped to 500/400 respectively by each function), structured `log`/`logError`, and `withTimeout`. **When adding a new edge function that calls the LLM, use `getAiModel()` rather than hardcoding a provider** so both deployment paths keep working.

- **`supabase/functions/_shared/leadScoring.ts`** — pure, deterministic, no AI: `computeLeadScore` (5 weighted factors: budget fit, business fit, growth potential, marketing maturity, goal urgency → 0-100 score + Cold/Warm/Hot/Priority tier), `computeConfidence` (based on which intake fields were actually filled in, with a permanent caveat that no live analytics are connected), and `classifyBusiness` (regex-based industry → category + allowed-channels guardrail). Keep this rule-based — the whole point is that these numbers must be reproducible and explainable, unlike anything the LLM generates.

### Data model (Supabase Postgres)

Defined across `supabase/migrations/20260729_initial_schema.sql` and `20260731_generated_content.sql`:
- `leads` — free-standing contact-form submissions (not currently wired to a UI form in the reviewed code; schema-only or used elsewhere).
- `marketing_reports` — `company_name`, `business_data` (jsonb, the intake), `report_data` (jsonb, the full AI report) — written by `MarketingStrategist.tsx` after a successful report generation.
- `orders` / `order_items` — written by `Checkout.tsx`; `orders.status` transitions `pending → paid` via the Stripe webhook.
- `generated_content` — saved "Next Action" outputs (ad copy, captions, etc.) from the AI Employee, keyed by `company_name` + `action_type`.

All four tables have RLS enabled with anonymous-insert (and, for the two report-like tables, anonymous-select) policies — there's no per-user data isolation by design. `src/integrations/supabase/types.ts` and `src/integrations/supabase/client.ts` are Lovable/Supabase-generated — treat both as generated code; regenerate rather than hand-edit if the schema changes.

### Environment variables

Frontend (`.env`, `VITE_`-prefixed, embedded at build time): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Edge functions (Supabase secrets, never exposed to the client): `LOVABLE_API_KEY` or `GEMINI_API_KEY` (AI provider — see `ai-gateway.ts`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (service-role key, used only server-side in `stripe-webhook` to update order status — never use this key in frontend code).

### Path alias

`@/*` → `src/*`, configured in both `vite.config.ts` and `vitest.config.ts` — keep them in sync if the alias setup ever changes.
