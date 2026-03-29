import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mail, Phone, MapPin } from "lucide-react";

const Contact = () => (
  <section id="contact" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-primary text-sm font-semibold uppercase tracking-widest">Contact</span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
          Get Your <span className="gradient-text">Free Audit</span>
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Tell us about your goals and we'll craft a custom growth strategy — no strings attached.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-3"
        >
          <form className="glass-card rounded-2xl p-6 md:p-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input placeholder="Your Name" className="bg-muted/50 border-border" />
              <Input placeholder="Email" type="email" className="bg-muted/50 border-border" />
            </div>
            <Input placeholder="Company / Website" className="bg-muted/50 border-border" />
            <Textarea placeholder="Tell us about your goals..." rows={4} className="bg-muted/50 border-border resize-none" />
            <Button variant="hero" size="lg" className="w-full">
              Send Message <Send size={18} />
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2 flex flex-col justify-center gap-6"
        >
          {[
            { icon: Mail, label: "hello@nexagrowth.io" },
            { icon: Phone, label: "+1 (555) 987-6543" },
            { icon: MapPin, label: "San Francisco, CA" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon size={18} className="text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default Contact;
