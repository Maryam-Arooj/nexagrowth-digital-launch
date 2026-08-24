# NexaGrowth AI Employee — FYP Automation Upgrade
## Requirements Document (Draft — Review Only, Not Implemented)

**Status:** Proposal for review. Nothing in this document has been built yet.
**Goal:** Reframe the existing NexaGrowth AI Employee from a single-shot "fill a form, get a report" tool into a demonstrably automated, multi-stage AI workforce system suitable for an FYP (Final Year Project) evaluation — while staying 100% free to build and run (per the existing project constraint: no paid APIs, no paid DB, no paid hosting).

---

## 0. Context — What Already Exists

Before adding anything new, these pieces are already built and can be reused/extended:

- Deterministic, explainable lead-scoring engine (`supabase/functions/_shared/leadScoring.ts`) — 5 weighted factors, reproducible, no AI randomness.
- Industry classification + channel guardrails (`classifyBusiness`) — maps a business to D2C/SaaS/Local/Agency and a relevant channel list.
- Free AI provider (`getAiModel()` — Google Gemini direct, no Lovable dependency).
- Report generation, save-to-DB, and 6 content-generation actions (Google Ads, Facebook Ads, Instagram Captions, SEO Keywords, Content Calendar, Email Campaign) with Regenerate/Edit/Save.
- Local Postgres via Supabase CLI (free), with `marketing_reports`, `leads`, `generated_content` tables.

The requirements below build on top of this — they do not replace it.

---

## 1. Requirement: Multi-Stage Pipeline (Visible Automation)

**Problem:** Report generation is currently one opaque AI call behind a loading spinner. There is no visible "assembly line" — which is the core visual/conceptual proof of "automation" for an FYP demo.

**Proposed change:**
- Split `marketing-report` into sequential named stages, each a discrete function/edge-function-step:
  1. Business Analyst (classify + summarize business)
  2. Lead Scorer (already deterministic — reuse as-is)
  3. Competitor Analyst
  4. Marketing Strategist (channel strategy, budget allocation, 30/90-day plan)
  5. Content Generator (SEO, content ideas)
  6. Campaign Assistant (final recommendations)
- Frontend shows each stage transitioning through `pending → running → done` in real time (not a generic "Analyzing..." spinner — an actual per-stage status list).
- Each stage's output is logged/timed individually (reuses existing `log()`/`logError()` pattern).

**Acceptance criteria:**
- User can see which stage is currently executing while a report is generating.
- Each stage's latency is individually logged.
- Final report is assembled from all stage outputs, same shape as today's `Report` type (no breaking change to `MarketingStrategist.tsx` rendering).

**Open question:** Run stages as sequential AI calls (simpler, slower) or parallelize independent stages (Business Analyst + Lead Scorer can run concurrently)? Affects total latency vs. complexity.

---

## 2. Requirement: Bulk Automation (CSV Batch Processing)

**Problem:** Only one business can be processed at a time, manually. The strongest, most concrete "automation" demo for an evaluator is processing many records unattended.

**Proposed change:**
- New UI (likely a new route, e.g. `/bulk` or an admin panel section) where a user uploads a CSV of businesses (columns: companyName, industry, audience, budget, goal, currentChannels).
- System processes each row through the existing `marketing-report` pipeline automatically, in sequence or small batches (to respect Gemini free-tier rate limits).
- Progress UI shows N of Total processed, with per-row status (success/failed/insufficient data).
- Results exportable as CSV (lead score, tier, recommended plan, channel recommendations per row) and/or viewable as a sortable table.

**Acceptance criteria:**
- A CSV with 10+ rows processes without manual intervention per row.
- Rate-limit errors from the free Gemini tier are caught and retried with backoff, not silently dropped.
- Exportable output contains, at minimum: company name, lead score, tier, recommended plan, confidence score.

**Open question:** Should failed rows block the batch or be skipped-and-reported? (Recommend: skip and report — matches "graceful degradation" principle already used elsewhere in this codebase.)

---

## 3. Requirement: Scheduled / Event-Triggered Automation (pg_cron)

**Problem:** Everything currently requires a human click. There is no example of the system acting on its own on a schedule or trigger — which is what separates "automation" from "a tool with an AI button."

**Proposed change (pick one or both для demo purposes):**
- **Scheduled re-scoring:** A `pg_cron` job (free Postgres extension, already available via Supabase local/hosted) runs daily/weekly, re-computes `leadScore` for saved `marketing_reports` rows (in case scoring logic changed), and flags any that changed tier.
- **Event-triggered action:** When a report is saved with `leadScore.tier === "Hot"` or `"Priority"`, automatically trigger one content-generation action (e.g. auto-generate Google Ads copy) without a manual button click, and save the result to `generated_content`.

**Acceptance criteria:**
- At least one demonstrable "the system did something without a human clicking a button" flow exists.
- The trigger condition and resulting action are logged (for the FYP report/demo narrative: "this ran automatically because X").

**Open question:** `pg_cron` requires the extension enabled on the Postgres instance — confirm it's available on both local Supabase CLI and (if ever deployed) hosted Supabase free tier before committing to this approach. A Supabase Edge Function on a cron schedule (`supabase functions deploy` + scheduled invocation) is a simpler fallback if `pg_cron` proves awkward locally.

---

## 4. Requirement: Rule Engine ("If This, Then That")

**Problem:** Automation logic is currently hardcoded (if any). A visible, user-configurable rule system is a strong, easy-to-explain automation feature for a defense/demo.

**Proposed change:**
- Simple rules table (new DB table, e.g. `automation_rules`): condition (field, operator, value — e.g. `leadScore.score >= 65 AND budget >= 3000`) → action (which of the 6 content actions to auto-run).
- Small UI to create/list/delete rules (no need for a visual drag-drop builder — a form with dropdowns is enough).
- Rules evaluated automatically after each report is generated (ties into Requirement 3's event trigger).

**Acceptance criteria:**
- User can create a rule via UI without editing code.
- Rule correctly fires (or correctly does not fire) against test business inputs.
- Fired rules are visible in a simple activity log.

**Open question:** How many condition fields to support initially? Recommend starting with just `leadScore.score`, `leadScore.tier`, and `budget` to keep scope small — expand later if time allows.

---

## 5. Requirement: Metrics / Evaluation Dashboard

**Problem:** FYP evaluators respond better to measured evidence than live demos alone. Currently there are no aggregate stats exposed anywhere.

**Proposed change:**
- A small `/admin` or `/metrics` page (local-only, no auth needed since app has none) showing, computed from existing DB tables + edge function logs:
  - Total reports generated, success vs. failure rate
  - Average report generation latency
  - Distribution of lead scores/tiers across all generated reports
  - Count of saved `generated_content` items by action type
- No new infrastructure needed — this is a read/aggregate view over data already being written.

**Acceptance criteria:**
- Page loads and displays real numbers from the local database, not mocked data.
- At least 3 distinct metrics shown.

**Open question:** Build as a page in the existing React app, or as a `mcp__cowork__create_artifact`-style standalone HTML dashboard? (Recommend: in-app page, since it needs to run inside the user's own local deployment, not this session.)

---

## 6. Non-Functional Constraints (carry over from the existing project rules)

- No paid APIs, no paid AI models, no paid database, no paid hosting, no credit card required anywhere in this upgrade.
- All new automation (pg_cron, rule engine, bulk processing) must run against the **existing local free Supabase stack** — no new backend service.
- Must not break or downgrade any currently-working feature (report generation, action buttons, save/regenerate/edit, deterministic scoring).
- Rate-limit awareness is required wherever automation triggers multiple AI calls back-to-back (bulk processing, rule-triggered actions) — the free Gemini tier has per-minute/per-day caps.

---

## 7. Suggested Priority Order (for discussion)

If only some of the above get built before a deadline, suggested order by demo impact vs. effort:

1. **Bulk CSV automation** (Req 2) — highest demo impact, moderate effort, reuses 100% of existing pipeline.
2. **Multi-stage visible pipeline** (Req 1) — high demo impact, but requires restructuring the existing `marketing-report` function.
3. **Event-triggered automation** (Req 3, event-trigger half) — good "wow" factor, low effort if scoped to just the Hot-lead trigger.
4. **Metrics dashboard** (Req 5) — good for the written report/defense, low effort.
5. **Rule engine** (Req 4) — most "product-like," but highest effort for the value it adds on top of #3.
6. **Scheduled pg_cron re-scoring** (Req 3, cron half) — nice-to-have, depends on confirming `pg_cron` availability.

---

## 8. Explicitly Out of Scope (unless requested separately)

- Authentication / multi-user accounts.
- Real payment processing on the Checkout page.
- Any physical/embodied automation, cross-company workforce features, or other concepts from unrelated reading material — not relevant to this project.

---

## Next Step

This document is for review only. Reply with which requirements (by number) to proceed with, and in what order, before any implementation starts.
