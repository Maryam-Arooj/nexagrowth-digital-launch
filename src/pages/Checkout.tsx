import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Building2, Wallet, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const [payment, setPayment] = useState("card");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Cart
        </Link>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-primary/50 bg-card p-12 text-center max-w-lg mx-auto">
              <CheckCircle2 size={48} className="mx-auto text-primary mb-6" />
              <h2 className="font-heading text-2xl font-bold mb-3">Order Confirmed</h2>
              <p className="text-muted-foreground mb-8">Thank you for choosing NexaGrowth. We'll be in touch within 24 hours.</p>
              <Button asChild><Link to="/">Back to Home</Link></Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-10">Checkout</h1>

              {items.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                  <p className="text-muted-foreground mb-6">No items in cart</p>
                  <Button asChild><Link to="/#pricing">Browse Plans</Link></Button>
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                      <h3 className="font-heading font-semibold">Contact Information</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" placeholder="John Doe" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="john@example.com" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company (optional)</Label>
                        <Input id="company" placeholder="Your Company" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                      <h3 className="font-heading font-semibold">Payment Method</h3>
                      <RadioGroup value={payment} onValueChange={setPayment} className="grid sm:grid-cols-3 gap-3">
                        {[
                          { value: "card", label: "Credit Card", icon: CreditCard },
                          { value: "bank", label: "Bank Transfer", icon: Building2 },
                          { value: "wallet", label: "Digital Wallet", icon: Wallet },
                        ].map((m) => (
                          <Label
                            key={m.value}
                            htmlFor={m.value}
                            className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all border ${
                              payment === m.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value={m.value} id={m.value} />
                            <m.icon size={16} className={payment === m.value ? "text-primary" : "text-muted-foreground"} />
                            <span className="text-sm">{m.label}</span>
                          </Label>
                        ))}
                      </RadioGroup>

                      {payment === "card" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="expiry">Expiry</Label>
                              <Input id="expiry" placeholder="MM/YY" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cvc">CVC</Label>
                              <Input id="cvc" placeholder="123" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <Button size="lg" type="submit" className="w-full">
                      Place Order — ${total.toLocaleString()}/mo
                    </Button>
                  </form>

                  <div className="rounded-xl border border-primary/50 bg-card p-6 h-fit">
                    <h3 className="font-heading font-semibold mb-4">Order Summary</h3>
                    <div className="space-y-2 mb-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span>${item.price.toLocaleString()}/mo</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>${total.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Checkout;
