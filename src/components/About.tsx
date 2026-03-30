import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const About = () => (
  <section id="about" className="py-24 bg-muted/40">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-14 items-center max-w-4xl mx-auto">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
          <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">About Us</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-5">
            Performance marketing, simplified
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            NexaGrowth Digital is a performance-focused marketing agency. We combine deep data expertise with creative strategy to help businesses grow predictably and profitably.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Founded in 2019, we've helped over 150 companies across SaaS, e-commerce, and D2C verticals achieve sustainable growth through digital channels.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { value: "5+", label: "Years of experience" },
            { value: "150+", label: "Clients served" },
            { value: "$50M+", label: "Revenue generated" },
            { value: "97%", label: "Client retention" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="font-heading text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default About;
