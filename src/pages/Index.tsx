import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import About from "@/components/About";
import Services from "@/components/Services";
import Process from "@/components/Process";
import CaseStudies from "@/components/CaseStudies";
import WhyChooseUs from "@/components/WhyChooseUs";
import Team from "@/components/Team";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import CTASection from "@/components/CTASection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MarketingStrategist from "@/components/MarketingStrategist";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <Hero />
    <TrustBar />
    <About />
    <Services />
    <Process />
    <CaseStudies />
    <WhyChooseUs />
    <Team />
    <Pricing />
    <Testimonials />
    <FAQ />
    <CTASection />
    <Contact />
    <Footer />
    <MarketingStrategist />
  </div>
);

export default Index;
