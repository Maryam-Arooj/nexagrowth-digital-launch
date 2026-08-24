import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen">
    <Navbar />
    <main className="container mx-auto px-4 py-24 max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-6">Privacy Policy</h1>
      <div className="prose prose-invert prose-sm max-w-none space-y-4 text-muted-foreground">
        <p>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        <p>
          NexaGrowth Digital (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This policy explains how we collect,
          use, and protect information when you visit our website or submit a contact form.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>
          We may collect your name, email address, company website, and any message you submit through our contact or
          checkout forms. We also collect standard analytics data such as pages visited and browser type.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">How We Use Information</h2>
        <p>
          We use submitted information to respond to inquiries, provide marketing audits, process service requests, and
          improve our website experience. We do not sell your personal information to third parties.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Data Security</h2>
        <p>
          We implement reasonable technical and organizational measures to protect your data. No method of transmission
          over the internet is 100% secure.
        </p>
        <h2 className="font-heading text-lg font-semibold text-foreground">Contact</h2>
        <p>
          For privacy-related questions, contact us at{" "}
          <a href="mailto:hello@nexagrowth.com" className="text-primary hover:underline">hello@nexagrowth.com</a>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
