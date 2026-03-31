import { Linkedin, Twitter, Instagram } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="font-heading text-lg font-bold">
            NexaGrowth<span className="text-primary"> Digital</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">hello@nexagrowth.com · +1 (555) 234-5678</p>
        </div>
        <div className="flex items-center gap-4">
          {[Twitter, Linkedin, Instagram].map((Icon, i) => (
            <a key={i} href="#" className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              <Icon size={16} />
            </a>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8">
        © {new Date().getFullYear()} NexaGrowth Digital. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
