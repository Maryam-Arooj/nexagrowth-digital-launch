import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const plans = [
  {
    name: "Basic", price: "$1,499", period: "/mo", description: "For startups ready to grow",
    features: ["SEO Audit & Strategy", "2 Social Platforms", "Monthly Reporting", "Email Support"],
    featured: false,
  },
  {
    name: "Pro", price: "$3,499", period: "/mo", description: "For scaling businesses",
    features: ["Everything in Basic", "Google & Meta Ads", "4 Social Platforms", "Bi-weekly Calls", "Content Creation"],
    featured: true,
  },
  {
    name: "Premium", price: "$6,999", period: "/mo", description: "For market leaders",
    features: ["Everything in Pro", "Dedicated Strategist", "Full Funnel Marketing", "A/B Testing", "Priority Support"],
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
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium mb-2">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Plans that scale with you</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`rounded-2xl p-6 flex flex-col border transition-all duration-300 hover:shadow-lg ${
                plan.featured
                  ? "border-primary glow-purple bg-card relative"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg text-white text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-3xl font-bold gradient-text">{plan.price}</span>
                <span className="text-muted-foreground text-sm mb-0.5">{plan.period}</span>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check size={14} className="text-primary shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.featured ? "default" : "outline"}
                className={plan.featured ? "gradient-bg border-0 text-white hover:opacity-90" : "border-primary/30 hover:bg-primary/5"}
                onClick={() => handleBuy(plan)}
                disabled={items.some((i) => i.id === plan.name.toLowerCase())}
              >
                {items.some((i) => i.id === plan.name.toLowerCase()) ? (
                  <>Added <Check size={14} /></>
                ) : (
                  <><ShoppingCart size={14} /> Buy Now</>
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
