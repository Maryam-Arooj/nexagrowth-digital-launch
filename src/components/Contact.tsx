import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const Contact = () => (
  <section id="contact" className="py-24">
    <div className="container mx-auto px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Contact</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">Get your free audit</h2>
          <p className="text-muted-foreground text-sm mt-3">
            Tell us about your business and we'll send a complimentary marketing audit within 48 hours.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Input placeholder="Full name" className="bg-card border-border" />
            <Input placeholder="Work email" type="email" className="bg-card border-border" />
          </div>
          <Input placeholder="Company website" className="bg-card border-border" />
          <Textarea placeholder="What are your top marketing goals?" rows={3} className="bg-card border-border resize-none" />
          <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
            Request Free Audit <Send size={15} />
          </Button>
        </motion.form>
      </div>
    </div>
  </section>
);

export default Contact;
