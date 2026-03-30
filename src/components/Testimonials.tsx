import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechNova",
    quote: "NexaGrowth moved us from page 5 to the #1 organic position in under 4 months. Their process is methodical and the communication is outstanding.",
  },
  {
    name: "Marcus Rodriguez",
    role: "CMO, UrbanStyle",
    quote: "We scaled revenue 4× while cutting CPA by 35%. They genuinely care about our bottom line, not just impressions.",
  },
  {
    name: "Priya Sharma",
    role: "Founder, FreshBite",
    quote: "Working with NexaGrowth feels like having an in-house team. They're responsive, strategic, and consistently deliver results.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const Testimonials = () => (
  <section className="py-24 bg-muted/40">
    <div className="container mx-auto px-4">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center max-w-xl mx-auto mb-14">
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Testimonials</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Trusted by marketing leaders
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6 flex flex-col hover:shadow-md transition-all duration-300"
          >
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={14} className="text-primary fill-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">"{t.quote}"</p>
            <div className="pt-4 border-t border-border">
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
