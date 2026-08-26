import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";

type FormState = {
  name: string;
  email: string;
  website: string;
  goals: string;
};

const initialForm: FormState = { name: "", email: "", website: "", goals: "" };

const Contact = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email";
    if (!form.goals.trim()) next.goals = "Please describe your marketing goals";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await apiPost("/api/leads", {
        name: form.name,
        email: form.email,
        website: form.website || null,
        goals: form.goals,
      });

      setSubmitted(true);
      toast.success("Audit request submitted! We'll respond within 48 hours.");
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
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

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-primary/50 bg-card p-8 text-center"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={40} className="mx-auto text-primary mb-4" aria-hidden="true" />
              <h3 className="font-heading text-xl font-bold mb-2">Request received</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Thanks for reaching out. Our team will review your details and send your free audit within 48 hours.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Submit another request
              </Button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="sr-only">Full name</Label>
                  <Input
                    id="contact-name"
                    placeholder="Full name"
                    className="bg-card border-border"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    required
                  />
                  {errors.name && <p id="contact-name-error" className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="sr-only">Work email</Label>
                  <Input
                    id="contact-email"
                    placeholder="Work email"
                    type="email"
                    className="bg-card border-border"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "contact-email-error" : undefined}
                    required
                  />
                  {errors.email && <p id="contact-email-error" className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-website" className="sr-only">Company website</Label>
                <Input
                  id="contact-website"
                  placeholder="Company website"
                  type="url"
                  className="bg-card border-border"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-goals" className="sr-only">Marketing goals</Label>
                <Textarea
                  id="contact-goals"
                  placeholder="What are your top marketing goals?"
                  rows={3}
                  className="bg-card border-border resize-none"
                  value={form.goals}
                  onChange={(e) => update("goals", e.target.value)}
                  aria-invalid={!!errors.goals}
                  aria-describedby={errors.goals ? "contact-goals-error" : undefined}
                  required
                />
                {errors.goals && <p id="contact-goals-error" className="text-xs text-destructive">{errors.goals}</p>}
              </div>
              <Button
                size="lg"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                ) : (
                  <>Request Free Audit <Send size={15} /></>
                )}
              </Button>
            </motion.form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Contact;
