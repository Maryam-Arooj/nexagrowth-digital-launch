import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import CaseStudies from "@/components/CaseStudies";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import MarketingStrategist from "@/components/MarketingStrategist";

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <Hero />
    <Services />
    <CaseStudies />
    <WhyChooseUs />
    <Testimonials />
    <Contact />
    <Footer />
    <MarketingStrategist />
  </div>
);

export default Index;
