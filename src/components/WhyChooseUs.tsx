import { motion } from "framer-motion";
import { Target, BarChart3, Users, Headphones } from "lucide-react";

const reasons = [
  {
    icon: Target,
    title: "Results-Focused",
    description: "Every strategy is tied to measurable KPIs. We optimize for outcomes, not vanity metrics.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Decisions",
    description: "We use analytics and market data to inform every campaign and creative decision.",
  },
  {
    icon: Users,
    title: "Dedicated Team",
    description: "You get a dedicated strategist and specialist team — not a rotating cast of freelancers.",
  },
  {
    icon: Headphones,
    title: "Transparent Communication",
    description: "Regular reporting, open communication, and no long-term lock-in contracts.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const WhyChooseUs = () => (
  <section id="why-us" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="max-w-xl mb-14">
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Why Choose Us</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Your growth partner, not just an agency
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
        {reasons.map((r, i) => (
          <motion.div
            key={r.title}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <r.icon size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold mb-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;
