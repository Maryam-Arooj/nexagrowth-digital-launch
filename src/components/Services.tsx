import { motion } from "framer-motion";
import { Search, Megaphone, Share2, Palette } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "Search Engine Optimization",
    description: "Improve organic rankings with technical SEO, keyword strategy, and high-quality content.",
  },
  {
    icon: Megaphone,
    title: "Paid Advertising",
    description: "Maximize ROAS across Google, Meta, and LinkedIn with targeted, data-driven campaigns.",
  },
  {
    icon: Share2,
    title: "Social Media Management",
    description: "Build brand presence and engaged communities across key social platforms.",
  },
  {
    icon: Palette,
    title: "Brand Strategy",
    description: "Develop cohesive brand identity, messaging, and visual systems that resonate.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const Services = () => (
  <section id="services" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="max-w-xl mb-14">
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Services</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Everything you need to grow online
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            {...fadeUp}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
              <service.icon size={18} className="text-primary" />
            </div>
            <h3 className="font-heading text-base font-semibold mb-2">{service.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
