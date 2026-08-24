import { motion } from "framer-motion";

// Brand logos represented as text-based SVG wordmarks for authenticity
const brands = [
  { name: "TechNova", tagline: "SaaS" },
  { name: "UrbanStyle", tagline: "E-Commerce" },
  { name: "FreshBite", tagline: "D2C" },
  { name: "Meridian", tagline: "FinTech" },
  { name: "Cloudify", tagline: "B2B SaaS" },
  { name: "PeakBrands", tagline: "Retail" },
];

const TrustBar = () => (
  <section className="py-12 border-y border-border bg-card/30">
    <div className="container mx-auto px-4">
      <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-2 font-medium">
        Trusted by 150+ companies across 15 verticals
      </p>
      <p className="text-center text-[10px] text-amber-500/80 mb-6">Sample Data — illustrative logos, not verified clients</p>
      <div className="relative overflow-hidden">
        <motion.div
          className="flex items-center gap-14 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          {[...brands, ...brands].map((brand, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="font-heading text-lg font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none">
                {brand.name}
              </span>
              <span className="text-[10px] text-muted-foreground/30 uppercase tracking-widest">
                {brand.tagline}
              </span>
            </div>
          ))}
        </motion.div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card/80 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-card/80 to-transparent pointer-events-none" />
      </div>
    </div>
  </section>
);

export default TrustBar;
