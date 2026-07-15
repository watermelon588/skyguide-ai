import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";

/**
 * AngularText — headline reveal with an "angular" entrance. As the element
 * scrolls into view, each word swings up from below with a 3D rotation + skew,
 * settling flat with a staggered ease (GSAP ScrollTrigger).
 *
 * Presentational only. `text` is the phrase; screen readers get it via
 * aria-label. Collapses to a plain fade under reduced motion.
 */
export default function AngularText({
  text,
  as: Tag = "h2",
  className = "",
  wordClassName = "",
  stagger = 0.09,
  start = "top 82%",
}) {
  const ref = useRef(null);
  const words = String(text).split(" ");

  useGSAP(
    () => {
      const targets = ref.current?.querySelectorAll("[data-word]");
      if (!targets?.length) return;

      if (prefersReducedMotion()) {
        gsap.from(targets, {
          opacity: 0,
          duration: 0.4,
          stagger: 0.03,
          scrollTrigger: { trigger: ref.current, start },
        });
        return;
      }

      gsap.set(ref.current, { perspective: 800 });
      gsap.from(targets, {
        yPercent: 130,
        opacity: 0,
        rotationX: -75,
        skewY: 6,
        transformOrigin: "50% 100% -40px",
        duration: 1,
        ease: "power4.out",
        stagger,
        scrollTrigger: { trigger: ref.current, start },
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} aria-label={text} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block overflow-hidden align-bottom"
        >
          <span data-word className={`inline-block ${wordClassName}`}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
