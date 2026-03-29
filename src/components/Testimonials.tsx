import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechNova",
    quote: "NexaGrowth transformed our online presence. We went from page 5 to position 1 on Google in just 4 months.",
  },
  {
    name: "Marcus Rodriguez",
    role: "CMO, UrbanStyle",
    quote: "Their paid ads team is phenomenal. We scaled our revenue 4x while actually reducing our cost per acquisition.",
  },
  {
    name: "Emily Park",
    role: "Founder, FreshBite",
    quote: "The social media strategy they built for us created a genuine community. Our engagement rates are industry-leading now.",
  },
];

const Testimonials = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-primary text-sm font-semibold uppercase tracking-widest">Testimonials</span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
          What Our <span className="gradient-text">Clients Say</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            whileHover={{ y: -6 }}
            className="glass-card rounded-2xl p-6 cursor-default"
          >
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, si) => (
                <Star key={si} size={16} className="fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.quote}"</p>
            <div>
              <p className="font-heading font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
