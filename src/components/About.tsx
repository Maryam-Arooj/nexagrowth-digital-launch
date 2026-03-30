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
            Marketing that <span className="gradient-text">actually works</span>
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
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default About;
