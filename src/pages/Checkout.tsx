import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, Building2, Wallet, Loader2 } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const [payment, setPayment] = useState("card");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");


  useEffect(() => {
    if (searchParams.get("success") === "true") {
      clearCart();
      navigate("/thank-you", { replace: true });
    }
  }, [searchParams, clearCart, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }

    setLoading(true);

    try {
      // One request creates the order and all of its line items in a single
      // transaction. The Supabase flow needed two round trips, and the second
      // could leave an order with no items if it failed.
      await apiPost("/api/orders", {
        customer_name: name,
        customer_email: email,
        company: company || null,
        payment_method: payment,
        total_amount: total,
        status: "pending",
        items: items.map((item) => ({
          plan_name: item.name,
          price: item.price,
        })),
      });

      clearCart();
      navigate("/thank-you");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Cart
        </Link>

        <AnimatePresence mode="wait">
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
                        <Input 
                          id="name" 
                          placeholder="John Doe" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="john@example.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company (optional)</Label>
                      <Input 
                        id="company" 
                        placeholder="Your Company" 
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
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
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2 text-sm text-muted-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary animate-pulse" />
                        <span>Your order will be recorded and our team will contact you with payment details.</span>
                      </motion.div>
                    )}
                    {payment === "bank" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Bank Transfer Details</p>
                        <p>Bank: Chase Bank · Account: 1234-5678-9012 · Routing: 021000021</p>
                        <p className="mt-1">Please include your email as the payment reference.</p>
                      </motion.div>
                    )}
                    {payment === "wallet" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-2 text-sm text-muted-foreground">
                        <p>We accept PayPal, Apple Pay, and Google Pay. Instructions will be sent via email after order placement.</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Trust signals */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      256-bit SSL Encryption
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      PCI-DSS Compliant
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      30-day money-back guarantee
                    </span>
                  </div>

                  <Button size="lg" type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      `Place Order — $${total.toLocaleString()}/mo`
                    )}
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
                    <p className="text-xs text-muted-foreground mt-1">Billed monthly. Cancel anytime.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Checkout;
