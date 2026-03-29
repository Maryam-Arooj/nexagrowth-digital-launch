import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Cart = () => {
  const { items, removeItem, total, itemCount } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="font-heading text-3xl md:text-5xl font-bold mb-2">
          Your <span className="gradient-text">Cart</span>
        </h1>
        <p className="text-muted-foreground mb-10">{itemCount} service{itemCount !== 1 ? "s" : ""} selected</p>

        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">Your cart is empty</p>
            <Button variant="hero" asChild><Link to="/#pricing">Browse Services</Link></Button>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-6 flex items-center justify-between hover-glow"
                >
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-heading text-xl font-bold gradient-text">${item.price.toLocaleString()}<span className="text-sm text-muted-foreground">/mo</span></span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

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
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between font-heading font-bold text-lg">
                  <span>Total</span>
                  <span className="gradient-text">${total.toLocaleString()}/mo</span>
                </div>
              </div>
              <Button variant="hero" className="w-full" asChild>
                <Link to="/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
