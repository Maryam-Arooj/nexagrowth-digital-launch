import { motion } from "framer-motion";

const About = () => (
  <section id="about" className="py-24">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-primary text-sm font-medium mb-2">About us</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Marketing that actually works
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            NexaGrowth Digital is a performance-focused agency. We combine data, creativity, and strategy to help brands grow faster. No fluff — just results.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-3 gap-8 mt-14"
        >
          {[
            { value: "5+", label: "Years" },
            { value: "150+", label: "Clients" },
            { value: "$50M+", label: "Revenue driven" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default About;
