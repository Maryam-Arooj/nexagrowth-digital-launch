import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const cases = [
  { company: "TechNova SaaS", metric: "200%", label: "Organic traffic increase in 6 months", tag: "SEO" },
  { company: "UrbanStyle E-commerce", metric: "4.8×", label: "Return on ad spend (ROAS)", tag: "Paid Ads" },
  { company: "FreshBite D2C", metric: "320%", label: "Social engagement growth", tag: "Social" },
];

const CaseStudies = () => (
  <section id="work" className="py-24 bg-card/50">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-xl mb-14"
      >
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Case Studies</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Real results for real businesses
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5">
        {cases.map((c, i) => (
          <motion.div
            key={c.company}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:glow-sm transition-all duration-300"
          >
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
              {c.tag}
            </span>
            <div className="flex items-end gap-2 mt-5 mb-1.5">
              <span className="font-heading text-4xl font-extrabold gradient-text">{c.metric}</span>
              <TrendingUp size={20} className="text-accent mb-1.5" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.label}</p>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-semibold">{c.company}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CaseStudies;
