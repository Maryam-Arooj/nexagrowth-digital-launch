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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Your Cart</h1>
        <p className="text-muted-foreground mb-10">{itemCount} service{itemCount !== 1 ? "s" : ""} selected</p>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <ShoppingBag size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">Your cart is empty</p>
            <Button asChild><Link to="/#pricing">Browse Services</Link></Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">${item.price.toLocaleString()}<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rounded-2xl border border-primary bg-card p-6 h-fit">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>${item.price.toLocaleString()}/mo</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 mb-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toLocaleString()}/mo</span>
                </div>
              </div>
              <Button className="w-full" asChild>
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
