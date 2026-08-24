import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, Globe, Sparkles } from "lucide-react";

// Animated counter hook
function useCounter(end: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const step = end / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { count, ref };
}

const StatCard = ({
  icon: Icon,
  value,
  label,
  suffix = "",
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
}) => {
  const { count, ref } = useCounter(value);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-primary" />
      </div>
      <div>
        <div className="text-lg font-bold text-foreground leading-tight">
          {count}
          {suffix}
        </div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
};

const badges = [
  "Google Partner",
  "Meta Blueprint Certified",
  "HubSpot Agency Certified",
];

const Hero = () => (
  <section className="min-h-[92vh] flex items-center pt-16 relative overflow-hidden">
    {/* Gradient orbs */}
    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-[140px] pointer-events-none" />
    <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent/6 blur-[120px] pointer-events-none" />
    {/* Grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.015] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(hsl(250 80% 65%) 1px, transparent 1px), linear-gradient(90deg, hsl(250 80% 65%) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />

    <div className="container mx-auto px-4 relative z-10 py-16">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 border border-primary/30 rounded-full px-4 py-1.5 mb-6 bg-primary/5 backdrop-blur-sm"
          >
            <Sparkles size={13} className="text-primary" />
            <span className="text-xs font-medium text-primary">
              AI-Powered Marketing Strategy
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl md:text-[58px] font-extrabold tracking-tight leading-[1.07]"
          >
            Digital marketing that drives{" "}
            <span className="gradient-text">measurable growth</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base md:text-lg text-muted-foreground mt-5 max-w-xl leading-relaxed"
          >
            We help B2B and D2C brands scale revenue with data-driven SEO, paid media, and social
            strategy. Average 3.2× ROI across all client accounts.{" "}
            <span className="text-[11px] align-middle text-amber-500/80">(illustrative demo figure)</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 mt-8"
          >
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
              asChild
            >
              <a href="#contact">
                Get Free Audit <ArrowRight size={16} className="ml-1" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border hover:border-primary/50 hover:bg-primary/5"
              asChild
            >
              <a href="#work">View Case Studies</a>
            </Button>
          </motion.div>

          {/* Certification badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center gap-2 mt-6"
          >
            <span className="text-[10px] font-semibold text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded">Sample badges</span>
            {badges.map((b) => (
              <span
                key={b}
                className="text-[11px] font-medium text-muted-foreground bg-secondary/60 border border-border px-2.5 py-1 rounded-full"
              >
                ✓ {b}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Stats card panel */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden lg:block"
        >
          <div className="relative">
            {/* Main card */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-2xl">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6 font-medium flex items-center gap-1.5">
                Performance Overview
                <span className="normal-case tracking-normal text-[10px] font-semibold text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded">Demo Data</span>
              </p>
              <div className="space-y-6">
                <StatCard icon={Users} value={150} suffix="+" label="Clients served" />
                <div className="h-px bg-border" />
                <StatCard icon={BarChart3} value={97} suffix="%" label="Client retention rate" />
                <div className="h-px bg-border" />
                <StatCard icon={Globe} value={50} suffix="M+" label="Revenue generated for clients" />
              </div>

              {/* Live indicator */}
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Sample dashboard — illustrative, not live account data
              </div>
            </div>

            {/* Floating card: ROI */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 rounded-xl border border-primary/30 bg-card shadow-xl p-4 max-w-[200px]"
            >
              <p className="text-[11px] text-muted-foreground mb-1">Avg. client ROAS <span className="text-amber-500/80">(Demo Data)</span></p>
              <p className="font-heading text-3xl font-extrabold gradient-text">3.2×</p>
              <p className="text-[11px] text-green-500 mt-1">↑ vs 2.1× industry avg</p>
            </motion.div>

            {/* Floating card: Campaigns */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
              className="absolute -top-6 -right-6 rounded-xl border border-accent/30 bg-card shadow-xl p-3 max-w-[160px]"
            >
              <p className="text-[11px] text-muted-foreground mb-1">Active campaigns <span className="text-amber-500/80">(Demo)</span></p>
              <p className="font-heading text-2xl font-extrabold text-accent">240+</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Bottom stat row for mobile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-col gap-2 mt-16 pt-8 border-t border-border lg:hidden"
      >
        <span className="text-[10px] font-semibold text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded self-start">Demo Data</span>
        <div className="flex gap-10">
        {[
          { icon: Users, value: 150, suffix: "+", label: "Clients served" },
          { icon: BarChart3, value: 3, suffix: ".2×", label: "Average ROI" },
          { icon: Globe, value: 97, suffix: "%", label: "Client retention" },
        ].map((stat) => (
          <StatCard key={stat.label} icon={stat.icon} value={stat.value} suffix={stat.suffix} label={stat.label} />
        ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default Hero;
