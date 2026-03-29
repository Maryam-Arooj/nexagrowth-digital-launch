import { motion } from "framer-motion";
import { Search, Megaphone, Share2 } from "lucide-react";

const services = [
  {
    icon: Search,
    title: "SEO",
    description: "Rank higher on Google with technical optimization and content strategy.",
  },
  {
    icon: Megaphone,
    title: "Paid Ads",
    description: "Maximize ROI with targeted Google and Meta ad campaigns.",
  },
  {
    icon: Share2,
    title: "Social Media",
    description: "Build engaged communities that convert into loyal customers.",
  },
];

const Services = () => (
  <section id="services" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-16"
      >
        <p className="text-primary text-sm font-medium mb-2">What we do</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our services</h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {services.map((service, i) => (
          <motion.div
            key={service.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <service.icon size={20} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
