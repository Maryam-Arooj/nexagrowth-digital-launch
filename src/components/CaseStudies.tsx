import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight } from "lucide-react";

const cases = [
  {
    company: "TechNova SaaS",
    metric: "200%",
    label: "Organic Traffic Growth",
    description: "Tripled their organic traffic in 6 months through technical SEO and content marketing.",
    tag: "SEO",
  },
  {
    company: "UrbanStyle E-com",
    metric: "4.8x",
    label: "ROAS on Paid Ads",
    description: "Scaled paid campaigns from $5K to $50K/month while improving return on ad spend.",
    tag: "Ads",
  },
  {
    company: "FreshBite D2C",
    metric: "320%",
    label: "Social Engagement",
    description: "Built a community of 120K followers and boosted engagement through viral content.",
    tag: "Social",
  },
];

const CaseStudies = () => {
  return (
    <section id="case-studies" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-widest">Results</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
            Proven <span className="gradient-text">Case Studies</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.company}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass-card rounded-2xl p-6 hover-glow group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">{c.tag}</span>
                <ArrowUpRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="font-heading text-4xl font-bold gradient-text">{c.metric}</span>
                <TrendingUp size={20} className="text-primary mb-2" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{c.label}</p>
              <h3 className="font-heading font-semibold mb-2">{c.company}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
