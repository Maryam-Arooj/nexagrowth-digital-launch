import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How quickly can you launch a campaign?",
    a: "For Starter and Growth plans, we typically go live within 7 business days. Enterprise campaigns include a dedicated onboarding call and usually launch within 10–14 days to ensure everything is fully optimized.",
  },
  {
    q: "Do you offer month-to-month contracts?",
    a: "Yes — all plans are month-to-month with no long-term commitment. We believe in earning your business every month through results, not contracts.",
  },
  {
    q: "What ROI can I realistically expect?",
    a: "Across all client accounts, we average a 3.2× return on marketing spend. SEO campaigns typically show meaningful results within 90 days, while paid ads can deliver positive ROAS within the first 30 days.",
  },
  {
    q: "Which ad platforms do you manage?",
    a: "We're certified partners on Google Ads, Meta (Facebook & Instagram), LinkedIn, TikTok, and X (Twitter). The Growth and Enterprise plans include multi-platform management.",
  },
  {
    q: "How do you report on performance?",
    a: "Every plan includes a monthly performance dashboard with clear metrics — no vanity numbers. Growth and Enterprise clients receive bi-weekly strategy calls with your dedicated account manager.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Absolutely. You can upgrade anytime and the change takes effect immediately. Downgrades apply at the start of the next billing cycle.",
  },
  {
    q: "Do you work with any industry?",
    a: "We specialize in B2B SaaS, D2C e-commerce, and professional services. We've worked across over 15 verticals and bring deep channel expertise to every engagement.",
  },
  {
    q: "What makes NexaGrowth different from other agencies?",
    a: "Three things: transparent pricing, data-first strategy, and a dedicated team (not freelancers). We don't sell retainers — we sell results, backed by weekly reporting and clear attribution.",
  },
];

const FAQ = () => (
  <section id="faq" className="py-24 bg-muted/40">
    <div className="container mx-auto px-4 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-14"
      >
        <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">FAQ</p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground text-sm mt-3 max-w-lg mx-auto">
          Everything you need to know before getting started. Can't find your answer?{" "}
          <a href="#contact" className="text-primary hover:underline">
            Ask us directly.
          </a>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border bg-card px-5 data-[state=open]:border-primary/40"
            >
              <AccordionTrigger className="font-heading font-semibold text-sm md:text-base text-left hover:no-underline hover:text-primary transition-colors py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQ;
