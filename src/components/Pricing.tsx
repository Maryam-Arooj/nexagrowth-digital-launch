import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const plans = [
  {
    name: "Basic",
    price: "$1,499",
    period: "/mo",
    description: "For startups ready to grow",
    features: ["SEO Audit & Strategy", "2 Social Platforms", "Monthly Reporting", "Email Support", "Basic Analytics"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$3,499",
    period: "/mo",
    description: "For scaling businesses",
    features: ["Everything in Basic", "Google & Meta Ads", "4 Social Platforms", "Bi-weekly Calls", "Advanced Analytics", "Content Creation"],
    featured: true,
  },
  {
    name: "Premium",
    price: "$6,999",
    period: "/mo",
    description: "For market leaders",
    features: ["Everything in Pro", "Dedicated Strategist", "Full Funnel Marketing", "A/B Testing", "Custom Dashboards", "Priority Support", "Brand Strategy"],
    featured: false,
  },
];

const Pricing = () => {
  const { addItem, items } = useCart();

  const handleBuy = (plan: typeof plans[0]) => {
    const price = parseInt(plan.price.replace(/[$,]/g, ""));
    addItem({ id: plan.name.toLowerCase(), name: plan.name + " Plan", price, description: plan.description });
    toast.success(`${plan.name} Plan added to cart!`);
  };

  return (
  <section id="pricing" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-primary text-sm font-semibold uppercase tracking-widest">Pricing</span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
          Plans That <span className="gradient-text">Scale With You</span>
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className={`rounded-2xl p-6 md:p-8 flex flex-col ${
              plan.featured
                ? "glass-card gradient-border hover-glow relative"
                : "glass-card hover-glow"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h3 className="font-heading text-xl font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
            <div className="flex items-end gap-1 mb-6">
              <span className="font-heading text-4xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-primary shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.featured ? "hero" : "hero-outline"}
              className="w-full"
              onClick={() => handleBuy(plan)}
              disabled={items.some((i) => i.id === plan.name.toLowerCase())}
            >
              {items.some((i) => i.id === plan.name.toLowerCase()) ? (
                <>Added <Check size={16} /></>
              ) : (
                <><ShoppingCart size={16} /> Buy Now</>
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

};

export default Pricing;
