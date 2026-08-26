import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, X, Loader2, Download, Sparkles, Target, TrendingUp, Users,
  BarChart3, Calendar, Search, FileText, AlertTriangle, Gauge, Lightbulb,
  DollarSign, Megaphone, ShieldAlert, ChevronDown, Wand2, RotateCcw, ArrowLeft,
  Copy, CheckCircle2, MessageSquare, Send,
  type LucideIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { API_URL, apiUrl, apiPost } from "@/lib/api";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PipelineStatus, applyPipelineStageEvent, splitNdjsonLines, type PipelineStageState, type PipelineStageEvent } from "@/components/PipelineStatus";

const STORAGE_KEY = "nexagrowth-strategy-v2";

type Business = {
  companyName: string;
  industry: string;
  audience: string;
  budget: string;
  goal: string;
  currentChannels: string;
};

type Report = {
  companyName: string;
  executiveSummary: string;
  businessAnalysis: { model: string; audience: string; strengths: string; currentPosition: string };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  competitorAnalysis: {
    topCompetitors: { name: string; note: string }[];
    competitiveAdvantages: string[];
    marketGaps: string[];
    differentiationStrategy: string;
  };
  marketingStrategy: { channel: string; why: string; priority: string }[];
  budgetAllocation: { channel: string; percent: number; amount: number; expectedRoi: string }[];
  actionPlan: { week1: string[]; week2: string[]; week3: string[]; week4: string[] };
  ninetyDayStrategy: {
    month1: { theme: string; keyActions: string[] };
    month2: { theme: string; keyActions: string[] };
    month3: { theme: string; keyActions: string[] };
  };
  seo: {
    primaryKeywords: string[]; secondaryKeywords: string[]; longTailKeywords: string[];
    metaTitle: string; metaDescription: string; blogIdeas: string[]; internalLinking: string[];
  };
  contentIdeas: {
    instagramPosts: string[]; reels: string[]; stories: string[];
    facebookPosts: string[]; linkedinPosts: string[]; emailCampaigns: string[];
  };
  kpis: {
    expectedLeads: string; conversionRate: string; roas: string;
    ctr: string; trafficGrowth: string; monthlySales: string;
  };
  leadScore: {
    score: number; tier: string; reasoning: string;
    breakdown: { label: string; points: number; max: number; note: string }[];
  };
  recommendedPlan: { name: string; monthlyPrice: number; reasoning: string };
  riskAnalysis: { risk: string; mitigation: string }[];
  confidence: {
    score: number; reasoning: string;
    checklist: { label: string; met: boolean; caveat?: boolean }[];
  };
  finalRecommendations: string[];
  /** Per-stage timing/status from the 6-stage generation pipeline — additive/optional
   * so reports saved before this field existed (localStorage/DB) still normalize fine. */
  pipeline?: { stage: string; status: string; durationMs: number; error?: string }[];
};

/**
 * Fills in safe defaults for any field the AI/backend response might be
 * missing so the report view can never crash on a partially-shaped object.
 * This is a defense-in-depth layer on top of the server-side zod validation.
 */
function normalizeReport(input: unknown, business: Business): Report {
  const r = (input ?? {}) as Partial<Report> & Record<string, any>;
  const arr = <T,>(v: unknown, fallback: T[] = []): T[] => (Array.isArray(v) ? v : fallback);
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

  return {
    companyName: str(r.companyName, business.companyName || "Your Business"),
    executiveSummary: str(r.executiveSummary, "Strategy summary unavailable."),
    businessAnalysis: {
      model: str(r.businessAnalysis?.model, business.industry || "Not specified"),
      audience: str(r.businessAnalysis?.audience, business.audience || "Not specified"),
      strengths: str(r.businessAnalysis?.strengths, "Not specified"),
      currentPosition: str(r.businessAnalysis?.currentPosition, "Not specified"),
    },
    swot: {
      strengths: arr<string>(r.swot?.strengths),
      weaknesses: arr<string>(r.swot?.weaknesses),
      opportunities: arr<string>(r.swot?.opportunities),
      threats: arr<string>(r.swot?.threats),
    },
    competitorAnalysis: {
      topCompetitors: arr(r.competitorAnalysis?.topCompetitors),
      competitiveAdvantages: arr<string>(r.competitorAnalysis?.competitiveAdvantages),
      marketGaps: arr<string>(r.competitorAnalysis?.marketGaps),
      differentiationStrategy: str(r.competitorAnalysis?.differentiationStrategy),
    },
    marketingStrategy: arr(r.marketingStrategy),
    budgetAllocation: arr(r.budgetAllocation),
    actionPlan: {
      week1: arr<string>(r.actionPlan?.week1),
      week2: arr<string>(r.actionPlan?.week2),
      week3: arr<string>(r.actionPlan?.week3),
      week4: arr<string>(r.actionPlan?.week4),
    },
    ninetyDayStrategy: {
      month1: { theme: str(r.ninetyDayStrategy?.month1?.theme, "Foundation"), keyActions: arr<string>(r.ninetyDayStrategy?.month1?.keyActions) },
      month2: { theme: str(r.ninetyDayStrategy?.month2?.theme, "Acceleration"), keyActions: arr<string>(r.ninetyDayStrategy?.month2?.keyActions) },
      month3: { theme: str(r.ninetyDayStrategy?.month3?.theme, "Scale"), keyActions: arr<string>(r.ninetyDayStrategy?.month3?.keyActions) },
    },
    seo: {
      primaryKeywords: arr<string>(r.seo?.primaryKeywords),
      secondaryKeywords: arr<string>(r.seo?.secondaryKeywords),
      longTailKeywords: arr<string>(r.seo?.longTailKeywords),
      metaTitle: str(r.seo?.metaTitle),
      metaDescription: str(r.seo?.metaDescription),
      blogIdeas: arr<string>(r.seo?.blogIdeas),
      internalLinking: arr<string>(r.seo?.internalLinking),
    },
    contentIdeas: {
      instagramPosts: arr<string>(r.contentIdeas?.instagramPosts),
      reels: arr<string>(r.contentIdeas?.reels),
      stories: arr<string>(r.contentIdeas?.stories),
      facebookPosts: arr<string>(r.contentIdeas?.facebookPosts),
      linkedinPosts: arr<string>(r.contentIdeas?.linkedinPosts),
      emailCampaigns: arr<string>(r.contentIdeas?.emailCampaigns),
    },
    kpis: {
      expectedLeads: str(r.kpis?.expectedLeads, "Insufficient data"),
      conversionRate: str(r.kpis?.conversionRate, "Insufficient data"),
      roas: str(r.kpis?.roas, "Insufficient data"),
      ctr: str(r.kpis?.ctr, "Insufficient data"),
      trafficGrowth: str(r.kpis?.trafficGrowth, "Insufficient data"),
      monthlySales: str(r.kpis?.monthlySales, "Insufficient data"),
    },
    leadScore: {
      // Deterministic — computed server-side from actual inputs, not AI-generated.
      // Fallbacks here only cover the (rare) case of a malformed/partial API response.
      score: Math.max(0, Math.min(100, num(r.leadScore?.score, 0))),
      tier: str(r.leadScore?.tier, "Cold"),
      reasoning: str(r.leadScore?.reasoning, "Insufficient data"),
      breakdown: arr(r.leadScore?.breakdown),
    },
    recommendedPlan: {
      name: str(r.recommendedPlan?.name, "Growth"),
      monthlyPrice: num(r.recommendedPlan?.monthlyPrice, 3499),
      reasoning: str(r.recommendedPlan?.reasoning, "Insufficient data"),
    },
    riskAnalysis: arr(r.riskAnalysis),
    confidence: {
      score: Math.max(0, Math.min(100, num(r.confidence?.score, 0))),
      reasoning: str(r.confidence?.reasoning, "Insufficient data"),
      checklist: arr(r.confidence?.checklist),
    },
    finalRecommendations: arr<string>(r.finalRecommendations),
    pipeline: arr(r.pipeline),
  };
}

type Saved = { business: Business; report: Report } | null;

type AssistantInsight = {
  summary: string;
  followUpQuestions: string[];
  recommendedServices: string[];
  pricingGuidance: string;
  websiteGuide: string;
  nextAction: string;
};

function loadSaved(): Saved {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

const ACTIONS = [
  { id: "google-ads", label: "Google Ads Copy", icon: Megaphone },
  { id: "facebook-ads", label: "Facebook Ads Copy", icon: Megaphone },
  { id: "instagram-captions", label: "Instagram Captions", icon: Sparkles },
  { id: "seo-keywords", label: "SEO Keywords", icon: Search },
  { id: "content-calendar", label: "30-Day Content Calendar", icon: Calendar },
  { id: "email-campaign", label: "Email Marketing Campaign", icon: FileText },
];

// Endpoints now live on the local FastAPI backend (see src/lib/api.ts). No API key
// is sent from the browser: FastAPI holds the Gemini key server-side.

const serviceMap: Record<string, string[]> = {
  b2b: ["Paid Media Strategy", "Lead Generation Funnel", "SEO Growth System"],
  ecommerce: ["Meta Ads Growth", "Conversion Rate Optimization", "Retention Email Campaigns"],
  service: ["Local Visibility Campaign", "Google Ads Management", "Content Funnel"],
  agency: ["Offer Positioning", "Sales Funnel Build", "Content Engine"],
};

const getBudgetBand = (budget: string) => {
  const numeric = Number(String(budget).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) return "unknown";
  if (numeric < 1000) return "starter";
  if (numeric < 5000) return "growth";
  return "scale";
};

const buildAiEmployeeInsight = (business: Business): AssistantInsight => {
  const budgetBand = getBudgetBand(business.budget);
  const goalLower = business.goal.toLowerCase();
  const industryLower = business.industry.toLowerCase();
  const serviceList = serviceMap[
    industryLower.includes("saas") || industryLower.includes("b2b") ? "b2b" :
    industryLower.includes("ecommerce") || industryLower.includes("shop") ? "ecommerce" :
    industryLower.includes("agency") || industryLower.includes("service") ? "agency" :
    "service"
  ];

  const summary = `${business.companyName || "Your business"} appears to need a ${budgetBand === "starter" ? "focused, low-overhead" : budgetBand === "growth" ? "balanced growth" : "scalable acceleration"} plan for ${business.goal || "better revenue growth"}. The AI Employee will prioritize the most efficient acquisition path based on your current channels and market position.`;

  const followUpQuestions = [
    business.audience ? "" : "Who is your primary buyer, and what problem do they pay to solve?",
    business.currentChannels ? "" : "Which channels are already producing measurable traffic or leads?",
    business.goal ? "" : "What is the single most important business outcome you want in the next 90 days?",
  ].filter(Boolean);

  const pricingGuidance = budgetBand === "starter"
    ? "Recommended starting point: a focused service bundle around one channel plus conversion support, with a monthly advisory retainer and a small paid-media test budget."
    : budgetBand === "growth"
      ? "Recommended fit: a blended growth package that includes channel strategy, creative production, and weekly optimization to accelerate conversion and lead quality."
      : "Recommended fit: a full-funnel growth engagement with reporting, creative execution, and channel scaling to support faster revenue expansion.";

  const websiteGuide = goalLower.includes("lead") || goalLower.includes("sales")
    ? "Review the Services section for lead generation and the Pricing section to align the recommended growth package with your budget."
    : "Start with the Services section to see which marketing engine fits your growth objective, then compare the options in Pricing before contacting the team.";

  const nextAction = business.currentChannels
    ? `The best next move is to double down on ${business.currentChannels.split(/[,\n]/)[0].trim() || "your highest-performing channel"} while using the report to build the rest of the funnel.`
    : "The AI Employee recommends starting with a channel audit, then using one high-ROI offer to validate the best acquisition route before scaling spend.";

  return {
    summary,
    followUpQuestions,
    recommendedServices: serviceList,
    pricingGuidance,
    websiteGuide,
    nextAction,
  };
};

// The pipeline runs up to 4 sequential AI calls (vs. 1 previously), so it needs a
// longer budget than a single-call request did. Must stay in sync with the stage ids
// the marketing-report edge function streams (see STAGE_IDS in its index.ts).
const REPORT_TIMEOUT_MS = 180_000;

const PIPELINE_STAGE_DEFS: { id: string; label: string }[] = [
  { id: "business-analyst", label: "Business Analyst" },
  { id: "lead-scorer", label: "Lead Scorer" },
  { id: "competitor-analyst", label: "Competitor Analyst" },
  { id: "marketing-strategist", label: "Marketing Strategist" },
  { id: "content-generator", label: "Content Generator" },
  { id: "campaign-assistant", label: "Campaign Assistant" },
];

function initialPipelineStages(): PipelineStageState[] {
  return PIPELINE_STAGE_DEFS.map((d) => ({ id: d.id, label: d.label, status: "pending" as const }));
}

export const MarketingStrategist = () => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"intake" | "loading" | "report" | "error" | "action" | "chat">("intake");
  const [business, setBusiness] = useState<Business>({
    companyName: "", industry: "", audience: "", budget: "", goal: "", currentChannels: "",
  });
  const [report, setReport] = useState<Report | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageState[]>(initialPipelineStages());
  const [actionResult, setActionResult] = useState<{ id: string; label: string; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assistantInsight, setAssistantInsight] = useState<AssistantInsight | null>(null);

  // Load saved
  useEffect(() => {
    const s = loadSaved();
    if (s) { setBusiness(s.business); setReport(s.report); setStage("report"); }
  }, []);

  useEffect(() => {
    setAssistantInsight(buildAiEmployeeInsight(business));
  }, [business]);

  const generateReport = async () => {
    if (!business.companyName || !business.industry) {
      toast.error("Please fill in at least company name and industry");
      return;
    }
    const insight = buildAiEmployeeInsight(business);
    setAssistantInsight(insight);
    if (insight.followUpQuestions.length > 0) {
      toast.info(`AI Employee note: ${insight.followUpQuestions[0]}`);
    }
    setStage("loading");
    setReportError(null);
    setPipelineStages(initialPipelineStages());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
    const requestStartedAt = performance.now();

    try {
      console.info("[AI Employee] Generating report", { companyName: business.companyName, industry: business.industry, url: apiUrl("/api/marketing-report") });

      let res: Response;
      try {
        res = await fetch(apiUrl("/api/marketing-report"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business }),
          signal: controller.signal,
        });
      } catch (networkErr) {
        if (networkErr instanceof DOMException && networkErr.name === "AbortError") {
          throw new Error("The AI Employee took too long to respond. Please try again.");
        }
        console.error("[AI Employee] Network error calling marketing-report:", { url: apiUrl("/api/marketing-report"), networkErr });
        // "Failed to fetch" (a bare TypeError) means the browser couldn't even reach the
        // server — almost always a local-dev setup issue, not a real network outage.
        // Give a specific, actionable message instead of a generic one so this is
        // self-diagnosable next time instead of a dead end.
        if (networkErr instanceof TypeError) {
          throw new Error(
            `Could not connect to the AI backend at ${API_URL}. This usually means the local FastAPI server isn't running. Check: ` +
            `(1) a terminal in backend/ has "uvicorn app.main:app --reload --port 8000" running with no errors, ` +
            `(2) backend/.env exists (copied from backend/.env.example) with DATABASE_URL and GEMINI_API_KEY set, ` +
            `(3) http://localhost:8000/api/health responds. ` +
            `See backend/README.md for the full setup.`
          );
        }
        throw new Error("Could not reach the AI service. Check your connection and try again.");
      }

      // A non-OK response means validation/config failed before the pipeline ever
      // started (bad input, missing AI key) — that's a plain JSON error body, not a
      // stream. Parse it defensively: a non-JSON error page (proxy/CDN error, cold-start
      // HTML, etc.) must not silently collapse into a useless message.
      if (!res.ok) {
        const rawBody = await res.text();
        let data: { error?: string } = {};
        try {
          data = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          console.error("[AI Employee] Response was not valid JSON:", { status: res.status, bodyPreview: rawBody.slice(0, 300) });
          throw new Error(`Server returned an unexpected response (status ${res.status}). Please try again.`);
        }
        console.error("[AI Employee] marketing-report returned an error:", { status: res.status, error: data.error });
        throw new Error(data.error || `Report generation failed (status ${res.status})`);
      }

      // The pipeline streams newline-delimited JSON events: {type:"stage",...} for each
      // of the 6 stages transitioning running -> done|failed, then either
      // {type:"final", report} on success or {type:"error"} if a stage failed.
      if (!res.body) throw new Error("This browser doesn't support streaming responses. Please try a different browser.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalReportRaw: unknown = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { lines, remainder } = splitNdjsonLines(buffer);
        buffer = remainder;
        for (const line of lines) {
          let event: PipelineStageEvent;
          try {
            event = JSON.parse(line);
          } catch {
            console.error("[AI Employee] Malformed pipeline event line, skipping:", line.slice(0, 200));
            continue;
          }
          if (event.type === "stage") {
            setPipelineStages((prev) => applyPipelineStageEvent(prev, event));
            if (event.status === "failed") streamError = event.error || `${event.stage} failed`;
          } else if (event.type === "final") {
            finalReportRaw = event.report;
          } else if (event.type === "error") {
            streamError = event.error || "Pipeline failed";
          }
        }
      }

      if (!finalReportRaw) {
        throw new Error(streamError || "Pipeline did not return a report. Please try again.");
      }

      const normalized = normalizeReport(finalReportRaw, business);
      console.info("[AI Employee] Report generated successfully", {
        companyName: normalized.companyName,
        elapsedMs: Math.round(performance.now() - requestStartedAt),
      });

      // Persist the report (best-effort — a save failure should never block showing
      // the report the user already spent AI quota generating).
      try {
        await apiPost("/api/reports", {
          company_name: business.companyName,
          business_data: business,
          report_data: normalized,
        });
      } catch (dbErr) {
        console.error("[AI Employee] Failed to save report to database:", dbErr);
      }

      setReport(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ business, report: normalized }));
      setStage("report");
      toast.success("AI Employee strategy report generated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate report";
      console.error("[AI Employee] generateReport failed:", msg, e);
      let friendly = msg;
      if (msg.includes("429")) friendly = "Rate limit reached. Please try again shortly.";
      else if (msg.includes("402")) friendly = "AI credits exhausted. Please contact support.";
      setReportError(friendly);
      toast.error("Failed to generate report");
      setStage("error");
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const runAction = async (id: string, label: string) => {
    if (!report) return;
    setActionLoading(id);
    try {
      const res = await fetch(apiUrl("/api/marketing-action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: id, business, report }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setActionResult({ id, label, text: data.text });
      setStage("action");
    } catch (e) {
      console.error("[AI Employee] Action failed:", { action: id, url: apiUrl("/api/marketing-action"), e });
      if (e instanceof TypeError) {
        toast.error("Can't reach the local AI backend — is the FastAPI server running on port 8000?");
      } else {
        toast.error("Action failed. Try again.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const saveActionResult = async (text: string) => {
    if (!actionResult) return;
    try {
      await apiPost("/api/generated-content", {
        company_name: business.companyName,
        action_type: actionResult.id,
        label: actionResult.label,
        content: text,
      });
      toast.success("Saved");
    } catch (e) {
      console.error("[AI Employee] Failed to save generated content:", e);
      toast.error("Could not save (is the local database running?)");
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReport(null);
    setReportError(null);
    setBusiness({ companyName: "", industry: "", audience: "", budget: "", goal: "", currentChannels: "" });
    setStage("intake");
    toast.success("Reset complete");
  };

  const downloadPDF = () => {
    if (!report) return;
    try {
      generatePDF(report, business);
      toast.success("Report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("PDF generation failed. Please try again.");
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 group"
            aria-label="Open AI Marketing Strategist"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-2 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-6xl h-full md:h-[90vh] bg-card border border-border md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-accent/10 shrink-0">
                <div className="flex items-center gap-3">
                  {(stage === "action" || stage === "chat") && (
                    <button onClick={() => setStage("report")} className="p-2 hover:bg-secondary rounded-lg">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-base leading-tight">NexaGrowth AI Employee</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Digital Marketing Consultant
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {stage === "report" && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> New
                      </Button>
                      <Button size="sm" onClick={downloadPDF} className="gap-1.5 bg-gradient-to-br from-primary to-accent">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </>
                  )}
                  <button onClick={() => setOpen(false)} className="p-2 hover:bg-secondary rounded-lg ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {stage === "intake" && (
                  <IntakeForm
                    business={business}
                    setBusiness={setBusiness}
                    onSubmit={generateReport}
                    assistantInsight={assistantInsight}
                  />
                )}
                {stage === "loading" && <PipelineStatus stages={pipelineStages} />}
                {stage === "error" && (
                  <ErrorView
                    message={reportError}
                    stages={pipelineStages}
                    onRetry={generateReport}
                    onEdit={() => setStage("intake")}
                  />
                )}
                {stage === "report" && report && (
                  <ReportView
                    report={report}
                    onAction={runAction}
                    actionLoading={actionLoading}
                    assistantInsight={assistantInsight}
                    onChat={() => setStage("chat")}
                  />
                )}
                {stage === "action" && actionResult && (
                  <ActionView
                    result={actionResult}
                    onRegenerate={() => runAction(actionResult.id, actionResult.label)}
                    onSave={saveActionResult}
                    regenerating={actionLoading === actionResult.id}
                  />
                )}
                {stage === "chat" && <ChatView business={business} report={report} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============ Intake ============
const IntakeForm = ({
  business, setBusiness, onSubmit, assistantInsight,
}: {
  business: Business;
  setBusiness: (b: Business) => void;
  onSubmit: () => void;
  assistantInsight: AssistantInsight | null;
}) => {
  const F = (k: keyof Business, label: string, placeholder: string, textarea = false) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      {textarea ? (
        <textarea
          value={business[k]} onChange={(e) => setBusiness({ ...business, [k]: e.target.value })}
          placeholder={placeholder} rows={2}
          className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
        />
      ) : (
        <input
          value={business[k]} onChange={(e) => setBusiness({ ...business, [k]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
        />
      )}
    </div>
  );
  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Wand2 className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-medium text-primary uppercase tracking-wider">AI Strategy Engine</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-2">Build Your Marketing Strategy</h2>
        <p className="text-sm text-muted-foreground">Tell us about your business. The AI Employee will assess your goals, recommend the right service path, and guide you through the site.</p>
        {assistantInsight && (
          <div className="mt-4 rounded-xl border border-border bg-primary/5 p-3 text-left text-sm">
            <p className="font-medium text-foreground">AI Employee context</p>
            <p className="text-muted-foreground mt-1">{assistantInsight.summary}</p>
            <p className="text-muted-foreground mt-2">{assistantInsight.websiteGuide}</p>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {F("companyName", "Company Name *", "Acme Inc.")}
        {F("industry", "Industry / Business Type *", "B2B SaaS, D2C apparel, etc.")}
        {F("audience", "Target Audience", "SMB founders, 25-45")}
        {F("budget", "Monthly Marketing Budget", "$3,000 - $5,000")}
        <div className="md:col-span-2">{F("goal", "Top Goal (Next 90 Days)", "Generate 100 qualified leads")}</div>
        <div className="md:col-span-2">{F("currentChannels", "Current Marketing Channels", "What are you doing today?", true)}</div>
      </div>
      <Button onClick={onSubmit} className="w-full mt-6 h-11 bg-gradient-to-br from-primary to-accent text-base">
        <Sparkles className="w-4 h-4 mr-2" /> Consult with AI Employee
      </Button>
    </div>
  );
};

// ============ Error ============
const ErrorView = ({
  message, stages, onRetry, onEdit,
}: { message: string | null; stages?: PipelineStageState[]; onRetry: () => void; onEdit: () => void }) => {
  const ranStages = (stages ?? []).filter((s) => s.status !== "pending");
  return (
    <div className="h-full flex flex-col items-center justify-center p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-xl font-heading font-semibold mb-2">Failed to generate report</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {message || "Something went wrong while the AI Employee was building your strategy."}
      </p>
      {ranStages.length > 0 && (
        <div className="w-full max-w-md space-y-1.5 mb-6 text-left">
          {ranStages.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                s.status === "failed" ? "border-red-500/40 bg-red-500/5" : s.status === "done" ? "border-green-500/30 bg-green-500/5" : "border-border"
              }`}
            >
              <span>{s.label}</span>
              <span className={s.status === "failed" ? "text-red-500" : s.status === "done" ? "text-green-500" : "text-muted-foreground"}>
                {s.status === "failed" ? "Failed" : s.status === "done" ? "Completed" : s.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={onRetry} className="gap-1.5 bg-gradient-to-br from-primary to-accent" data-testid="retry-button">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </Button>
        <Button variant="outline" onClick={onEdit} className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
        </Button>
      </div>
    </div>
  );
};

// ============ Report ============
const SectionCard = ({
  icon: Icon, title, defaultOpen = true, children,
}: { icon: LucideIcon; title: string; defaultOpen?: boolean; children: React.ReactNode }) => (
  <Collapsible defaultOpen={defaultOpen} className="bg-card border border-border rounded-xl overflow-hidden">
    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-heading font-semibold text-sm md:text-base">{title}</h3>
      </div>
      <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="p-4 pt-0 md:p-5 md:pt-0 border-t border-border/50">{children}</div>
    </CollapsibleContent>
  </Collapsible>
);

const Pill = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "green" | "red" | "blue" | "amber" }) => {
  const tones = {
    default: "bg-secondary text-foreground",
    green: "bg-green-500/10 text-green-500 border border-green-500/20",
    red: "bg-red-500/10 text-red-500 border border-red-500/20",
    blue: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  };
  return <span className={`inline-block px-2 py-1 rounded-md text-xs ${tones[tone]}`}>{children}</span>;
};

const ReportView = ({
  report, onAction, actionLoading, assistantInsight, onChat,
}: {
  report: Report;
  onAction: (id: string, label: string) => void;
  actionLoading: string | null;
  assistantInsight: AssistantInsight | null;
  onChat: () => void;
}) => {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Hero summary */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-primary font-medium mb-1">AI Employee Strategy Report</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold">{report.companyName}</h2>
          </div>
          <div className="flex items-start gap-6">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead Score</p>
              <p className="text-3xl font-heading font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                {report.leadScore.score}<span className="text-base">/100</span>
              </p>
              <Pill tone={report.leadScore.score >= 70 ? "green" : report.leadScore.score >= 40 ? "blue" : "amber"}>{report.leadScore.tier}</Pill>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Confidence</p>
              <p className="text-3xl font-heading font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                {report.confidence.score}%
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm md:text-base text-foreground/80 mt-4 leading-relaxed">{report.executiveSummary}</p>
        <p className="text-xs text-muted-foreground mt-2">{report.leadScore.reasoning}</p>
        {report.leadScore.breakdown.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.leadScore.breakdown.map((f) => (
              <span key={f.label} title={f.note} className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                {f.label} <span className="text-foreground font-medium">+{f.points}</span>/{f.max}
              </span>
            ))}
          </div>
        )}
        {assistantInsight && (
          <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-card/70 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Recommended services</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {assistantInsight.recommendedServices.map((service) => (
                  <span key={service} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{service}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card/70 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Recommended pricing plan</p>
              <p className="mt-2 font-semibold">{report.recommendedPlan.name} — ${report.recommendedPlan.monthlyPrice.toLocaleString()}/mo</p>
              <p className="mt-1 text-foreground/80">{report.recommendedPlan.reasoning}</p>
            </div>
            <div className="rounded-lg border border-border bg-card/70 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pricing guidance</p>
              <p className="mt-2 text-foreground/80">{assistantInsight.pricingGuidance}</p>
            </div>
          </div>
        )}
        <div className="mt-4">
          <Progress value={report.confidence.score} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-2">{report.confidence.reasoning}</p>
          {report.confidence.checklist.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {report.confidence.checklist.map((c) => (
                <li key={c.label} className={c.caveat ? "text-amber-500" : c.met ? "text-green-500" : "text-muted-foreground"}>
                  {c.caveat ? "⚠" : c.met ? "✓" : "✗"} {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 flex-wrap border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> Want to ask follow-up questions? Talk to the strategy advisor.
          </p>
          <Button onClick={onChat} className="bg-gradient-to-br from-primary to-accent text-white gap-2">
            <MessageSquare className="w-4 h-4" /> Chat with Advisor
          </Button>
        </div>
      </div>

      {/* KPIs strip */}
      <p className="text-[11px] text-muted-foreground -mb-1 flex items-center gap-1">
        <Gauge className="w-3 h-3" /> AI-projected targets based on stated inputs — not live connected analytics
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { l: "Leads", v: report.kpis.expectedLeads, i: Users },
          { l: "Conv. Rate", v: report.kpis.conversionRate, i: Target },
          { l: "ROAS", v: report.kpis.roas, i: TrendingUp },
          { l: "CTR", v: report.kpis.ctr, i: BarChart3 },
          { l: "Traffic", v: report.kpis.trafficGrowth, i: TrendingUp },
          { l: "Sales", v: report.kpis.monthlySales, i: DollarSign },
        ].map((k) => (
          <div key={k.l} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <k.i className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">{k.l}</span>
            </div>
            <p className={`font-heading font-semibold ${k.v === "Insufficient data" ? "text-[11px] text-muted-foreground italic" : "text-sm md:text-base"}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Business Analysis */}
      <SectionCard icon={Lightbulb} title="Business Analysis">
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Model</p><p>{report.businessAnalysis.model}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Audience</p><p>{report.businessAnalysis.audience}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Strengths</p><p>{report.businessAnalysis.strengths}</p></div>
          <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Current Position</p><p>{report.businessAnalysis.currentPosition}</p></div>
        </div>
      </SectionCard>

      {/* SWOT */}
      <SectionCard icon={Gauge} title="SWOT Analysis">
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {[
            { key: "strengths", title: "Strengths", tone: "green" as const },
            { key: "weaknesses", title: "Weaknesses", tone: "red" as const },
            { key: "opportunities", title: "Opportunities", tone: "blue" as const },
            { key: "threats", title: "Threats", tone: "amber" as const },
          ].map((s) => (
            <div key={s.key} className="rounded-lg border border-border p-3">
              <Pill tone={s.tone}>{s.title}</Pill>
              <ul className="mt-2 space-y-1.5 list-disc list-inside text-foreground/80">
                {report.swot[s.key].map((x: string, i: number) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Competitors */}
      <SectionCard icon={Users} title="Competitor Analysis">
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground mb-2">Top Competitors</p>
            <div className="grid md:grid-cols-2 gap-2">
              {report.competitorAnalysis.topCompetitors.map((c, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase text-muted-foreground mb-1">Competitive Advantages</p>
              <ul className="list-disc list-inside space-y-1">{report.competitorAnalysis.competitiveAdvantages.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div>
              <p className="text-[11px] uppercase text-muted-foreground mb-1">Market Gaps</p>
              <ul className="list-disc list-inside space-y-1">{report.competitorAnalysis.marketGaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground mb-1">Differentiation Strategy</p>
            <p>{report.competitorAnalysis.differentiationStrategy}</p>
          </div>
        </div>
      </SectionCard>

      {/* Marketing Strategy */}
      <SectionCard icon={Megaphone} title="Marketing Strategy & Channels">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
              <th className="text-left py-2 px-2">Channel</th><th className="text-left py-2 px-2">Priority</th><th className="text-left py-2 px-2">Why</th>
            </tr></thead>
            <tbody>
              {report.marketingStrategy.map((m, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-2.5 px-2 font-medium">{m.channel}</td>
                  <td className="py-2.5 px-2"><Pill tone={m.priority.toLowerCase().includes("high") ? "green" : m.priority.toLowerCase().includes("med") ? "blue" : "default"}>{m.priority}</Pill></td>
                  <td className="py-2.5 px-2 text-foreground/80">{m.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Budget */}
      <SectionCard icon={DollarSign} title="Budget Allocation">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
              <th className="text-left py-2 px-2">Channel</th><th className="text-left py-2 px-2">%</th><th className="text-left py-2 px-2">Amount</th><th className="text-left py-2 px-2">Expected ROI</th>
            </tr></thead>
            <tbody>
              {report.budgetAllocation.map((b, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="py-2.5 px-2 font-medium">{b.channel}</td>
                  <td className="py-2.5 px-2 w-32">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-10">{b.percent}%</span>
                      <Progress value={b.percent} className="h-1.5 flex-1" />
                    </div>
                  </td>
                  <td className="py-2.5 px-2">${b.amount.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-green-500">{b.expectedRoi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 30-day plan */}
      <SectionCard icon={Calendar} title="30-Day Action Plan">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {(["week1", "week2", "week3", "week4"] as const).map((w, i) => (
            <div key={w} className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-primary font-semibold mb-2">Week {i + 1}</p>
              <ul className="space-y-1.5">
                {report.actionPlan[w].map((t, j) => (
                  <li key={j} className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /><span>{t}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 90-day strategy */}
      <SectionCard icon={TrendingUp} title="90-Day Marketing Strategy">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {([
            { key: "month1", label: "Month 1" },
            { key: "month2", label: "Month 2" },
            { key: "month3", label: "Month 3" },
          ] as const).map((m) => (
            <div key={m.key} className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-primary font-semibold mb-1">{m.label}</p>
              <p className="font-medium mb-2">{report.ninetyDayStrategy[m.key].theme}</p>
              <ul className="space-y-1.5">
                {report.ninetyDayStrategy[m.key].keyActions.map((t, j) => (
                  <li key={j} className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /><span>{t}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* SEO */}
      <SectionCard icon={Search} title="SEO Recommendations" defaultOpen={false}>
        <div className="space-y-4 text-sm">
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { l: "Primary Keywords", v: report.seo.primaryKeywords, t: "green" as const },
              { l: "Secondary Keywords", v: report.seo.secondaryKeywords, t: "blue" as const },
              { l: "Long-tail Keywords", v: report.seo.longTailKeywords, t: "default" as const },
            ].map((g) => (
              <div key={g.l}>
                <p className="text-[11px] uppercase text-muted-foreground mb-2">{g.l}</p>
                <div className="flex flex-wrap gap-1.5">{g.v.map((k, i) => <Pill key={i} tone={g.t}>{k}</Pill>)}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Meta Title</p><p className="rounded-md bg-secondary/50 p-2">{report.seo.metaTitle}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Meta Description</p><p className="rounded-md bg-secondary/50 p-2">{report.seo.metaDescription}</p></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Blog Ideas</p><ul className="list-disc list-inside space-y-1">{report.seo.blogIdeas.map((b, i) => <li key={i}>{b}</li>)}</ul></div>
            <div><p className="text-[11px] uppercase text-muted-foreground mb-1">Internal Linking</p><ul className="list-disc list-inside space-y-1">{report.seo.internalLinking.map((b, i) => <li key={i}>{b}</li>)}</ul></div>
          </div>
        </div>
      </SectionCard>

      {/* Content Ideas */}
      <SectionCard icon={Sparkles} title="Content Ideas" defaultOpen={false}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            { l: "Instagram Posts", v: report.contentIdeas.instagramPosts },
            { l: "Reels", v: report.contentIdeas.reels },
            { l: "Stories", v: report.contentIdeas.stories },
            { l: "Facebook Posts", v: report.contentIdeas.facebookPosts },
            { l: "LinkedIn Posts", v: report.contentIdeas.linkedinPosts },
            { l: "Email Campaigns", v: report.contentIdeas.emailCampaigns },
          ].map((g) => (
            <div key={g.l} className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-primary font-semibold mb-2">{g.l}</p>
              <ul className="space-y-1 list-disc list-inside text-foreground/80">{g.v.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Risks */}
      <SectionCard icon={ShieldAlert} title="Risk Analysis" defaultOpen={false}>
        <div className="space-y-2">
          {report.riskAnalysis.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div><p className="font-semibold">{r.risk}</p><p className="text-foreground/70 text-xs mt-1"><span className="text-green-500 font-medium">Mitigation:</span> {r.mitigation}</p></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Next actions */}
      <SectionCard icon={CheckCircle2} title="Next Actions">
        <ul className="space-y-2 text-sm">
          {report.finalRecommendations.map((r, i) => (
            <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span>{r}</span></li>
          ))}
        </ul>
      </SectionCard>

      {/* Actions */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
        <h3 className="font-heading font-semibold mb-1 flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> Next Recommended Actions</h3>
        <p className="text-xs text-muted-foreground mb-4">Your business context is remembered — click any action to generate.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => onAction(a.id, a.label)}
              disabled={actionLoading !== null}
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-secondary/40 transition-all text-sm font-medium text-left disabled:opacity-50"
            >
              <span className="flex items-center gap-2"><a.icon className="w-4 h-4 text-primary" /> {a.label}</span>
              {actionLoading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ Action result ============
const ActionView = ({
  result, onRegenerate, onSave, regenerating,
}: {
  result: { id: string; label: string; text: string };
  onRegenerate: () => void;
  onSave: (text: string) => void | Promise<void>;
  regenerating: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result.text);
  const [saving, setSaving] = useState(false);

  // Reset local draft whenever a new/regenerated result comes in.
  useEffect(() => { setDraft(result.text); setEditing(false); }, [result.text, result.id]);

  const handleCopy = () => { navigator.clipboard.writeText(draft); toast.success("Copied"); };
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-heading font-bold">{result.label}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRegenerate} disabled={regenerating} className="gap-1.5">
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Regenerate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)} className="gap-1.5">
            {editing ? "Preview" : "Edit"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-gradient-to-br from-primary to-accent">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/60 resize-y"
          />
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-table:text-xs prose-th:text-foreground">
            <ReactMarkdown>{draft}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ PDF ============
function generatePDF(report: Report, business: Business) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 0;

  // Cover
  doc.setFillColor(20, 14, 38); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(124, 58, 237); doc.rect(0, 0, W, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("NEXAGROWTH AI", M, 90);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(180, 170, 220);
  doc.text("Enterprise Marketing Strategy Report", M, 108);

  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(32);
  doc.text(report.companyName, M, H / 2 - 40, { maxWidth: W - M * 2 });
  doc.setFontSize(14); doc.setTextColor(200, 195, 230); doc.setFont("helvetica", "normal");
  doc.text(business.industry || "Marketing Strategy", M, H / 2 - 10);
  doc.setFontSize(10); doc.setTextColor(160, 150, 200);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, H / 2 + 14);

  doc.setDrawColor(124, 58, 237); doc.setLineWidth(2); doc.line(M, H - 120, M + 60, H - 120);
  doc.setTextColor(220, 215, 240); doc.setFontSize(9);
  doc.text(`AI Confidence Score: ${report.confidence.score}%  ·  Lead Score: ${report.leadScore.score}/100 (${report.leadScore.tier})`, M, H - 96);
  doc.setTextColor(140, 130, 180); doc.setFontSize(8);
  doc.text("Confidential · Prepared by NexaGrowth AI Strategy Engine", M, H - 60);

  // Helper
  const addPage = () => { doc.addPage(); y = M; doc.setTextColor(0, 0, 0); };
  const section = (title: string) => {
    if (y > H - 120) addPage();
    doc.setFillColor(124, 58, 237); doc.rect(M, y, 4, 18, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(20, 14, 38);
    doc.text(title, M + 14, y + 14);
    y += 30;
  };
  const para = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(40, 40, 50);
    const lines = doc.splitTextToSize(text, W - M * 2);
    for (const ln of lines) {
      if (y > H - M) addPage();
      doc.text(ln, M, y); y += size + 4;
    }
    y += 6;
  };
  const bullets = (items: string[]) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 50);
    for (const it of items) {
      const lines = doc.splitTextToSize(`• ${it}`, W - M * 2 - 10);
      for (const ln of lines) {
        if (y > H - M) addPage();
        doc.text(ln, M + 6, y); y += 14;
      }
    }
    y += 6;
  };
  const subhead = (text: string) => {
    if (y > H - 60) addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(80, 60, 140);
    doc.text(text, M, y); y += 16;
  };
  const table = (head: string[], body: Array<Array<string | number>>) => {
    autoTable(doc, {
      head: [head], body, startY: y, margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 242, 252] },
      didDrawPage: () => {
        const jsPdfWithTableState = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
        y = jsPdfWithTableState.lastAutoTable?.finalY ?? y;
      },
    });
    const jsPdfWithTableState = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
    y = (jsPdfWithTableState.lastAutoTable?.finalY ?? y) + 14;
  };

  // Executive Summary
  addPage();
  section("Executive Summary");
  para(report.executiveSummary);

  // Business Analysis
  section("Business Analysis");
  subhead("Model"); para(report.businessAnalysis.model);
  subhead("Audience"); para(report.businessAnalysis.audience);
  subhead("Strengths"); para(report.businessAnalysis.strengths);
  subhead("Current Position"); para(report.businessAnalysis.currentPosition);

  // SWOT
  section("SWOT Analysis");
  subhead("Strengths"); bullets(report.swot.strengths);
  subhead("Weaknesses"); bullets(report.swot.weaknesses);
  subhead("Opportunities"); bullets(report.swot.opportunities);
  subhead("Threats"); bullets(report.swot.threats);

  // Competitors
  section("Competitor Analysis");
  table(["Competitor", "Notes"], report.competitorAnalysis.topCompetitors.map(c => [c.name, c.note]));
  subhead("Competitive Advantages"); bullets(report.competitorAnalysis.competitiveAdvantages);
  subhead("Market Gaps"); bullets(report.competitorAnalysis.marketGaps);
  subhead("Differentiation Strategy"); para(report.competitorAnalysis.differentiationStrategy);

  // Marketing Strategy
  section("Marketing Strategy");
  table(["Channel", "Priority", "Rationale"], report.marketingStrategy.map(m => [m.channel, m.priority, m.why]));

  // Recommended Plan
  section("Recommended Pricing Plan");
  para(`${report.recommendedPlan.name} — $${report.recommendedPlan.monthlyPrice.toLocaleString()}/mo`, 12);
  para(report.recommendedPlan.reasoning);

  // 90-Day Strategy
  section("90-Day Marketing Strategy");
  ([["Month 1", report.ninetyDayStrategy.month1], ["Month 2", report.ninetyDayStrategy.month2], ["Month 3", report.ninetyDayStrategy.month3]] as const).forEach(([label, m]) => {
    subhead(`${label}: ${m.theme}`); bullets(m.keyActions);
  });

  // SEO
  section("SEO Strategy");
  subhead("Primary Keywords"); para(report.seo.primaryKeywords.join(", "));
  subhead("Secondary Keywords"); para(report.seo.secondaryKeywords.join(", "));
  subhead("Long-tail Keywords"); para(report.seo.longTailKeywords.join(", "));
  subhead("Meta Title"); para(report.seo.metaTitle);
  subhead("Meta Description"); para(report.seo.metaDescription);
  subhead("Blog Ideas"); bullets(report.seo.blogIdeas);

  // Budget
  section("Budget Allocation");
  table(["Channel", "%", "Amount (USD)", "Expected ROI"], report.budgetAllocation.map(b => [b.channel, `${b.percent}%`, `$${b.amount.toLocaleString()}`, b.expectedRoi]));

  // 30-day plan
  section("30-Day Action Plan");
  (["week1", "week2", "week3", "week4"] as const).forEach((w, i) => {
    subhead(`Week ${i + 1}`); bullets(report.actionPlan[w]);
  });

  // KPIs
  section("KPI Targets");
  table(["Metric", "Target"], [
    ["Expected Leads", report.kpis.expectedLeads],
    ["Conversion Rate", report.kpis.conversionRate],
    ["ROAS", report.kpis.roas],
    ["CTR", report.kpis.ctr],
    ["Traffic Growth", report.kpis.trafficGrowth],
    ["Monthly Sales", report.kpis.monthlySales],
  ]);

  // Risks
  section("Risk Analysis");
  table(["Risk", "Mitigation"], report.riskAnalysis.map(r => [r.risk, r.mitigation]));

  // Lead Score
  section("Lead Score");
  doc.setFont("helvetica", "bold"); doc.setFontSize(36); doc.setTextColor(124, 58, 237);
  doc.text(`${report.leadScore.score}/100 — ${report.leadScore.tier}`, M, y + 24); y += 40;
  para(report.leadScore.reasoning);

  // Confidence
  section("AI Confidence Score");
  doc.setFont("helvetica", "bold"); doc.setFontSize(36); doc.setTextColor(124, 58, 237);
  doc.text(`${report.confidence.score}%`, M, y + 24); y += 40;
  para(report.confidence.reasoning);

  // Next Actions
  section("Next Actions");
  bullets(report.finalRecommendations);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 230); doc.line(M, H - 36, W - M, H - 36);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(140, 140, 150);
    doc.text(`NexaGrowth AI · ${report.companyName} · Strategy Report`, M, H - 22);
    doc.text(`Page ${i} of ${pageCount}`, W - M, H - 22, { align: "right" });
  }

  doc.save(`nexagrowth-strategy-${report.companyName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ============ Chat advisor view ============

/**
 * Extracts the renderable text of one UI message.
 *
 * The AI SDK delivers a message as an ordered array of typed `parts`
 * (text / reasoning / tool calls / files) rather than a single `content` string,
 * so text parts are concatenated in order and every other part type is ignored.
 */
function messageText(msg: { parts?: { type: string; text?: string }[] }): string {
  return (msg.parts ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
}

const ChatView = ({
  business,
  report,
}: {
  business: Business;
  report: Report | null;
}) => {
  // Input state is owned by this component: `useChat` no longer manages it.
  const [input, setInput] = useState("");

  // `useChat` builds its Chat instance once and only rebuilds it when `id`/`chat`
  // changes — later option objects are ignored. So the transport is created once
  // too, and the request body is supplied as a function (`body` is a Resolvable,
  // resolved per request) reading from a ref. That keeps every request in sync with
  // the current business/report instead of closing over first-render values.
  const contextRef = useRef({ business, report });
  contextRef.current = { business, report };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl("/api/marketing-strategist"),
        body: () => ({
          business: contextRef.current.business,
          reportSummary: contextRef.current.report?.executiveSummary || "",
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  // 'submitted' = request sent, nothing streaming back yet; 'streaming' = tokens arriving.
  const isBusy = status === "submitted" || status === "streaming";

  const handleSend = (e: FormEvent) => {
    // Without preventDefault the browser performs a native form submission, which
    // reloads the entire SPA and drops the user back on the home page.
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    void sendMessage({ text });
  };

  // Automatically scroll to bottom when new messages arrive
  useEffect(() => {
    const el = document.getElementById("chat-scroll-anchor");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[75vh] max-w-4xl mx-auto p-4 md:p-6 bg-card border border-border/40 rounded-xl mt-6 shadow-inner">
      <div className="flex-grow overflow-y-auto pr-2 mb-4 space-y-4 max-h-[60vh]">
        {messages.filter((m) => m.role !== "system").map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-secondary text-foreground rounded-tl-none border border-border"
              }`}
            >
              <div className="prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-p:leading-relaxed text-foreground">
                <ReactMarkdown>{messageText(msg)}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isBusy && (
          <div className="flex justify-start">
            <div className="bg-secondary border border-border rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="flex justify-start">
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl rounded-tl-none px-4 py-3 flex items-start gap-2 max-w-[85%]">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-xs text-destructive">
                {error?.message || "The advisor could not respond. Please try again."}
              </span>
            </div>
          </div>
        )}
        <div id="chat-scroll-anchor" />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 bg-background p-2 rounded-xl border border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your marketing strategy..."
          className="flex-1 bg-transparent px-3 text-sm focus:outline-none"
          disabled={isBusy}
          aria-label="Message the marketing advisor"
        />
        <Button type="submit" size="icon" disabled={isBusy || !input.trim()} className="bg-gradient-to-br from-primary to-accent shrink-0">
          <Send className="w-4 h-4 text-white" />
        </Button>
      </form>
    </div>
  );
};

export default MarketingStrategist;
