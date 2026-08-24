import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 1499,
    description: "For startups building their digital presence",
    features: [
      "SEO audit & strategy",
      "2 social platforms managed",
      "Monthly performance report",
      "Google Analytics setup",
      "Email support (48hr SLA)",
    ],
    badge: null,
    featured: false,
    cta: "Get Started",
  },
  {
    name: "Growth",
    monthlyPrice: 3499,
    description: "For scaling businesses ready to accelerate",
    features: [
      "Everything in Starter",
      "Google & Meta Ads management",
      "4 social platforms managed",
      "Bi-weekly strategy calls",
      "Content creation (8 pieces/mo)",
      "Dedicated account manager",
    ],
    badge: "Most Popular",
    featured: true,
    cta: "Start Growing",
  },
  {
    name: "Enterprise",
    monthlyPrice: 6999,
    description: "For market leaders who need a full-service partner",
    features: [
      "Everything in Growth",
      "Dedicated senior strategist",
      "Full-funnel campaign management",
      "A/B testing & CRO program",
      "Priority Slack channel",
      "Quarterly executive reviews",
    ],
    badge: "Full Service",
    featured: false,
    cta: "Contact Sales",
  },
];

const ANNUAL_DISCOUNT = 0.2; // 20% off

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const Pricing = () => {
  const { addItem, items } = useCart();
  const [isAnnual, setIsAnnual] = useState(false);

  const getPrice = (monthlyPrice: number) =>
    isAnnual ? Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT)) : monthlyPrice;

  const handleBuy = (plan: (typeof plans)[0]) => {
    if (plan.name === "Enterprise") {
      // Scroll to contact for enterprise
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const price = getPrice(plan.monthlyPrice);
    addItem({
      id: plan.name.toLowerCase(),
      name: plan.name + " Plan",
      price,
      description: plan.description,
    });
    toast.success(`${plan.name} Plan added to cart`);
  };

  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl mx-auto mb-10"
        >
          <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">
            Pricing
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Transparent plans, no surprises
          </h2>
          <p className="text-muted-foreground text-sm mt-3">
            All plans include onboarding, strategy setup, and monthly reporting.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-10"
        >
          <span
            className={`text-sm font-medium transition-colors ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isAnnual ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-1 ${
                isAnnual ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
          >
            Annual{" "}
            <span className="text-[11px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const inCart = items.some((item) => item.id === plan.name.toLowerCase());
            const price = getPrice(plan.monthlyPrice);

            return (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`rounded-2xl p-7 flex flex-col border transition-all duration-300 relative overflow-hidden ${
                  plan.featured
                    ? "border-primary bg-card shadow-lg glow-sm"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                }`}
              >
                {/* Top gradient bar for featured */}
                {plan.featured && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
                )}

                {plan.badge && (
                  <span
                    className={`inline-flex items-center gap-1 self-start text-[11px] font-semibold px-2.5 py-1 rounded-full mb-4 ${
                      plan.featured
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {plan.featured && <Zap className="w-3 h-3" />}
                    {plan.badge}
                  </span>
                )}

                <h3 className="font-heading text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>

                <div className="flex items-end gap-1 mb-6">
                  <span className="font-heading text-4xl font-extrabold">
                    ${price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>

                {isAnnual && plan.name !== "Enterprise" && (
                  <p className="text-xs text-green-500 -mt-4 mb-4">
                    Billed annually — save ${Math.round(plan.monthlyPrice * ANNUAL_DISCOUNT * 12).toLocaleString()}/yr
                  </p>
                )}

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.featured ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <Check
                          size={10}
                          className={plan.featured ? "text-primary" : "text-muted-foreground"}
                        />
                      </div>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.featured ? "default" : "outline"}
                  className={`w-full ${plan.featured ? "bg-gradient-to-r from-primary to-accent hover:opacity-90" : ""}`}
                  onClick={() => handleBuy(plan)}
                  disabled={inCart}
                  id={`pricing-cta-${plan.name.toLowerCase()}`}
                >
                  {inCart ? (
                    <>
                      Added <Check size={14} />
                    </>
                  ) : plan.name === "Enterprise" ? (
                    "Contact Sales"
                  ) : (
                    <>
                      <ShoppingCart size={14} /> {plan.cta}
                    </>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          All plans include a{" "}
          <strong className="text-foreground">30-day money-back guarantee</strong>. Cancel anytime,
          no questions asked.{" "}
          <Link to="/cart" className="text-primary hover:underline">
            View cart →
          </Link>
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
