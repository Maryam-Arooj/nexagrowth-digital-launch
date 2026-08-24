import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Sarah Chen", role: "CMO, TechNova", quote: "NexaGrowth doubled our organic traffic in under 6 months. Their data-first approach is exactly what we needed." },
  { name: "Marcus Rivera", role: "Founder, UrbanStyle", quote: "Best agency we've worked with. Transparent, fast, and the results speak for themselves — 4.8× ROAS." },
  { name: "Emily Park", role: "Head of Growth, FreshBite", quote: "They turned our social presence from zero to a real community. Professional team, real impact." },
];

const Testimonials = () => (
  <section className="py-24 bg-card/50">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="max-w-xl mb-14"
      >
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Testimonials</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          What our clients say
        </h2>
        <span className="inline-block mt-3 text-[10px] font-semibold text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded">Sample Data — illustrative quotes, not verified clients</span>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={14} className="fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.quote}"</p>
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
