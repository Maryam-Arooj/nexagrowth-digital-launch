import { motion } from "framer-motion";
import { Search, BarChart3, Rocket, RefreshCw } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Discovery & Audit",
    description:
      "We analyze your current marketing, competitors, audience, and positioning to build a baseline that's grounded in reality, not guesswork.",
  },
  {
    icon: BarChart3,
    step: "02",
    title: "Strategy & Roadmap",
    description:
      "Our strategists craft a custom 90-day growth plan with prioritized channels, budget allocations, KPIs, and a clear attribution model.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Launch & Execute",
    description:
      "We build creatives, copy, landing pages, and campaign structures — then launch with precision targeting to reach your ideal customer.",
  },
  {
    icon: RefreshCw,
    step: "04",
    title: "Optimize & Scale",
    description:
      "Weekly performance reviews, A/B tests, and data-driven iteration ensure your campaigns continuously improve and your CAC drops over time.",
  },
];

const Process = () => (
  <section id="process" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-xl mb-14"
      >
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">
          How It Works
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          From strategy to results in 30 days
        </h2>
      </motion.div>

      <div className="relative">
        {/* Connection line for desktop */}
        <div className="hidden lg:block absolute top-10 left-[calc(12.5%-16px)] right-[calc(12.5%-16px)] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:glow-sm transition-all duration-300 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-heading text-2xl font-extrabold text-muted-foreground/20 select-none">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default Process;
