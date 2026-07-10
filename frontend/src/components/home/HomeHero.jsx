import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { useAuth } from "../../context/AuthContext";

/**
 * Landing hero — the first screen of SkyGuide AI.
 *
 * GSAP choreographs the entrance: headline lines rise out of overflow masks,
 * then the copy, CTAs and proof chips settle in. The starfield behind (page
 * level) supplies the cursor-parallax interaction; buttons keep to the
 * design-system ±3% scale language.
 */

const LINES = ["Discover the universe,", "one night at a time."];

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
      tl.from(".hero-line", {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.12,
        ease: "expo.out",
        delay: 0.15,
      }).from(
        "[data-hero]",
        { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 },
        "-=0.55",
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
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center sm:px-12"
    >
      <p
        data-hero
        className="mb-6 rounded-xl border border-[#FF8C1A]/30 bg-[#FF8C1A]/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]"
      >
        Your intelligent astronomy copilot
      </p>

      <h1
        aria-label={LINES.join(" ")}
        className="max-w-5xl text-[clamp(2.6rem,7vw,5.5rem)] font-bold leading-[1.04] tracking-tight text-white"
      >
        {LINES.map((line) => (
          <span key={line} className="block overflow-hidden py-1">
            <span aria-hidden="true" className="hero-line block">
              {line.includes("universe") ? (
                <>
                  Discover the <span className="text-[#FF8C1A]">universe</span>,
                </>
              ) : (
                line
              )}
            </span>
          </span>
        ))}
      </h1>

      <p
        data-hero
        className="mt-7 max-w-2xl text-base leading-relaxed text-[#AAB4C5] sm:text-lg"
      >
        SkyGuide AI reads your location, your telescope and tonight's
        atmosphere, then ranks every object above your horizon — and guides
        your telescope onto the best of them in real time.
      </p>

      <div data-hero className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(isAuthenticated ? "/tonight" : "/login")}
          className="rounded-xl bg-[#FF8C1A] px-8 py-3.5 font-semibold text-[#090B10] shadow-2xl transition-colors duration-300 hover:bg-[#FF6B00]"
        >
          {isAuthenticated ? "See tonight's sky" : "Start observing"}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            document
              .getElementById("features")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 font-semibold text-white backdrop-blur-3xl transition-colors duration-300 hover:bg-white/10"
        >
          Explore the platform
        </motion.button>
      </div>

      <div
        data-hero
        className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6B7280]"
      >
        {chips.map((chip, i) => (
          <span key={chip} className="flex items-center gap-6">
            {i > 0 && <span className="h-1 w-1 rounded-full bg-[#FF8C1A]/60" />}
            {chip}
          </span>
        ))}
      </div>

      <div
        data-hero
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[#6B7280]"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-[#FF8C1A] to-transparent" />
      </div>
    </header>
  );
}
