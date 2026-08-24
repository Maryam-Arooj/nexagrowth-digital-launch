import { Linkedin, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/nexagrowth", label: "Follow us on Twitter" },
  { icon: Linkedin, href: "https://linkedin.com/company/nexagrowth", label: "Connect on LinkedIn" },
  { icon: Instagram, href: "https://instagram.com/nexagrowth", label: "Follow on Instagram" },
  { icon: Youtube, href: "https://youtube.com/@nexagrowth", label: "Watch on YouTube" },
];

const footerLinks = {
  Services: [
    { label: "SEO Optimization", href: "/#services" },
    { label: "Paid Advertising", href: "/#services" },
    { label: "Social Media", href: "/#services" },
    { label: "Brand Strategy", href: "/#services" },
  ],
  Company: [
    { label: "About Us", href: "/#about" },
    { label: "Case Studies", href: "/#work" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const Footer = () => (
  <footer className="border-t border-border bg-card/30">
    <div className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
        {/* Brand column */}
        <div className="lg:col-span-2">
          <Link to="/" className="font-heading text-xl font-bold tracking-tight inline-block mb-4">
            NexaGrowth<span className="text-primary"> Digital</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
            Performance-focused digital marketing for B2B and D2C brands that want predictable,
            profitable growth.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a
              href="mailto:hello@nexagrowth.com"
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Mail size={14} />
              hello@nexagrowth.com
            </a>
            <a
              href="tel:+15552345678"
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Phone size={14} />
              +1 (555) 234-5678
            </a>
            <p className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>123 Market Street, Suite 400<br />San Francisco, CA 94105</span>
            </p>
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(footerLinks).map(([category, links]) => (
          <div key={category}>
            <h3 className="font-heading text-sm font-semibold mb-4 text-foreground">{category}</h3>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} NexaGrowth Digital. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              <Icon size={15} />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
