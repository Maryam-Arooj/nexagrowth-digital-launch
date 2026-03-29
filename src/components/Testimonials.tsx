import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechNova",
    quote: "NexaGrowth took us from page 5 to position 1 on Google in just 4 months.",
  },
  {
    name: "Marcus Rodriguez",
    role: "CMO, UrbanStyle",
    quote: "We scaled revenue 4x while reducing cost per acquisition. Phenomenal team.",
  },
];

const Testimonials = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-16"
      >
        <p className="text-primary text-sm font-medium mb-2">Testimonials</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What clients say</h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.quote}"</p>
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
