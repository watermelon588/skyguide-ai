import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import VideoBackground from "../fx/VideoBackground";
import MagneticButton from "../fx/MagneticButton";
import heroPoster from "../../assets/bg/2.jpg";

/**
 * Landing hero — the cinematic first screen of SkyGuide AI (redesign v2.0).
 *
 * A full-bleed video background (poster fallback until footage is dropped at
 * /public/hero.mp4) scales + fades on scroll for a "scroll-through" feel. GSAP
 * choreographs the entrance: oversized headline lines rise out of overflow
 * masks, then copy, CTAs and proof settle in. Magnetic buttons keep the ±3%
 * pointer language. Routing/auth branch is unchanged from the prior hero.
 *
 * To go live with video: drop a file at frontend/public/hero.mp4 and pass
 * src="/hero.mp4" to <VideoBackground/> below.
 */

const LINES = [
  ["Discover", "the", "universe,"],
  ["one", "night", "at", "a", "time."],
];

export default function HomeHero() {
  const scope = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (reduced) {
        tl.from("[data-hero]", { opacity: 0, duration: 0.3, stagger: 0.05 });
        return;
      }
      tl.from(".hero-word", {
        yPercent: 120,
        duration: 1.1,
        stagger: 0.06,
        ease: "expo.out",
        delay: 0.15,
      }).from(
        "[data-hero]",
        { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 },
        "-=0.6",
      );
    },
    { scope },
  );

  const chips = [
    "110+ deep-sky objects",
    "Live visibility scoring",
    "Phone-guided alignment",
  ];

  return (
    <header
      ref={scope}
      className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center sm:px-12"
    >
      {/* Full-bleed video backdrop with scroll-through parallax (poster shown
          while the mp4 loads / if it fails). */}
      <VideoBackground
        src="/hero2.mp4"
        poster={heroPoster}
        scrollScope={scope}
        size="h-[88vh] w-[92%] max-w-6xl"
      />

      <p
        data-hero
        className="relative mb-7 border border-accent/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-accent"
      >
        Your intelligent astronomy copilot
      </p>

      <h1
        aria-label={LINES.flat().join(" ")}
        className="relative max-w-4xl text-[clamp(2rem,5.5vw,4rem)] font-black uppercase leading-[0.95] tracking-tight text-ink"
      >
        {LINES.map((line, li) => (
          <span key={li} className="block">
            {line.map((word, wi) => (
              <span key={wi} className="inline-block overflow-hidden py-1 align-bottom">
                <span
                  aria-hidden="true"
                  className={`hero-word inline-block ${
                    word === "universe," ? "text-accent" : ""
                  }`}
                >
                  {word}
                  {wi < line.length - 1 ? " " : ""}
                </span>
              </span>
            ))}
          </span>
        ))}
      </h1>

      <p
        data-hero
        className="relative mt-8 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg"
      >
        SkyGuide AI reads your location, your telescope and tonight's
        atmosphere, then ranks every object above your horizon — and guides your
        telescope onto the best of them in real time.
      </p>

      <div
        data-hero
        className="relative mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <MagneticButton
          onClick={() => navigate(isAuthenticated ? "/tonight" : "/login")}
          className="inline-flex items-center gap-2 bg-accent px-8 py-4 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi"
        >
          {isAuthenticated ? "See tonight's sky" : "Start observing"}
          <ArrowRight size={18} />
        </MagneticButton>
        <MagneticButton
          onClick={() =>
            document
              .getElementById("features")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="inline-flex items-center gap-2 border border-line bg-surface-2 px-8 py-4 font-semibold text-ink transition-colors duration-300 hover:bg-surface-3"
        >
          Explore the platform
        </MagneticButton>
      </div>

      <div
        data-hero
        className="relative mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs uppercase tracking-[0.15em] text-ink-3"
      >
        {chips.map((chip, i) => (
          <span key={chip} className="flex items-center gap-8">
            {i > 0 && <span className="h-1 w-1 bg-accent" />}
            {chip}
          </span>
        ))}
      </div>
    </header>
  );
}
