import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import HorizontalFeatures from "@/components/landing/HorizontalFeatures";
import Problem from "@/components/landing/Problem";
import LockedInShowcase from "@/components/landing/LockedInShowcase";
import ModesCarousel from "@/components/landing/ModesCarousel";
import Notifications from "@/components/landing/Notifications";
import Badges from "@/components/landing/Badges";
import TheGates from "@/components/landing/TheGates";
import Stats from "@/components/landing/Stats";
import Comparison from "@/components/landing/Comparison";
import Pricing from "@/components/landing/Pricing";
import Roadmap from "@/components/landing/Roadmap";
import BetaBanner from "@/components/landing/BetaBanner";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div style={{ fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif", color: "#fff", background: "#060606" }}>
      <Navbar />
      <Hero />
      <HowItWorks />
      <HorizontalFeatures />
      <Problem />
      <LockedInShowcase />
      <ModesCarousel />
      <Notifications />
      <Badges />
      <TheGates />
      <Stats />
      <Comparison />
      <Pricing />
      <Roadmap />
      <BetaBanner />
      <Footer />
    </div>
  );
}
