import { Linkedin, Twitter, Instagram, Youtube } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="container mx-auto px-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <div>
          <span className="font-heading text-lg font-bold gradient-text">NexaGrowth</span>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Data-driven digital marketing that scales brands and delivers measurable ROI.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-3">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>SEO Optimization</li>
            <li>Paid Advertising</li>
            <li>Social Media</li>
            <li>Brand Strategy</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Careers</li>
            <li>Blog</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-sm mb-3">Follow Us</h4>
          <div className="flex gap-3">
            {[Linkedin, Twitter, Instagram, Youtube].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Icon size={16} className="text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NexaGrowth Digital. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
