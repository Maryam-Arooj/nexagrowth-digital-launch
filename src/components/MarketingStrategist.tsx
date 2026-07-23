import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, X, Loader2, Download, Sparkles, Target, TrendingUp, Users,
  BarChart3, Calendar, Search, FileText, AlertTriangle, Gauge, Lightbulb,
  DollarSign, Megaphone, ShieldAlert, ChevronDown, Wand2, RotateCcw, ArrowLeft,
  Copy, CheckCircle2, Flame, Snowflake, Award, Zap, ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

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
  riskAnalysis: { risk: string; mitigation: string }[];
  confidence: { score: number; reasoning: string };
  finalRecommendations: string[];
};

type Qualification = {
  leadScore: number;
  leadStatus: "Hot" | "Warm" | "Cold";
  businessPotential: string;
  recommendedPlan: "Starter" | "Growth" | "Enterprise";
  planReasoning: string;
  topPriorities: string[];
  nextAction: string;
  scoreBreakdown: {
    industryFit: number; goalClarity: number; budget: number; audience: number; channelMaturity: number;
  };
};

type Saved = { business: Business; report: Report; qualification?: Qualification | null } | null;

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

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const AUTH = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

export const MarketingStrategist = () => {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"intake" | "loading" | "report" | "action">("intake");
  const [business, setBusiness] = useState<Business>({
    companyName: "", industry: "", audience: "", budget: "", goal: "", currentChannels: "",
  });
  const [report, setReport] = useState<Report | null>(null);
  const [qualification, setQualification] = useState<Qualification | null>(null);
  const [actionResult, setActionResult] = useState<{ label: string; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load saved
  useEffect(() => {
    const s = loadSaved();
    if (s) {
      setBusiness(s.business);
      setReport(s.report);
      if (s.qualification) setQualification(s.qualification);
      setStage("report");
    }
  }, []);

  const generateReport = async () => {
    if (!business.companyName || !business.industry) {
      toast.error("Please fill in at least company name and industry");
      return;
    }
    setStage("loading");
    try {
      const [reportRes, qualRes] = await Promise.all([
        fetch(`${FN_URL}/marketing-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: AUTH },
          body: JSON.stringify({ business }),
        }),
        fetch(`${FN_URL}/lead-qualification`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: AUTH },
          body: JSON.stringify({ business }),
        }),
      ]);
      const reportData = await reportRes.json();
      if (!reportRes.ok) throw new Error(reportData.error || "Generation failed");

      let qual: Qualification | null = null;
      if (qualRes.ok) {
        const qd = await qualRes.json();
        qual = qd.qualification ?? null;
      } else {
        console.error("qualification failed");
      }

      setReport(reportData.report);
      setQualification(qual);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ business, report: reportData.report, qualification: qual }));
      setStage("report");
      toast.success("Strategy report generated");
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("429")) toast.error("Rate limit. Try again shortly.");
      else if (msg.includes("402")) toast.error("AI credits exhausted.");
      else toast.error("Failed to generate report");
      setStage("intake");
    }
  };

  const runAction = async (id: string, label: string) => {
    if (!report) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${FN_URL}/marketing-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: AUTH },
        body: JSON.stringify({ action: id, business, report }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setActionResult({ label, text: data.text });
      setStage("action");
    } catch {
      toast.error("Action failed. Try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReport(null);
    setQualification(null);
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
                  {stage === "action" && (
                    <button onClick={() => setStage("report")} className="p-2 hover:bg-secondary rounded-lg">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-base leading-tight">NexaGrowth AI Strategist</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Enterprise Marketing Intelligence
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
                {stage === "intake" && <IntakeForm business={business} setBusiness={setBusiness} onSubmit={generateReport} />}
                {stage === "loading" && <LoadingView />}
                {stage === "report" && report && (
                  <ReportView
                    report={report}
                    qualification={qualification}
                    onAction={runAction}
                    actionLoading={actionLoading}
                  />
                )}
                {stage === "action" && actionResult && <ActionView result={actionResult} />}
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
  business, setBusiness, onSubmit,
}: { business: Business; setBusiness: (b: Business) => void; onSubmit: () => void }) => {
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
        <p className="text-sm text-muted-foreground">Tell us about your business. We'll generate a complete enterprise-grade strategy in seconds.</p>
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

// ============ Loading ============
const LoadingView = () => {
  const steps = [
    "Analyzing business model…",
    "Mapping competitive landscape…",
    "Building SWOT analysis…",
    "Allocating budget across channels…",
    "Generating 30-day action plan…",
    "Calculating KPI targets…",
    "Finalizing strategy report…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % steps.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="h-full flex flex-col items-center justify-center p-10 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-2xl opacity-50 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BrainCircuit className="w-10 h-10 text-white animate-pulse" />
        </div>
      </div>
      <h3 className="text-xl font-heading font-semibold mb-2">Crafting Your Strategy</h3>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          className="text-sm text-muted-foreground flex items-center gap-2"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {steps[i]}
        </motion.p>
      </AnimatePresence>
      <div className="mt-8 w-64 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
          style={{ width: "50%" }}
        />
      </div>
    </div>
  );
};

// ============ Report ============
const SectionCard = ({
  icon: Icon, title, defaultOpen = true, children,
}: { icon: any; title: string; defaultOpen?: boolean; children: React.ReactNode }) => (
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
  report, qualification, onAction, actionLoading,
}: { report: Report; qualification: Qualification | null; onAction: (id: string, label: string) => void; actionLoading: string | null }) => {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Hero summary */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-primary font-medium mb-1">Strategy Report</p>
            <h2 className="text-2xl md:text-3xl font-heading font-bold">{report.companyName}</h2>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Confidence</p>
            <p className="text-3xl font-heading font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {report.confidence.score}%
            </p>
          </div>
        </div>
        <p className="text-sm md:text-base text-foreground/80 mt-4 leading-relaxed">{report.executiveSummary}</p>
        <div className="mt-4">
          <Progress value={report.confidence.score} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-2">{report.confidence.reasoning}</p>
        </div>
      </div>

      {/* KPIs strip */}
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
            <p className="font-heading font-semibold text-sm md:text-base">{k.v}</p>
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
            { k: "strengths", title: "Strengths", tone: "green" as const },
            { k: "weaknesses", title: "Weaknesses", tone: "red" as const },
            { k: "opportunities", title: "Opportunities", tone: "blue" as const },
            { k: "threats", title: "Threats", tone: "amber" as const },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border border-border p-3">
              <Pill tone={s.tone}>{s.title}</Pill>
              <ul className="mt-2 space-y-1.5 list-disc list-inside text-foreground/80">
                {(report.swot as any)[s.k].map((x: string, i: number) => <li key={i}>{x}</li>)}
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

      {/* Final recommendations */}
      <SectionCard icon={CheckCircle2} title="Final Recommendations">
        <ul className="space-y-2 text-sm">
          {report.finalRecommendations.map((r, i) => (
            <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span>{r}</span></li>
          ))}
        </ul>
      </SectionCard>

      {/* Lead Qualification Dashboard */}
      {qualification && <LeadQualificationCard q={qualification} />}

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

// ============ Lead Qualification ============
const LeadQualificationCard = ({ q }: { q: Qualification }) => {
  const statusMap = {
    Hot:  { icon: Flame,     color: "text-red-500",    bg: "bg-red-500/10 border-red-500/30",    grad: "from-red-500 to-orange-500" },
    Warm: { icon: Zap,       color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/30", grad: "from-amber-500 to-yellow-500" },
    Cold: { icon: Snowflake, color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",  grad: "from-blue-400 to-cyan-500" },
  } as const;
  const s = statusMap[q.leadStatus] ?? statusMap.Warm;
  const StatusIcon = s.icon;

  const planTone = q.recommendedPlan === "Enterprise" ? "amber" : q.recommendedPlan === "Growth" ? "green" : "blue";

  const breakdown = [
    { l: "Industry Fit",     v: q.scoreBreakdown?.industryFit ?? 0,     max: 20 },
    { l: "Goal Clarity",     v: q.scoreBreakdown?.goalClarity ?? 0,     max: 15 },
    { l: "Budget",           v: q.scoreBreakdown?.budget ?? 0,          max: 30 },
    { l: "Audience",         v: q.scoreBreakdown?.audience ?? 0,        max: 15 },
    { l: "Channel Maturity", v: q.scoreBreakdown?.channelMaturity ?? 0, max: 20 },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5 md:p-6 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-base md:text-lg">AI Lead Qualification</h3>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">Auto-generated</span>
        </div>
        <p className="text-xs text-muted-foreground">Automatically scored from your business inputs.</p>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* Score + Status */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl border border-border p-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead Score</p>
                <p className={`text-5xl font-heading font-bold bg-gradient-to-br ${s.grad} bg-clip-text text-transparent`}>
                  {q.leadScore}<span className="text-2xl text-muted-foreground">/100</span>
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${s.bg}`}>
                <StatusIcon className={`w-4 h-4 ${s.color}`} />
                <span className={`text-sm font-semibold ${s.color}`}>{q.leadStatus} Lead</span>
              </div>
            </div>
            <Progress value={q.leadScore} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
              {breakdown.map((b) => (
                <div key={b.l} className="rounded-lg border border-border/60 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{b.l}</p>
                  <p className="text-sm font-semibold mt-0.5">{b.v}<span className="text-[10px] text-muted-foreground">/{b.max}</span></p>
                  <Progress value={(b.v / b.max) * 100} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-5 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-primary" />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Recommended Plan</p>
            </div>
            <p className="text-2xl font-heading font-bold mb-2">{q.recommendedPlan}</p>
            <Pill tone={planTone as any}>Best Fit</Pill>
            <p className="text-xs text-foreground/80 mt-3 leading-relaxed">{q.planReasoning}</p>
          </div>
        </div>

        {/* Business Potential */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Business Potential</p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{q.businessPotential}</p>
        </div>

        {/* Priorities */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Top 3 Marketing Priorities</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {q.topPriorities?.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-3 flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-foreground/90">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Action */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-0.5">Next Recommended Action</p>
            <p className="text-sm font-medium text-foreground">{q.nextAction}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ Action result ============
const ActionView = ({ result }: { result: { label: string; text: string } }) => {
  const handleCopy = () => { navigator.clipboard.writeText(result.text); toast.success("Copied"); };
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-heading font-bold">{result.label}</h2>
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy</Button>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-table:text-xs prose-th:text-foreground">
          <ReactMarkdown>{result.text}</ReactMarkdown>
        </div>
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
  doc.text(`AI Confidence Score: ${report.confidence.score}%`, M, H - 96);
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
  const table = (head: string[], body: any[][]) => {
    autoTable(doc, {
      head: [head], body, startY: y, margin: { left: M, right: M },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 242, 252] },
      didDrawPage: () => { y = (doc as any).lastAutoTable?.finalY ?? y; },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
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

  // Confidence
  section("AI Confidence Score");
  doc.setFont("helvetica", "bold"); doc.setFontSize(36); doc.setTextColor(124, 58, 237);
  doc.text(`${report.confidence.score}%`, M, y + 24); y += 40;
  para(report.confidence.reasoning);

  // Final
  section("Final Recommendations");
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

export default MarketingStrategist;
