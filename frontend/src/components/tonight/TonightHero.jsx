import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Full-viewport cinematic opener for /tonight.
 *
 * GSAP owns the entrance: the title's characters rise out of an overflow
 * mask (split manually — no paid SplitText), then the meta rows settle in.
 * A live local clock ticks in the corner chip. Everything below the fold is
 * revealed by useReveal — this component only choreographs the first screen.
 */

const TITLE = "Tonight";

function LiveClock({ timezone }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timezone || undefined,
  });
  return <span className="tabular-nums">{time}</span>;
}

export default function TonightHero({
  latitude,
  longitude,
  timezone,
  visibleCount,
  moon,
  conditions,
}) {
  const scope = useRef(null);

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
      tl.from(".hero-char", {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.045,
        ease: "expo.out",
      })
        .from(
          "[data-hero]",
          { y: 24, opacity: 0, duration: 0.8, stagger: 0.09 },
          "-=0.6",
        )
        .from(
          "[data-hero-cue]",
          { opacity: 0, duration: 0.6 },
          "-=0.2",
        );
    },
    { scope },
  );

  const dateLine = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const summaryBits = [
    visibleCount != null && `${visibleCount} objects above your horizon`,
    moon && `${moon.phase} · ${moon.illumination}% lit`,
    conditions?.observing_quality && `Sky: ${conditions.observing_quality}`,
  ].filter(Boolean);

  return (
    <header
      ref={scope}
      className="relative flex min-h-screen flex-col justify-center px-6 sm:px-12 lg:px-20"
    >
      <p
        data-hero
        className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-ink-2"
      >
        SkyGuide Atlas · Live Sky Report
      </p>

      <h1
        aria-label={TITLE}
        className="select-none text-[clamp(3rem,9vw,7rem)] font-bold leading-[0.95] tracking-tight text-ink"
      >
        {/* Each mask must out-size the glyph INK, not just the em box — with
            the h1's 0.95 leading inherited, overflow-hidden cut the "g"
            descender by ~18px at hero size (Satoshi's font box is a tall
            1.25em). leading-[1.15] plus a margin-compensated bottom pad gives
            the ink room inside the clip without changing the layout height
            or the rise-from-mask animation. */}
        {TITLE.split("").map((char, i) => (
          <span
            key={i}
            className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom leading-[1.15]"
          >
            <span aria-hidden="true" className="hero-char inline-block">
              {char}
            </span>
          </span>
        ))}
        <span className="hero-char ml-2 inline-block align-super text-[0.18em] font-medium text-accent">
          LIVE
        </span>
      </h1>

      <p data-hero className="mt-6 max-w-xl text-lg text-ink-2">
        {dateLine}
        {summaryBits.length > 0 && (
          <>
            <br />
            <span className="text-ink">{summaryBits.join("  ·  ")}</span>
          </>
        )}
      </p>

      <div data-hero className="mt-10 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-xl border border-line bg-surface-2 px-4 py-2 text-ink-2">
          {latitude != null && longitude != null
            ? `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`
            : "Location unknown"}
        </span>
        <span className="rounded-xl border border-line bg-surface-2 px-4 py-2 text-ink-2">
          {timezone || "UTC"} · <LiveClock timezone={timezone} />
        </span>
        <span className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 font-medium text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Computed for this instant
        </span>
      </div>

      <div
        data-hero-cue
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-ink-3"
      >
        <span className="text-[11px] uppercase tracking-[0.3em]">Explore</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-accent to-transparent" />
      </div>
    </header>
  );
}
