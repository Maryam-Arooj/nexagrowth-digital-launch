/**
 * Deterministic, explainable lead scoring + confidence + channel guardrails.
 *
 * This is intentionally NOT AI — it's plain rule-based logic so the score/confidence
 * a user sees is reproducible (same inputs always produce the same output) and every
 * point can be explained. The AI model is only used for the narrative/creative parts
 * of the report (SWOT, copy ideas, etc.) — never for the numbers that decide how
 * "qualified" a lead is, which is exactly the kind of task that doesn't need an AI
 * call at all.
 */

export interface BusinessInput {
  companyName: string;
  industry: string;
  audience?: string;
  budget?: string;
  goal?: string;
  currentChannels?: string;
  [k: string]: unknown;
}

export interface ScoreFactor {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface LeadScoreResult {
  score: number;
  tier: "Cold" | "Warm" | "Hot" | "Priority";
  reasoning: string;
  breakdown: ScoreFactor[];
}

export interface ConfidenceChecklistItem {
  label: string;
  met: boolean;
  caveat?: boolean;
}

export interface ConfidenceResult {
  score: number;
  reasoning: string;
  checklist: ConfidenceChecklistItem[];
}

export type BusinessCategory = "ecommerce" | "saas" | "local" | "agency" | "other";

export interface ChannelGuardrails {
  category: BusinessCategory;
  categoryLabel: string;
  matched: boolean;
  allowedChannels: string[];
}

const CATEGORY_RULES: { category: BusinessCategory; label: string; pattern: RegExp; channels: string[] }[] = [
  {
    category: "ecommerce",
    label: "D2C / E-commerce",
    pattern: /e-?commerce|d2c|dtc|shop(?:ify)?|retail|apparel|fashion|cosmetic|product brand|online store/i,
    channels: ["Meta Ads (Facebook/Instagram)", "TikTok Ads", "Google Shopping", "Email/SMS Retention Marketing", "Conversion Rate Optimization (CRO)", "Influencer/UGC Content"],
  },
  {
    category: "saas",
    label: "B2B SaaS / Software",
    pattern: /saas|b2b software|software company|platform|startup(?! store)|tech company|app company/i,
    channels: ["SEO", "Google Search Ads", "LinkedIn Ads", "Content Marketing", "Lead Nurturing / Email Sequences", "Webinars & Product Demos"],
  },
  {
    category: "local",
    label: "Local / Brick-and-Mortar Business",
    pattern: /local|restaurant|salon|spa|clinic|dentist|gym|plumb|electrician|contractor|law firm|real estate|brick.?and.?mortar|storefront/i,
    channels: ["Local SEO", "Google Business Profile Optimization", "Geo-targeted Local Ads", "Review & Reputation Management", "Community & Social Presence"],
  },
  {
    category: "agency",
    label: "Agency / Professional Services",
    pattern: /agency|consult|professional services?|accounting|freelance|coach(?:ing)?/i,
    channels: ["SEO", "Content Marketing", "LinkedIn", "Email Marketing", "Referral & Partnership Programs"],
  },
];

const FALLBACK_CHANNELS = ["SEO", "Google Ads", "Social Media Marketing", "Email Marketing"];

/** Classifies free-text industry input into a known business category with a curated, relevant channel list. */
export function classifyBusiness(industry: string): ChannelGuardrails {
  const text = (industry || "").trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, categoryLabel: rule.label, matched: true, allowedChannels: rule.channels };
    }
  }
  return { category: "other", categoryLabel: text || "Unclassified", matched: false, allowedChannels: FALLBACK_CHANNELS };
}

function extractMonthlyBudget(budget: string | undefined): number | null {
  if (!budget) return null;
  const numbers = budget.match(/[\d,]+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
  if (values.length === 0) return null;
  // "$3,000 - $5,000" -> average of the range; single value -> that value.
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const GROWTH_KEYWORDS = /scale|grow|expand|launch|increase|double|accelerat|new market|enter/i;
const URGENCY_KEYWORDS = /now|urgent|asap|immediately|this (quarter|month)|90 days|30 days|need|struggl|losing|behind|declin|stall/i;
const MAINTENANCE_KEYWORDS = /maintain|steady|stay|keep up|consistent/i;

const CHANNEL_KEYWORDS = [
  /google ads?/i, /facebook|meta/i, /instagram/i, /tiktok/i, /seo/i, /email/i, /linkedin/i,
  /content|blog/i, /influencer/i, /affiliate/i, /pr\b|public relations/i, /referral/i,
];

/**
 * Computes a 0-100 lead score from five weighted, independently-explainable factors.
 * Same business input always produces the same score (no AI, no randomness).
 */
export function computeLeadScore(business: BusinessInput): LeadScoreResult {
  const breakdown: ScoreFactor[] = [];

  // 1. Budget fit (max 25)
  const monthlyBudget = extractMonthlyBudget(business.budget);
  let budgetPoints = 0;
  let budgetNote: string;
  if (monthlyBudget === null) {
    budgetNote = "No budget provided";
  } else if (monthlyBudget >= 6000) {
    budgetPoints = 25; budgetNote = `Budget ~$${Math.round(monthlyBudget).toLocaleString()}/mo supports full-funnel investment`;
  } else if (monthlyBudget >= 3000) {
    budgetPoints = 20; budgetNote = `Budget ~$${Math.round(monthlyBudget).toLocaleString()}/mo supports a multi-channel plan`;
  } else if (monthlyBudget >= 1000) {
    budgetPoints = 14; budgetNote = `Budget ~$${Math.round(monthlyBudget).toLocaleString()}/mo fits a focused single-channel plan`;
  } else {
    budgetPoints = 8; budgetNote = `Budget ~$${Math.round(monthlyBudget).toLocaleString()}/mo is limited`;
  }
  breakdown.push({ label: "Budget fit", points: budgetPoints, max: 25, note: budgetNote });

  // 2. Business fit (max 20)
  const classification = classifyBusiness(business.industry);
  let fitPoints = 0;
  let fitNote: string;
  if (!business.industry?.trim()) {
    fitNote = "No industry provided";
  } else if (classification.matched) {
    fitPoints = 20; fitNote = `Clear fit: ${classification.categoryLabel}, a serviceable category`;
  } else {
    fitPoints = 10; fitNote = "Industry provided but doesn't map to a well-defined category";
  }
  breakdown.push({ label: "Business fit", points: fitPoints, max: 20, note: fitNote });

  // 3. Growth potential (max 20) — from stated goal ambition
  const goal = (business.goal || "").trim();
  let growthPoints = 0;
  let growthNote: string;
  if (!goal) {
    growthNote = "No goal provided";
  } else if (GROWTH_KEYWORDS.test(goal)) {
    growthPoints = 20; growthNote = "Goal signals active growth ambition";
  } else if (MAINTENANCE_KEYWORDS.test(goal)) {
    growthPoints = 6; growthNote = "Goal signals maintenance rather than growth";
  } else {
    growthPoints = 12; growthNote = "Goal provided without a clear growth/maintenance signal";
  }
  breakdown.push({ label: "Growth potential", points: growthPoints, max: 20, note: growthNote });

  // 4. Marketing maturity (max 20) — from current channels
  const channelsText = (business.currentChannels || "").trim();
  const channelHits = CHANNEL_KEYWORDS.filter((re) => re.test(channelsText)).length;
  let maturityPoints: number;
  let maturityNote: string;
  if (!channelsText) {
    maturityPoints = 5; maturityNote = "No current channels described (greenfield — lower readiness signal)";
  } else if (channelHits === 0) {
    maturityPoints = 8; maturityNote = "Channels described but not clearly identifiable";
  } else if (channelHits === 1) {
    maturityPoints = 12; maturityNote = "Actively running 1 identifiable channel";
  } else if (channelHits === 2) {
    maturityPoints = 17; maturityNote = "Actively running 2 identifiable channels";
  } else {
    maturityPoints = 20; maturityNote = `Actively running ${channelHits}+ channels — marketing-savvy, sales-ready`;
  }
  breakdown.push({ label: "Marketing maturity", points: maturityPoints, max: 20, note: maturityNote });

  // 5. Goal urgency (max 15)
  let urgencyPoints = 0;
  let urgencyNote: string;
  if (!goal) {
    urgencyNote = "No goal provided";
  } else if (URGENCY_KEYWORDS.test(goal)) {
    urgencyPoints = 15; urgencyNote = "Goal language signals time pressure";
  } else {
    urgencyPoints = 8; urgencyNote = "Goal provided without explicit urgency language";
  }
  breakdown.push({ label: "Goal urgency", points: urgencyPoints, max: 15, note: urgencyNote });

  const score = breakdown.reduce((sum, f) => sum + f.points, 0);
  const tier: LeadScoreResult["tier"] = score >= 85 ? "Priority" : score >= 65 ? "Hot" : score >= 40 ? "Warm" : "Cold";

  const reasoning = `${score}/100 (${tier}) — ` + breakdown.map((f) => `${f.label} +${f.points}`).join(", ") + ".";

  return { score, tier, reasoning, breakdown };
}

/**
 * Computes AI confidence as a transparent function of which inputs were actually
 * provided — never an arbitrary AI-invented percentage.
 */
export function computeConfidence(business: BusinessInput): ConfidenceResult {
  const checklist: ConfidenceChecklistItem[] = [
    { label: "Industry provided", met: Boolean(business.industry?.trim()) },
    { label: "Budget provided", met: Boolean(business.budget?.trim()) },
    { label: "Target audience provided", met: Boolean(business.audience?.trim()) },
    { label: "Current channels provided", met: Boolean(business.currentChannels?.trim()) },
    { label: "Goal provided", met: Boolean(business.goal?.trim()) },
  ];
  const metCount = checklist.filter((c) => c.met).length;
  const score = Math.round((metCount / checklist.length) * 100);

  // Fixed structural caveat — this app never has a live analytics connection,
  // so confidence must never imply it does.
  checklist.push({ label: "Live analytics not connected (report is based on stated inputs only)", met: false, caveat: true });

  const missing = checklist.filter((c) => !c.met && !c.caveat).map((c) => c.label);
  const reasoning = missing.length === 0
    ? "All available business inputs were provided — recommendations are grounded in complete stated information."
    : `Based on ${metCount}/${checklist.length - 1} stated inputs. Missing: ${missing.join(", ")}. Recommendations for missing fields are marked as inference, not fact.`;

  return { score, reasoning, checklist };
}

export function computeLeadScoreAndConfidence(business: BusinessInput) {
  return { leadScore: computeLeadScore(business), confidence: computeConfidence(business) };
}
