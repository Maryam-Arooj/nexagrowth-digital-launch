import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Services", href: "/#services" },
  { label: "About", href: "/#about" },
  { label: "Work", href: "/#work" },
  { label: "Contact", href: "/#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/" && href.startsWith("/#")) {
      window.location.href = href;
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 h-16">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          NexaGrowth<span className="gradient-text">.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/cart" className="relative text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <Button size="sm" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
            <a href="/#contact">Get Free Audit</a>
          </Button>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link to="/cart" className="relative text-foreground">
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <button className="text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="flex flex-col px-4 py-4 gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-sm text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-muted transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Button size="sm" className="mt-2 gradient-bg border-0 text-white" asChild>
                <a href="/#contact" onClick={() => setMobileOpen(false)}>Get Free Audit</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
