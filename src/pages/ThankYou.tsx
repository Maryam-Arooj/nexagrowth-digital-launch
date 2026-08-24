import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Mail, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ConfettiPiece = ({ delay }: { delay: number }) => {
  const colors = ["#7C3AED", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const size = Math.random() * 10 + 6;
  return (
    <motion.div
      className="fixed top-0 pointer-events-none rounded-sm"
      style={{ left: `${left}%`, width: size, height: size, backgroundColor: color, zIndex: 100 }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50,
        opacity: [1, 1, 0],
        rotate: Math.random() * 720 - 360,
        x: Math.random() * 200 - 100,
      }}
      transition={{ duration: Math.random() * 3 + 2, delay, ease: "easeIn" }}
    />
  );
};

const steps = [
  {
    icon: Mail,
    title: "Check your inbox",
    description: "We've sent a confirmation email with your order details and next steps.",
  },
  {
    icon: Calendar,
    title: "Onboarding call",
    description: "A team member will reach out within 24 hours to schedule your kickoff call.",
  },
  {
    icon: Sparkles,
    title: "Strategy kickoff",
    description: "We'll build your custom strategy and launch campaigns within the first 7 days.",
  },
];

const ThankYou = () => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Confetti */}
      {showConfetti && (
        <>
          {Array.from({ length: 60 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 0.05} />
          ))}
        </>
      )}

      <main className="container mx-auto px-4 py-32 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          {/* Success Icon */}
          <motion.div
            className="inline-flex relative mb-8"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: 3, duration: 0.6 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-2xl opacity-40" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
          >
            Payment Successful!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Thank you for choosing NexaGrowth Digital. Your subscription is confirmed and we're
            already getting your account set up.
          </motion.p>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="font-heading text-xl font-bold text-center mb-8">What happens next?</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="rounded-xl border border-border bg-card p-6 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Step {i + 1}
                </div>
                <h3 className="font-heading font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90" asChild>
            <Link to="/">
              Back to Home <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="/#contact">Contact Our Team</a>
          </Button>
        </motion.div>

        {/* Support */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-muted-foreground mt-10"
        >
          Questions? Email us at{" "}
          <a href="mailto:hello@nexagrowth.com" className="text-primary hover:underline">
            hello@nexagrowth.com
          </a>{" "}
          or call{" "}
          <a href="tel:+15552345678" className="text-primary hover:underline">
            +1 (555) 234-5678
          </a>
        </motion.p>
      </main>

      <Footer />
    </div>
  );
};

export default ThankYou;
