import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const cases = [
  { company: "TechNova SaaS", metric: "200%", label: "Organic traffic growth", tag: "SEO" },
  { company: "UrbanStyle E-com", metric: "4.8x", label: "Return on ad spend", tag: "Ads" },
  { company: "FreshBite D2C", metric: "320%", label: "Social engagement lift", tag: "Social" },
];

const CaseStudies = () => (
  <section id="work" className="py-24 bg-muted/50">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-16"
      >
        <p className="text-primary text-sm font-medium mb-2">Results</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Selected work</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {cases.map((c, i) => (
          <motion.div
            key={c.company}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl border border-border bg-card p-6 hover:border-accent/40 hover:glow-pink transition-all duration-300"
          >
            <span className="text-xs font-medium text-white gradient-bg px-2.5 py-1 rounded-full">{c.tag}</span>
            <div className="flex items-end gap-2 mt-4 mb-1">
              <span className="text-3xl font-bold gradient-text">{c.metric}</span>
              <TrendingUp size={18} className="text-accent mb-1" />
            </div>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="text-sm font-medium mt-3">{c.company}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CaseStudies;
