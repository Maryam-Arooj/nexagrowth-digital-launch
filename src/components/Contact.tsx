import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const Contact = () => (
  <section id="contact" className="py-24 bg-muted/50">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-12"
      >
        <p className="text-primary text-sm font-medium mb-2">Contact</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Get your free audit</h2>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="max-w-lg mx-auto space-y-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input placeholder="Name" className="bg-card" />
          <Input placeholder="Email" type="email" className="bg-card" />
        </div>
        <Input placeholder="Website URL" className="bg-card" />
        <Textarea placeholder="Tell us about your goals..." rows={3} className="bg-card resize-none" />
        <Button size="lg" className="w-full">
          Send Message <Send size={16} />
        </Button>
      </motion.form>
    </div>
  </section>
);

export default Contact;
