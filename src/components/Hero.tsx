import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const Hero = () => (
  <section className="min-h-[85vh] flex items-center pt-16">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-foreground"
        >
          Grow your brand with smart digital marketing
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-muted-foreground mt-6 max-w-lg mx-auto"
        >
          We help businesses scale with SEO, ads, and social — backed by real data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mt-10"
        >
          <Button size="lg" asChild>
            <a href="#contact">
              Get Free Audit <ArrowRight size={16} />
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#services">View Services</a>
          </Button>
        </motion.div>

        {/* Simple decorative element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 flex items-center justify-center gap-12 text-muted-foreground"
        >
          {[
            { value: "150+", label: "Clients" },
            { value: "3.2x", label: "Avg ROI" },
            { value: "97%", label: "Retention" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default Hero;
