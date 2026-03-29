import { Linkedin, Twitter, Instagram } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border py-10">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <span className="text-sm font-semibold text-foreground">
        NexaGrowth<span className="text-primary">.</span>
      </span>
      <div className="flex gap-4">
        {[Linkedin, Twitter, Instagram].map((Icon, i) => (
          <a key={i} href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon size={16} />
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} NexaGrowth Digital
      </p>
    </div>
  </footer>
);

export default Footer;
