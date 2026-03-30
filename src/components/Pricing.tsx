import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const plans = [
  {
    name: "Starter",
    price: "$1,499",
    period: "/mo",
    description: "For startups building their digital presence",
    features: ["SEO audit & strategy", "2 social platforms", "Monthly performance report", "Email support"],
    featured: false,
  },
  {
    name: "Growth",
    price: "$3,499",
    period: "/mo",
    description: "For scaling businesses ready to accelerate",
    features: ["Everything in Starter", "Google & Meta Ads management", "4 social platforms", "Bi-weekly strategy calls", "Content creation"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$6,999",
    period: "/mo",
    description: "For market leaders who need a full-service partner",
    features: ["Everything in Growth", "Dedicated strategist", "Full-funnel campaign management", "A/B testing & CRO", "Priority support & Slack channel"],
    featured: false,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const Pricing = () => {
  const { addItem, items } = useCart();

  const handleBuy = (plan: (typeof plans)[0]) => {
    const price = parseInt(plan.price.replace(/[$,]/g, ""));
    addItem({ id: plan.name.toLowerCase(), name: plan.name + " Plan", price, description: plan.description });
    toast.success(`${plan.name} Plan added to cart`);
  };

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center max-w-xl mx-auto mb-14">
          <p className="text-primary text-sm font-semibold mb-2 tracking-wide uppercase">Pricing</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Transparent plans, no surprises
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const inCart = items.some((item) => item.id === plan.name.toLowerCase());
            return (
              <motion.div
                key={plan.name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`rounded-xl p-6 flex flex-col border transition-all duration-300 hover:shadow-md ${
                  plan.featured
                    ? "border-primary bg-card shadow-sm relative"
                    : "border-border bg-card"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="font-heading text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm mb-0.5">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.featured ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleBuy(plan)}
                  disabled={inCart}
                >
                  {inCart ? (
                    <>Added <Check size={14} /></>
                  ) : (
                    <><ShoppingCart size={14} /> Buy Now</>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
