import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen">
    <Navbar />
    <main className="container mx-auto px-4 py-24 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-6">Terms of Service</h1>
      <div className="prose prose-invert prose-sm max-w-none space-y-4 text-muted-foreground">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p>
          By accessing or using the NexaGrowth Digital website and services, you agree to these Terms of Service.
          If you do not agree, please do not use our site.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Services</h2>
        <p>
          NexaGrowth Digital provides digital marketing services including SEO, paid advertising, social media
          management, and brand strategy. Specific deliverables are defined in individual client agreements.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Payments &amp; Subscriptions</h2>
        <p>
          Pricing displayed on this website is indicative. Final pricing, billing terms, and cancellation policies are
          confirmed in writing before service commencement.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, NexaGrowth Digital is not liable for indirect, incidental, or
          consequential damages arising from use of our website or services.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:hello@nexagrowth.com" className="text-primary hover:underline">hello@nexagrowth.com</a>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
