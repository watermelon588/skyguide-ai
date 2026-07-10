import { useRef } from "react";

import Starfield from "../components/tonight/Starfield";
import HomeNav from "../components/home/HomeNav";
import HomeHero from "../components/home/HomeHero";
import FeatureGrid from "../components/home/FeatureGrid";
import HowItWorks from "../components/home/HowItWorks";
import CtaFooter from "../components/home/CtaFooter";
import Footer from "../components/Footer";
import { useReveal } from "../components/tonight/fx/useReveal";

/**
 * Landing page — same night-sky material as /tonight (starfield canvas,
 * glass, orange accent) so the marketing surface and the instrument feel
 * like one product. GSAP owns the hero entrance and scroll reveals; Framer
 * Motion owns button/nav micro-interactions. Static content is always ready,
 * so reveal choreography registers immediately.
 */
export default function HomePage() {
  const scope = useRef(null);
  useReveal(scope, true);

  return (
    <div ref={scope} className="relative min-h-screen bg-[#05070A] text-white">
      <Starfield />
      <HomeNav />
      <HomeHero />
      <main className="relative z-10 flex flex-col gap-28 pt-8">
        <FeatureGrid />
        <HowItWorks />
        <CtaFooter />
      </main>
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}
