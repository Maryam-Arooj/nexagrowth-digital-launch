/**
 * Regression tests for three UI bugs that shipped from the Lovable scaffold.
 *
 * Each of these was verified to FAIL against the code as it stood before the fix,
 * so they lock in real behaviour rather than restating it.
 *
 * Every network call is intercepted with `page.route`, so these need only the Vite
 * dev server (`npm run dev`) — no FastAPI backend, no PostgreSQL, no Gemini key.
 */
import { test, expect, type Page } from "@playwright/test";

const REPORT = {
  companyName: "Seeded Co",
  executiveSummary: "Seeded executive summary.",
  businessAnalysis: { model: "B2B SaaS", audience: "Ops teams", strengths: "Focus", currentPosition: "Challenger" },
  swot: { strengths: ["s"], weaknesses: ["w"], opportunities: ["o"], threats: ["t"] },
  competitorAnalysis: {
    topCompetitors: [{ name: "Rival", note: "n" }],
    competitiveAdvantages: ["a"], marketGaps: ["g"], differentiationStrategy: "d",
  },
  marketingStrategy: [{ channel: "SEO", why: "w", priority: "High" }],
  budgetAllocation: [{ channel: "SEO", percent: 100, amount: 5000, expectedRoi: "3x" }],
  actionPlan: { week1: ["a"], week2: ["b"], week3: ["c"], week4: ["d"] },
  ninetyDayStrategy: {
    month1: { theme: "t1", keyActions: ["a"] },
    month2: { theme: "t2", keyActions: ["a"] },
    month3: { theme: "t3", keyActions: ["a"] },
  },
  seo: {
    primaryKeywords: ["k"], secondaryKeywords: ["k"], longTailKeywords: ["k"],
    metaTitle: "m", metaDescription: "m", blogIdeas: ["b"], internalLinking: ["l"],
  },
  contentIdeas: {
    instagramPosts: ["p"], reels: ["r"], stories: ["s"],
    facebookPosts: ["f"], linkedinPosts: ["l"], emailCampaigns: ["e"],
  },
  kpis: {
    expectedLeads: "100", conversionRate: "3%", roas: "3x",
    ctr: "2%", trafficGrowth: "20%", monthlySales: "$10k",
  },
  leadScore: {
    score: 82, tier: "Hot", reasoning: "seeded",
    breakdown: [{ label: "Budget fit", points: 25, max: 25, note: "n" }],
  },
  recommendedPlan: { name: "Growth", monthlyPrice: 2999, reasoning: "r" },
  riskAnalysis: [{ risk: "r", mitigation: "m" }],
  confidence: { score: 100, reasoning: "seeded", checklist: [{ label: "Industry provided", met: true }] },
  finalRecommendations: ["Do the thing"],
};

const BUSINESS = {
  companyName: "Seeded Co", industry: "SaaS", audience: "Ops teams",
  budget: "$5,000 - $10,000/mo", goal: "Leads", currentChannels: "SEO",
};

/** Opens the AI Employee panel and returns its modal locator. */
async function openPanel(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  const launcher = page.locator("button").filter({ hasText: /ai employee|strategist/i }).first();
  if (await launcher.count()) await launcher.click();
  else await page.locator("button:has(svg)").last().click();
  return page.locator("div.fixed.inset-0.z-50").first();
}

test('clicking "New" during an in-flight action does not strand a blank panel', async ({ page }) => {
  await page.addInitScript(
    ([b, r]) => localStorage.setItem("nexagrowth-strategy-v2", JSON.stringify({ business: b, report: r })),
    [BUSINESS, REPORT],
  );
  // Hold the request open so "New" is genuinely clicked mid-flight.
  await page.route("**/api/marketing-action", async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ text: "STALE RESULT" }),
    });
  });

  const modal = await openPanel(page);
  await expect(modal.getByText("Seeded Co").first()).toBeVisible({ timeout: 15000 });

  await modal.getByText(/SEO Keywords/i).first().click();
  await page.waitForTimeout(600);
  await modal.getByRole("button", { name: /^new$/i }).click();

  // The reset must land on the intake form immediately...
  await expect(modal.getByText("Build Your Marketing Strategy")).toBeVisible({ timeout: 10000 });

  // ...and the response that was already in flight must be discarded, not rendered.
  // Before the fix it landed, showing a result for the report the user had cleared,
  // and Back then rendered an empty panel because `report` was null.
  await page.waitForTimeout(6000);
  await expect(modal.getByText("STALE RESULT")).toHaveCount(0);
  await expect(modal.getByText("Build Your Marketing Strategy")).toBeVisible();
  expect((await modal.innerText()).trim().length).toBeGreaterThan(50);
});

test("a localStorage failure does not report a successful report as failed", async ({ page }) => {
  await page.addInitScript(() => {
    // A full quota, or Safari/Firefox private mode, on writes only.
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (String(k).startsWith("nexagrowth")) throw new DOMException("QuotaExceededError");
      return orig.call(this, k, v);
    };
  });
  const stream =
    [
      JSON.stringify({ type: "stage", stage: "business-analyst", status: "running" }),
      JSON.stringify({ type: "stage", stage: "business-analyst", status: "done", durationMs: 1 }),
      JSON.stringify({ type: "final", report: REPORT }),
    ].join("\n") + "\n";
  await page.route("**/api/marketing-report", (route) =>
    route.fulfill({ status: 200, contentType: "application/x-ndjson", body: stream }));
  await page.route("**/api/reports", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "x" }) }));

  const modal = await openPanel(page);
  await expect(modal.getByText("Build Your Marketing Strategy")).toBeVisible({ timeout: 15000 });
  await modal.getByPlaceholder("Acme Inc.").fill("Seeded Co");
  await modal.getByPlaceholder("B2B SaaS, D2C apparel, etc.").fill("SaaS");
  const submit = modal.getByRole("button", { name: /consult with ai employee/i });
  await submit.scrollIntoViewIfNeeded();
  await submit.click();

  // The report generated and was saved server-side. A failed local cache write is
  // not a failure of either — before the fix it produced "Failed to generate report".
  await expect(modal.getByText("Seeded executive summary.").first()).toBeVisible({ timeout: 30000 });
  await expect(modal.getByText(/failed to generate report/i)).toHaveCount(0);
});

test("a failed clipboard write does not claim the copy succeeded", async ({ page }) => {
  await page.addInitScript(
    ([b, r]) => {
      localStorage.setItem("nexagrowth-strategy-v2", JSON.stringify({ business: b, report: r }));
      // How an insecure origin or a refused permission behaves.
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException("NotAllowedError")) },
      });
    },
    [BUSINESS, REPORT],
  );
  await page.route("**/api/marketing-action", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: "COPY ME" }) }));

  const modal = await openPanel(page);
  await expect(modal.getByText("Seeded Co").first()).toBeVisible({ timeout: 15000 });
  await modal.getByText(/SEO Keywords/i).first().click();
  await expect(modal.getByText("COPY ME")).toBeVisible({ timeout: 20000 });

  await modal.getByRole("button", { name: /^copy$/i }).click();
  await page.waitForTimeout(2500);
  // The promise was never awaited before the fix, so this toast always appeared.
  await expect(page.getByText(/^Copied$/)).toHaveCount(0);
  await expect(page.getByText(/couldn't copy|could not copy/i).first()).toBeVisible({ timeout: 5000 });
});
