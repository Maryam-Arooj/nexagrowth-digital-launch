import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => (
  <section className="min-h-[90vh] flex items-center pt-16 relative overflow-hidden">
    {/* Animated gradient orbs */}
    <motion.div
      animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px]"
    />
    <motion.div
      animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-20 -left-32 w-80 h-80 rounded-full bg-accent/20 blur-[100px]"
    />

    <div className="container mx-auto px-4 relative z-10">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6"
        >
          <Sparkles size={14} className="text-primary" />
          <span className="text-sm font-medium text-primary">Digital Growth Experts</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]"
        >
          Grow your brand with{" "}
          <span className="gradient-text">smart digital marketing</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-muted-foreground mt-6 max-w-lg mx-auto"
        >
          We help businesses scale with SEO, ads, and social — backed by real data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mt-10"
        >
          <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90 transition-opacity" asChild>
            <a href="#contact">
              Get Free Audit <ArrowRight size={16} />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/5" asChild>
            <a href="#services">View Services</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 flex items-center justify-center gap-12"
        >
          {[
            { value: "150+", label: "Clients" },
            { value: "3.2x", label: "Avg ROI" },
            { value: "97%", label: "Retention" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default Hero;
