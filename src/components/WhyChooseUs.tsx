import { motion } from "framer-motion";
import { Shield, Zap, BarChart3, Users } from "lucide-react";

const reasons = [
  { icon: BarChart3, title: "Data-Driven Approach", desc: "Every decision backed by analytics and real-time performance data." },
  { icon: Zap, title: "Fast Execution", desc: "Launch campaigns in days, not weeks. Agile processes built for speed." },
  { icon: Shield, title: "Transparent Reporting", desc: "Real-time dashboards and weekly reports so you always know your ROI." },
  { icon: Users, title: "Dedicated Team", desc: "A dedicated strategist, designer, and analyst assigned to your account." },
];

const WhyChooseUs = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-primary text-sm font-semibold uppercase tracking-widest">Why Us</span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
          Why Choose <span className="gradient-text">NexaGrowth</span>
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reasons.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <r.icon size={26} className="text-primary" />
            </div>
            <h3 className="font-heading font-semibold mb-2">{r.title}</h3>
            <p className="text-sm text-muted-foreground">{r.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUs;
