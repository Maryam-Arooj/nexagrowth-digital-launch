import { Linkedin, Twitter, Instagram, Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <span className="font-heading text-base font-bold text-foreground">
            NexaGrowth<span className="text-primary"> Digital</span>
          </span>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Performance marketing for ambitious brands.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>SEO</li>
            <li>Paid Advertising</li>
            <li>Social Media</li>
            <li>Branding</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
            <li><a href="#work" className="hover:text-foreground transition-colors">Case Studies</a></li>
            <li><a href="#contact" className="hover:text-foreground transition-colors">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Get in Touch</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-primary" />
              <span>hello@nexagrowth.com</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span>San Francisco, CA</span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {[Linkedin, Twitter, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border mt-10 pt-6">
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} NexaGrowth Digital. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
