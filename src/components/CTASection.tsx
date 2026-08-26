import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";

const CTASection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      // Insert as lead with newsletter goal
      await apiPost("/api/leads", {
        name: email.split("@")[0], // derive name from email prefix
        email: email.trim(),
        goals: "Newsletter / Marketing updates subscription",
      });
      setDone(true);
      toast.success("You're on the list! Check your inbox for a welcome email.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center"
        >
          <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">
            Stay Ahead
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Get weekly marketing insights
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Join 2,000+ marketers receiving our weekly breakdown of what's working in paid,
            organic, and social — including real campaign data from our client portfolio.
          </p>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 p-4 rounded-xl border border-primary/40 bg-primary/5"
            >
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm font-medium">You're subscribed! Welcome to the NexaGrowth community.</p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-card border-border h-11"
                aria-label="Email address for newsletter"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-11 px-6 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Subscribe <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            No spam, ever. Unsubscribe with one click.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
