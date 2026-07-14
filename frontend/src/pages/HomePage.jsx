import { useRef, useState } from "react";

import Starfield from "../components/tonight/Starfield";
import HomeNav from "../components/home/HomeNav";
import HomeHero from "../components/home/HomeHero";
import LiveSkyTeaser from "../components/home/LiveSkyTeaser";
import FeatureGrid from "../components/home/FeatureGrid";
import HowItWorks from "../components/home/HowItWorks";
import CtaFooter from "../components/home/CtaFooter";
import Footer from "../components/Footer";
import ScrollMarquee from "../components/fx/ScrollMarquee";
import { useReveal } from "../components/tonight/fx/useReveal";

/**
 * Landing page — redesign v2.0 "Bento / Electric Blue".
 *
 * Pure-black canvas, flat surfaces, electric-blue accent, Satoshi type. A
 * cinematic video hero with scroll-through, a collapsible interactive navbar,
 * scrolling-text marquees, and bento feature sections. GSAP owns the hero
 * entrance + scroll reveals (via the robust data-reveal choreography); Framer
 * Motion owns nav collapse + magnetic buttons. Data flow is unchanged.
 */
export default function HomePage() {
  const scope = useRef(null);
  const [ready, setReady] = useState(false);
  useReveal(scope, ready);

  const MARQUEE = [
    "Real-time visibility scoring",
    "Phone-guided telescope alignment",
    "Lunar engine",
    "Atmosphere intelligence",
    "Deep-sky catalog",
    "AI copilot",
  ];

  return (
    <div ref={scope} className="relative min-h-screen bg-black text-ink">
      <Starfield />
      <HomeNav />
      <HomeHero />

      {/* Scroll-driven text band — vertical scroll pushes the rows sideways
          (and reverses on scroll-up); the two rows run opposite directions. */}
      <div className="relative z-10 flex flex-col gap-3 border-y border-line bg-surface-1 py-6 text-sm font-semibold uppercase tracking-[0.2em] text-ink-2">
        <ScrollMarquee items={MARQUEE} direction={-1} baseSpeed={35} />
        <ScrollMarquee
          items={MARQUEE}
          direction={1}
          baseSpeed={35}
          className="text-ink-3"
        />
      </div>

      <main className="relative z-10 flex flex-col gap-28 pt-24">
        <LiveSkyTeaser onReady={() => setReady(true)} />
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
