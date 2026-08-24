import { motion } from "framer-motion";
import { Target, Zap, Shield, LineChart } from "lucide-react";

const points = [
  { icon: Target, title: "Data-Driven Strategy", desc: "Every decision backed by analytics and real performance data." },
  { icon: Zap, title: "Fast Execution", desc: "Launch campaigns quickly with our streamlined process." },
  { icon: Shield, title: "Transparent Reporting", desc: "Clear dashboards and weekly reports — no vanity metrics." },
  { icon: LineChart, title: "Proven ROI", desc: "Average 3.2× return across all client accounts. (Demo Data)" },
];

const WhyChooseUs = () => (
  <section id="why-us" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-xl mb-14"
      >
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Why Choose Us</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Built for results, not noise
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {points.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <p.icon size={18} className="text-accent" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold mb-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;
