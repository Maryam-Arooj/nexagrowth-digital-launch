import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Building2, Wallet, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="container mx-auto px-4 py-24">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Cart
        </Link>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-12 text-center max-w-lg mx-auto gradient-border">
              <CheckCircle2 size={64} className="mx-auto text-primary mb-6" />
              <h2 className="font-heading text-3xl font-bold mb-3">Order Confirmed!</h2>
              <p className="text-muted-foreground mb-8">Thank you! We'll be in touch shortly to get you started.</p>
              <Button variant="hero" asChild><Link to="/">Back to Home</Link></Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-heading text-3xl md:text-5xl font-bold mb-10">
                <span className="gradient-text">Checkout</span>
              </h1>

              {items.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <p className="text-muted-foreground mb-6">No items in cart</p>
                  <Button variant="hero" asChild><Link to="/#pricing">Browse Services</Link></Button>
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
                    {/* Contact */}
                    <div className="glass-card rounded-2xl p-6 space-y-4">
                      <h3 className="font-heading text-lg font-semibold">Contact Information</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" placeholder="John Doe" required className="bg-muted/50 border-border" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="john@example.com" required className="bg-muted/50 border-border" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company (optional)</Label>
                        <Input id="company" placeholder="Your Company" className="bg-muted/50 border-border" />
                      </div>
                    </div>

                    {/* Payment */}
                    <div className="glass-card rounded-2xl p-6 space-y-4">
                      <h3 className="font-heading text-lg font-semibold">Payment Method</h3>
                      <RadioGroup value={payment} onValueChange={setPayment} className="grid sm:grid-cols-3 gap-3">
                        {[
                          { value: "card", label: "Credit Card", icon: CreditCard },
                          { value: "bank", label: "Bank Transfer", icon: Building2 },
                          { value: "wallet", label: "Digital Wallet", icon: Wallet },
                        ].map((m) => (
                          <Label
                            key={m.value}
                            htmlFor={m.value}
                            className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border ${
                              payment === m.value ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value={m.value} id={m.value} />
                            <m.icon size={18} className={payment === m.value ? "text-primary" : "text-muted-foreground"} />
                            <span className="text-sm">{m.label}</span>
                          </Label>
                        ))}
                      </RadioGroup>

                      {payment === "card" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input id="cardNumber" placeholder="4242 4242 4242 4242" className="bg-muted/50 border-border" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="expiry">Expiry</Label>
                              <Input id="expiry" placeholder="MM/YY" className="bg-muted/50 border-border" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cvc">CVC</Label>
                              <Input id="cvc" placeholder="123" className="bg-muted/50 border-border" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <Button variant="hero" size="lg" type="submit" className="w-full">
                      Place Order — ${total.toLocaleString()}/mo
                    </Button>
                  </form>

                  {/* Summary */}
                  <div className="glass-card rounded-2xl p-6 h-fit gradient-border">
                    <h3 className="font-heading text-lg font-semibold mb-6">Order Summary</h3>
                    <div className="space-y-3 mb-6">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span>${item.price.toLocaleString()}/mo</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between font-heading font-bold text-lg">
                        <span>Total</span>
                        <span className="gradient-text">${total.toLocaleString()}/mo</span>
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
