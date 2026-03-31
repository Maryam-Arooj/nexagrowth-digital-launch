import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, Globe } from "lucide-react";

const Hero = () => (
  <section className="min-h-[90vh] flex items-center pt-16 relative overflow-hidden">
    {/* Gradient orbs */}
    <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
    <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />

    <div className="container mx-auto px-4 relative z-10">
      <div className="max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 border border-border rounded-full px-4 py-1.5 mb-6 bg-card/60 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs font-medium text-muted-foreground">Trusted by 150+ companies worldwide</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-heading text-4xl sm:text-5xl md:text-[56px] font-extrabold tracking-tight leading-[1.08]"
        >
          Digital marketing that drives{" "}
          <span className="gradient-text">measurable growth</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base md:text-lg text-muted-foreground mt-5 max-w-xl leading-relaxed"
        >
          We help B2B and D2C brands scale revenue with data-driven SEO, paid media, and social strategy.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 mt-9"
        >
          <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity" asChild>
            <a href="#contact">
              Get Free Audit <ArrowRight size={16} />
            </a>
          </Button>
          <Button variant="outline" size="lg" className="border-border hover:border-primary/50 hover:bg-primary/5" asChild>
            <a href="#services">View Services</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex gap-10 mt-16 pt-8 border-t border-border"
        >
          {[
            { icon: Users, value: "150+", label: "Clients served" },
            { icon: BarChart3, value: "3.2×", label: "Average ROI" },
            { icon: Globe, value: "97%", label: "Client retention" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon size={16} className="text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground leading-tight">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default Hero;
