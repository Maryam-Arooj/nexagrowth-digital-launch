import { motion } from "framer-motion";
import { Search, Megaphone, Share2, Palette } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "SEO Optimization",
    description: "Dominate search rankings with technical SEO, content strategy, and link building that drives organic traffic.",
  },
  {
    icon: Megaphone,
    title: "Paid Advertising",
    description: "Maximize ROI with targeted Google Ads, Meta Ads, and programmatic campaigns managed by experts.",
  },
  {
    icon: Share2,
    title: "Social Media",
    description: "Build engaged communities and drive conversions with data-backed social media strategies.",
  },
  {
    icon: Palette,
    title: "Brand Strategy",
    description: "Craft a memorable brand identity with positioning, visual design, and messaging that resonates.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">What We Do</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
            Services That <span className="gradient-text">Drive Growth</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 hover-glow group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <service.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-3">{service.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
