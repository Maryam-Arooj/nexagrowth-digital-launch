import { useState, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Section ids on the home page. Hash anchors only exist on "/", so links are
// modelled as ids and resolved by the click handler rather than as raw hrefs.
const navLinks = [
  { label: "About", id: "about" },
  { label: "Services", id: "services" },
  { label: "Work", id: "work" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
  { label: "Contact", id: "contact" },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** True for clicks the browser should handle itself (new tab, new window, etc.). */
function isModifiedClick(e: ReactMouseEvent) {
  return e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Arriving at "/" from another route with a pending scroll target: the router
  // carries the id in location.state, which survives the navigation and is read by
  // whichever Navbar instance mounts on the home page. Two rAFs let the lazy-loaded
  // Index page mount and lay out before the target's position is measured.
  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (location.pathname !== "/" || !target) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        scrollToSection(target);
        // Clear the state so browser back/forward doesn't re-trigger the scroll.
        navigate("/", { replace: true, state: null });
      }),
    );
    return () => cancelAnimationFrame(raf);
  }, [location, navigate]);

  /**
   * Handles a section link. The anchor keeps a real href so middle-click,
   * ctrl/cmd-click and "copy link address" still work; only an unmodified left
   * click is intercepted. These were previously plain anchors that triggered a full
   * browser navigation (and, off the home page, an explicit `window.location.href`
   * assignment) — reloading the whole SPA and wiping the in-memory cart.
   */
  const handleNavClick = (e: ReactMouseEvent, id: string) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    setMobileOpen(false);

    if (location.pathname === "/") {
      scrollToSection(id);
      // Keep the address bar in step without performing a navigation.
      window.history.replaceState(null, "", `/#${id}`);
    } else {
      navigate("/", { state: { scrollTo: id } });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 h-16">
        <Link to="/" className="font-heading text-lg font-bold tracking-tight">
          NexaGrowth<span className="text-primary"> Digital</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={(e) => handleNavClick(e, link.id)}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/cart" className="relative text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart size={17} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-xs" asChild>
            <a href="/#contact" onClick={(e) => handleNavClick(e, "contact")}>Get Free Audit</a>
          </Button>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <Link to="/cart" className="relative text-foreground">
            <ShoppingCart size={17} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="text-foreground"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
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
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="flex flex-col px-4 py-4 gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`/#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className="text-sm text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Button size="sm" className="mt-3 bg-gradient-to-r from-primary to-accent" asChild>
                <a href="/#contact" onClick={(e) => handleNavClick(e, "contact")}>Get Free Audit</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
