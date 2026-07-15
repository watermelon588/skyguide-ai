import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";

/**
 * VideoBackground — full-bleed hero backdrop.
 *
 * Renders a looping muted <video> when `src` is provided; otherwise falls back
 * to the `poster` image so the hero looks finished before the user supplies
 * footage. The footage is softly blurred and sits under a dark gradient wash so
 * it reads as atmosphere behind the foreground text (not a competing focal
 * point), and the layer scales + fades on scroll for a "scroll-through" feel.
 *
 * Drop a file at e.g. /public/hero.mp4 and pass src="/hero.mp4" to go live.
 * `blur` (Tailwind blur class) and `overlay` (gradient) tune how far it recedes.
 */
export default function VideoBackground({
  src,
  poster,
  overlay = "bg-gradient-to-b from-black/10 via-black/20 to-black",
  // Size of the video frame within the layer. Default full-bleed; pass a
  // smaller box (e.g. "h-[70vh] w-[90%] max-w-6xl") to inset it with black
  // around it instead of covering the whole screen.
  size = "h-full w-full",
  className = "",
  scrollScope,
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const trigger = scrollScope?.current || ref.current;
      gsap.to(ref.current, {
        scale: 1.18,
        yPercent: 12,
        opacity: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: ref, dependencies: [scrollScope] },
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 flex items-center justify-center ${className}`}
    >
      {/* The framed video box — sized by `size`, clips the parallax scale. */}
      <div className={`relative overflow-hidden ${size}`}>
        <div ref={ref} className="absolute inset-0 will-change-transform">
          {src ? (
            <video
              className={`h-full w-full scale-105 object-cover ${blur}`}
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : poster ? (
            <img
              src={poster}
              alt=""
              className={`h-full w-full scale-105 object-cover ${blur}`}
            />
          ) : (
            <div className="h-full w-full bg-black" />
          )}
        </div>
        <div className={`absolute inset-0 ${overlay}`} />
      </div>
    </div>
  );
}
